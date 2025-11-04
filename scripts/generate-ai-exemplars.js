/**
 * Generate 10/10 AI exemplar answers for all questions missing them
 * Uses existing generateModelAnswer and generateRCAModelAnswer functions
 */

const { PrismaClient } = require('@prisma/client');
const {
  generateModelAnswer,
  generateRCAModelAnswer,
  generateGuesstiMateModelAnswer,
} = require('../src/services/openaiService');
const { exemplarInsert, getExemplarsByQuestionId } = require('../src/utils/vector');

const prisma = new PrismaClient();

// Rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function generateAIExemplars(options = {}) {
  const {
    batchSize = 10, // process N questions at a time
    delayMs = 2000, // delay between batches
    skipExisting = true, // skip questions that already have AI exemplars
    categoryFilter = null, // filter by category (e.g., 'RCA', 'Product Design')
  } = options;

  console.log('🤖 Starting AI exemplar generation...\n');
  console.log(`⚙️  Configuration:`);
  console.log(`   - Batch size: ${batchSize}`);
  console.log(`   - Delay between batches: ${delayMs}ms`);
  console.log(`   - Skip existing: ${skipExisting}`);
  console.log(`   - Category filter: ${categoryFilter || 'All'}\n`);

  try {
    // Get all questions
    const where = categoryFilter ? { category: categoryFilter } : {};
    const allQuestions = await prisma.question.findMany({
      where,
      select: { id: true, text: true, category: true, company: true },
      orderBy: { id: 'asc' },
    });

    console.log(`📊 Total questions: ${allQuestions.length}\n`);

    // Filter out questions that already have AI exemplars if skipExisting is true
    let questionsToProcess = allQuestions;
    if (skipExisting) {
      const questionsNeedingExemplars = [];
      for (const q of allQuestions) {
        const existing = await getExemplarsByQuestionId(q.id, {
          includeHuman: false,
          source: 'ai_generated',
        });
        if (existing.length === 0) {
          questionsNeedingExemplars.push(q);
        }
      }
      questionsToProcess = questionsNeedingExemplars;
      console.log(
        `✓ Filtered to ${questionsToProcess.length} questions needing AI exemplars\n`
      );
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < questionsToProcess.length; i += batchSize) {
      const batch = questionsToProcess.slice(i, i + batchSize);
      console.log(
        `\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(questionsToProcess.length / batchSize)}`
      );
      console.log(`   Processing questions ${i + 1} to ${Math.min(i + batchSize, questionsToProcess.length)}\n`);

      for (const question of batch) {
        processed++;
        console.log(
          `[${processed}/${questionsToProcess.length}] Generating for Q${question.id}: ${question.text.substring(0, 80)}...`
        );

        try {
          // Determine category-specific generator
          const categoryLower = question.category?.toLowerCase() || '';
          let modelAnswer;

          if (categoryLower === 'rca' || categoryLower.includes('root cause')) {
            console.log('   → Using RCA-specific generator');
            modelAnswer = await generateRCAModelAnswer(question.text);
          } else if (
            categoryLower.includes('guesstimate') ||
            categoryLower.includes('quantitative')
          ) {
            console.log('   → Using Guesstimate-specific generator');
            modelAnswer = await generateGuesstiMateModelAnswer(question.text);
          } else {
            console.log('   → Using standard generator');
            modelAnswer = await generateModelAnswer(question.text);
          }

          if (!modelAnswer || modelAnswer.length < 100) {
            throw new Error('Generated answer too short or empty');
          }

          // Extract key points (section headings) for fast coverage checks
          const keyPoints = extractKeyPoints(modelAnswer);

          // Store as exemplar
          const exemplarId = await exemplarInsert({
            questionId: question.id,
            source: 'ai_generated',
            author: 'GPT-5',
            title: `AI Exemplar: ${question.text.substring(0, 100)}`,
            content: modelAnswer,
            keyPoints: keyPoints.length > 0 ? keyPoints : null,
            qualityScore: 10,
            version: 1,
            sourceUrl: null,
            sourceHash: null,
          });

          succeeded++;
          console.log(`   ✅ Exemplar stored (ID: ${exemplarId})`);
          console.log(`   📏 Length: ${modelAnswer.length} chars, ${keyPoints.length} key points\n`);
        } catch (error) {
          failed++;
          console.error(`   ❌ Error: ${error.message}\n`);
        }
      }

      // Delay between batches
      if (i + batchSize < questionsToProcess.length) {
        console.log(`⏳ Waiting ${delayMs}ms before next batch...\n`);
        await delay(delayMs);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 AI exemplar generation completed!');
    console.log(`📊 Total processed: ${processed}`);
    console.log(`✅ Succeeded: ${succeeded}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((succeeded / processed) * 100).toFixed(1)}%`);
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Extract key points from markdown answer (section headings)
 */
function extractKeyPoints(markdown) {
  const keyPoints = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match markdown headings (## or ###) or bold items (**text**)
    if (trimmed.startsWith('##') || trimmed.startsWith('###')) {
      const point = trimmed.replace(/^#{2,3}\s*/, '').replace(/[🎯📊💡🧭🚀🔍✨]/g, '').trim();
      if (point && point.length > 5 && point.length < 100) {
        keyPoints.push(point);
      }
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      const point = trimmed.replace(/\*\*/g, '').trim();
      if (point && point.length > 5 && point.length < 100) {
        keyPoints.push(point);
      }
    }
  }

  return keyPoints;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--delay' && args[i + 1]) {
      options.delayMs = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--category' && args[i + 1]) {
      options.categoryFilter = args[i + 1];
      i++;
    } else if (args[i] === '--no-skip') {
      options.skipExisting = false;
    }
  }

  generateAIExemplars(options)
    .then(() => {
      console.log('✅ Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateAIExemplars };
