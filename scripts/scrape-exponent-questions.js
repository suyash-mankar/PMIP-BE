const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

// Exponent question categories mapping
const EXPONENT_CATEGORIES = {
  'Product Design': 'product_design',
  'Product Strategy': 'product_strategy',
  Analytical: 'metrics',
  Behavioral: 'product_strategy', // Map behavioral to strategy
  Execution: 'product_improvement',
  Guesstimate: 'guesstimates',
  'System Design': 'product_design',
  Technical: 'product_design',
};

// Company difficulty mapping
const COMPANY_DIFFICULTY = {
  Google: 'senior',
  'Meta (Facebook)': 'senior',
  Amazon: 'senior',
  Microsoft: 'senior',
  Apple: 'senior',
  Netflix: 'senior',
  Uber: 'mid',
  DoorDash: 'mid',
  Spotify: 'mid',
  Airbnb: 'mid',
  Stripe: 'senior',
  Coinbase: 'senior',
  LinkedIn: 'senior',
  Pinterest: 'mid',
  Snapchat: 'mid',
  TikTok: 'mid',
  Shopify: 'mid',
  Slack: 'mid',
  Zoom: 'mid',
  Dropbox: 'mid',
};

async function scrapeExponentQuestions() {
  console.log('🕷️  Starting Exponent question scraping...');

  try {
    // Get existing questions to avoid duplicates
    const existingQuestions = await prisma.question.findMany({
      select: { text: true },
    });
    const existingTexts = new Set(existingQuestions.map(q => q.text.toLowerCase().trim()));

    let totalScraped = 0;
    let totalAdded = 0;

    // Scrape multiple pages
    for (let page = 1; page <= 5; page++) {
      console.log(`📄 Scraping page ${page}...`);

      const questions = await scrapePage(page);
      totalScraped += questions.length;

      for (const question of questions) {
        // Check for duplicates
        if (existingTexts.has(question.text.toLowerCase().trim())) {
          console.log(`⏭️  Skipping duplicate: ${question.text.substring(0, 50)}...`);
          continue;
        }

        // Add to database
        await prisma.question.create({
          data: {
            text: question.text,
            category: question.category,
            level: question.level,
            difficulty: question.difficulty,
            tags: JSON.stringify(question.tags),
            source: 'exponent',
          },
        });

        existingTexts.add(question.text.toLowerCase().trim());
        totalAdded++;
        console.log(`✅ Added: ${question.text.substring(0, 50)}...`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n🎉 Scraping completed!`);
    console.log(`📊 Total scraped: ${totalScraped}`);
    console.log(`✅ Total added: ${totalAdded}`);
    console.log(`⏭️  Duplicates skipped: ${totalScraped - totalAdded}`);
  } catch (error) {
    console.error('❌ Scraping error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function scrapePage(page) {
  try {
    const response = await axios.get(
      `https://www.tryexponent.com/questions?role=pm&src=nav&page=${page}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      }
    );

    const $ = cheerio.load(response.data);
    const questions = [];

    // Parse question cards
    $('.question-card, .interview-question').each((index, element) => {
      const $card = $(element);

      const text = $card.find('.question-text, .question-title, h3, h4').first().text().trim();
      const company = $card
        .find('.company-name, .company, [class*="company"]')
        .first()
        .text()
        .trim();
      const category = $card
        .find('.category, .question-type, [class*="category"]')
        .first()
        .text()
        .trim();

      if (text && text.length > 20) {
        const mappedCategory = EXPONENT_CATEGORIES[category] || 'product_strategy';
        const level = COMPANY_DIFFICULTY[company] || 'mid';
        const difficulty = level === 'senior' ? 8 : level === 'mid' ? 6 : 4;

        questions.push({
          text: cleanText(text),
          category: mappedCategory,
          level: level,
          difficulty: difficulty,
          tags: generateTags(text, category, company),
        });
      }
    });

    // Fallback parsing if main selector fails
    if (questions.length === 0) {
      $('h3, h4, .question').each((index, element) => {
        const text = $(element).text().trim();
        if (text && text.length > 20 && text.includes('?')) {
          questions.push({
            text: cleanText(text),
            category: 'product_strategy',
            level: 'mid',
            difficulty: 6,
            tags: generateTags(text, 'General', 'Unknown'),
          });
        }
      });
    }

    return questions;
  } catch (error) {
    console.error(`❌ Error scraping page ${page}:`, error.message);
    return [];
  }
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s?.,!-]/g, '')
    .trim();
}

function generateTags(text, category, company) {
  const tags = [];

  // Add category tag
  if (category) tags.push(category.toLowerCase().replace(/\s+/g, '-'));

  // Add company tag
  if (company) tags.push(company.toLowerCase().replace(/\s+/g, '-'));

  // Add content-based tags
  const lowerText = text.toLowerCase();
  if (lowerText.includes('design')) tags.push('design');
  if (lowerText.includes('metric')) tags.push('metrics');
  if (lowerText.includes('strategy')) tags.push('strategy');
  if (lowerText.includes('user')) tags.push('user-experience');
  if (lowerText.includes('revenue')) tags.push('monetization');
  if (lowerText.includes('growth')) tags.push('growth');
  if (lowerText.includes('mobile')) tags.push('mobile');
  if (lowerText.includes('web')) tags.push('web');
  if (lowerText.includes('app')) tags.push('mobile-app');

  return [...new Set(tags)]; // Remove duplicates
}

// Run if called directly
if (require.main === module) {
  scrapeExponentQuestions()
    .then(() => {
      console.log('🎉 Exponent scraping completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Exponent scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeExponentQuestions };
