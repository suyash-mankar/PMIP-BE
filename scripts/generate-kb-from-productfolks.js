/**
 * Generate KB summaries and insights from Product Folks case study answers
 * This creates structured knowledge documents from real-world case studies
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const { kbInsert } = require('../src/utils/vector');

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateKBFromProductFolks() {
  console.log('🧠 Generating KB summaries from Product Folks case studies...\n');

  try {
    // Get all exemplars from Product Folks
    const exemplars = await prisma.exemplarAnswer.findMany({
      where: {
        source: 'theproductfolks',
      },
      include: {
        question: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📚 Found ${exemplars.length} Product Folks exemplars\n`);

    let summariesGenerated = 0;
    let errors = 0;

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < exemplars.length; i += batchSize) {
      const batch = exemplars.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(exemplars.length / batchSize)}`);

      for (const exemplar of batch) {
        try {
          console.log(`\n  Processing: ${exemplar.title.substring(0, 60)}...`);

          // Check if summary already exists
          const existing = await prisma.knowledgeDoc.findFirst({
            where: {
              source: 'theproductfolks',
              metadata: {
                path: ['exemplar_id'],
                equals: exemplar.id.toString(),
              },
            },
          });

          if (existing) {
            console.log(`    ⏭️  Summary already exists, skipping...`);
            continue;
          }

          // Generate summary using OpenAI
          const summary = await generateSummary(exemplar);

          if (!summary) {
            console.log(`    ⚠️  Could not generate summary, skipping...`);
            errors++;
            continue;
          }

          // Store in KB
          const kbId = await kbInsert({
            source: 'theproductfolks',
            title: `Case Study Insights: ${exemplar.question.category} - ${exemplar.question.text.substring(0, 80)}`,
            content: summary,
            metadata: {
              category: exemplar.question.category,
              doc_type: 'case_study_insights',
              tags: ['theproductfolks', 'case_study', 'real_world', exemplar.question.category.toLowerCase()],
              exemplar_id: exemplar.id.toString(),
              question_id: exemplar.questionId.toString(),
              source_url: exemplar.sourceUrl || null,
              curation_score: 9, // High quality real-world content
            },
          });

          summariesGenerated++;
          console.log(`    ✅ Summary generated and stored (KB ID: ${kbId})`);

          // Rate limiting
          await delay(2000);
        } catch (err) {
          console.error(`    ❌ Error processing exemplar: ${err.message}`);
          errors++;
          await delay(1000);
        }
      }

      // Longer delay between batches
      if (i + batchSize < exemplars.length) {
        console.log('\n    ⏸️  Waiting before next batch...');
        await delay(5000);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 KB generation completed!');
    console.log(`📝 Summaries generated: ${summariesGenerated}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateSummary(exemplar) {
  try {
    const prompt = `You are analyzing a real-world product management case study answer. Extract key insights, frameworks used, and best practices demonstrated.

Case Study Question: ${exemplar.question.text}
Category: ${exemplar.question.category}
Answer: ${exemplar.content.substring(0, 4000)}${exemplar.content.length > 4000 ? '...' : ''}

Generate a structured summary document with:
1. **Key Insights**: Main takeaways from this answer
2. **Frameworks Used**: Which PM frameworks/approaches were demonstrated
3. **Best Practices**: What makes this answer effective
4. **Key Metrics/Concepts**: Important metrics or concepts mentioned
5. **Application**: How to apply these learnings to similar questions

Format as a clear markdown document that can be used as a knowledge base reference.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product management expert analyzing case study answers to extract actionable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error(`    Error generating summary: ${error.message}`);
    return null;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Run if called directly
if (require.main === module) {
  generateKBFromProductFolks()
    .then(() => {
      console.log('✅ KB generation from Product Folks completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 KB generation failed:', error);
      process.exit(1);
    });
}

module.exports = { generateKBFromProductFolks };

