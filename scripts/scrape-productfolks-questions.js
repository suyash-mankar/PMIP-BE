const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

// The Product Folks category mapping
// Using title case to match existing database format
const PRODUCTFOLKS_CATEGORIES = {
  RCA: 'RCA',
  'Root Cause Analysis': 'RCA',
  Metrics: 'Metrics',
  Guesstimates: 'Guesstimates',
  'Product Design': 'Product Design',
  'Product Improvement': 'Product Improvement',
  'Product Strategy': 'Product Strategy',
};

async function scrapeProductFolksQuestions() {
  console.log('🕷️  Starting Product Folks question scraping...');
  console.log('📍 Source: https://www.theproductfolks.com/product-management-case-studies');

  try {
    // Get existing questions to avoid duplicates
    const existingQuestions = await prisma.question.findMany({
      select: { text: true },
    });
    const existingTexts = new Set(existingQuestions.map(q => q.text.toLowerCase().trim()));

    let totalScraped = 0;
    let totalAdded = 0;
    let duplicatesSkipped = 0;

    console.log('🔍 Fetching case studies page...');

    const questions = await scrapeCaseStudies();
    totalScraped = questions.length;

    console.log(`\n📊 Found ${totalScraped} case studies`);
    console.log('💾 Adding to database...\n');

    for (const question of questions) {
      // Check for duplicates
      if (existingTexts.has(question.text.toLowerCase().trim())) {
        duplicatesSkipped++;
        console.log(
          `⏭️  Skipping duplicate: ${question.company} - ${question.text.substring(0, 60)}...`
        );
        continue;
      }

      // Add to database
      try {
        await prisma.question.create({
          data: {
            text: question.text,
            category: question.category,
            company: question.company,
            tags: question.tags,
            source: 'theproductfolks',
          },
        });

        existingTexts.add(question.text.toLowerCase().trim());
        totalAdded++;
        console.log(
          `✅ Added: [${question.company}] ${question.categoryLabel} - ${question.text.substring(
            0,
            60
          )}...`
        );
      } catch (dbError) {
        console.error(
          `❌ Database error for question: ${question.text.substring(0, 50)}`,
          dbError.message
        );
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Scraping completed!`);
    console.log(`📊 Total scraped: ${totalScraped}`);
    console.log(`✅ Total added: ${totalAdded}`);
    console.log(`⏭️  Duplicates skipped: ${duplicatesSkipped}`);
    console.log(`${'='.repeat(60)}\n`);

    // Show category breakdown
    const categoryBreakdown = {};
    questions.forEach(q => {
      categoryBreakdown[q.categoryLabel] = (categoryBreakdown[q.categoryLabel] || 0) + 1;
    });

    console.log('📈 Category Breakdown:');
    Object.entries(categoryBreakdown).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} questions`);
    });
  } catch (error) {
    console.error('❌ Scraping error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function scrapeCaseStudies() {
  try {
    const url = 'https://www.theproductfolks.com/product-management-case-studies';

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    const $ = cheerio.load(response.data);
    const questions = [];

    // Try multiple selectors to find case study cards
    const selectors = [
      '.case-study-card',
      '[class*="case-study"]',
      '[class*="CaseStudy"]',
      '.w-dyn-item',
      '.collection-item',
      'article',
      '[class*="card"]',
    ];

    let $cards = $();
    for (const selector of selectors) {
      $cards = $(selector);
      if ($cards.length > 0) {
        console.log(`✓ Found ${$cards.length} cards using selector: ${selector}`);
        break;
      }
    }

    // If no cards found with specific selectors, try a more general approach
    if ($cards.length === 0) {
      console.log('ℹ️  Trying alternative parsing method...');

      // Look for sections containing case studies
      $('body *').each((index, element) => {
        const $elem = $(element);
        const text = $elem.text();

        // Look for elements that contain company names and questions
        if (
          text.includes('Read Case Study') ||
          text.includes('case study') ||
          (text.includes('?') && text.length > 30 && text.length < 500)
        ) {
          // Try to find company and category
          const company = extractCompany($elem);
          const category = extractCategory($elem);
          const questionText = extractQuestion($elem);

          if (company && questionText && questionText.length > 20) {
            const categoryValue = PRODUCTFOLKS_CATEGORIES[category] || 'Product Strategy';

            questions.push({
              text: cleanText(questionText),
              category: categoryValue,
              categoryLabel: category || 'Product Strategy',
              company: JSON.stringify([company]),
              tags: JSON.stringify([company.toLowerCase(), category?.toLowerCase() || 'strategy']),
            });
          }
        }
      });
    } else {
      // Parse each card
      $cards.each((index, element) => {
        const $card = $(element);

        // Extract company name
        const company =
          $card
            .find('[class*="company"], [class*="Company"], h3, h4, strong')
            .first()
            .text()
            .trim() ||
          $card.find('img[alt]').attr('alt') ||
          'Unknown';

        // Extract category
        const categoryText = $card
          .find('[class*="category"], [class*="tag"], [class*="badge"], span, .label')
          .text()
          .trim();
        const category = findMatchingCategory(categoryText);

        // Extract question text
        const questionText = $card
          .find('p, [class*="question"], [class*="text"]')
          .filter((i, el) => {
            const text = $(el).text().trim();
            return text.length > 30 && text.includes('?');
          })
          .first()
          .text()
          .trim();

        if (questionText && questionText.length > 20 && company !== 'Unknown') {
          const categoryValue = PRODUCTFOLKS_CATEGORIES[category] || 'Product Strategy';

          questions.push({
            text: cleanText(questionText),
            category: categoryValue,
            categoryLabel: category,
            company: JSON.stringify([company]),
            tags: JSON.stringify([company.toLowerCase(), category.toLowerCase()]),
          });
        }
      });
    }

    // Remove duplicates based on question text
    const uniqueQuestions = [];
    const seenTexts = new Set();

    for (const q of questions) {
      const normalizedText = q.text.toLowerCase().trim();
      if (!seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        uniqueQuestions.push(q);
      }
    }

    return uniqueQuestions;
  } catch (error) {
    console.error(`❌ Error scraping case studies:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    return [];
  }
}

function extractCompany($elem) {
  // Try to find company name in various ways
  const companySelectors = [
    $elem.find('h3, h4, h5').first(),
    $elem.find('[class*="company"]').first(),
    $elem.find('strong').first(),
    $elem.find('img[alt]'),
  ];

  for (const $sel of companySelectors) {
    let text = $sel.attr ? $sel.attr('alt') : $sel.text();
    text = text?.trim();
    if (text && text.length > 1 && text.length < 50 && !text.includes('?')) {
      return text;
    }
  }

  return null;
}

function extractCategory($elem) {
  const categoryKeywords = Object.keys(PRODUCTFOLKS_CATEGORIES);
  const text = $elem.text();

  for (const keyword of categoryKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}

function extractQuestion($elem) {
  // Find text with question marks
  const paragraphs = $elem.find('p, div');

  for (let i = 0; i < paragraphs.length; i++) {
    const text = $(paragraphs[i]).text().trim();
    if (text.includes('?') && text.length > 30 && text.length < 500) {
      return text;
    }
  }

  return null;
}

function findMatchingCategory(text) {
  const lowerText = text.toLowerCase();

  // Direct matches
  for (const [key, value] of Object.entries(PRODUCTFOLKS_CATEGORIES)) {
    if (lowerText.includes(key.toLowerCase())) {
      return key;
    }
  }

  // Partial matches - return the key that maps to proper format
  if (lowerText.includes('root') || lowerText.includes('rca')) return 'RCA';
  if (lowerText.includes('metric')) return 'Metrics';
  if (lowerText.includes('guess')) return 'Guesstimates';
  if (lowerText.includes('design')) return 'Product Design';
  if (lowerText.includes('improve')) return 'Product Improvement';
  if (lowerText.includes('strategy')) return 'Product Strategy';

  return 'Product Strategy'; // Default
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

// Run if called directly
if (require.main === module) {
  scrapeProductFolksQuestions()
    .then(() => {
      console.log('✅ Product Folks scraping completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Product Folks scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeProductFolksQuestions };
