const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Expanded category mapping - prioritize your 6 core categories, but include others
const EXPONENT_CATEGORY_MAPPING = {
  // Your 6 core categories (PRIORITY - should be majority)
  'Product Design': 'product_design',
  'Product Strategy': 'product_strategy',
  Analytical: 'metrics',
  Execution: 'product_improvement',
  Estimation: 'guesstimates',
  'System Design': 'root_cause_analysis', // Map system design to root cause analysis

  // Additional Exponent categories (smaller percentage)
  Behavioral: 'behavioral',
  Technical: 'technical',
  'Program Sense': 'program_sense',
  'Project Management': 'project_management',
  Concept: 'concept',
  'Cross-Functional': 'cross_functional',
  'People Management': 'people_management',
  'Customer Interaction': 'customer_interaction',
  'App Critique': 'app_critique',
  'Data Analysis': 'data_analysis',
  SQL: 'sql',
  'Machine Learning': 'machine_learning',
  Coding: 'coding',
  'Data Pipeline Design': 'data_pipeline',
  'Data Modeling': 'data_modeling',
};

// Company difficulty mapping (expanded)
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
  YouTube: 'senior',
  Instagram: 'senior',
  WhatsApp: 'senior',
  Twitter: 'senior',
  Gmail: 'senior',
  'Capital One': 'mid',
  PayPal: 'senior',
  Tesla: 'senior',
  Nvidia: 'senior',
  Adobe: 'senior',
  Salesforce: 'senior',
  Oracle: 'senior',
  IBM: 'senior',
  Intel: 'senior',
  AMD: 'senior',
};

// Target distribution for 200 questions
const TARGET_DISTRIBUTION = {
  // Your 6 core categories (70% = 140 questions)
  core: {
    product_design: 40, // 20%
    product_strategy: 40, // 20%
    metrics: 25, // 12.5%
    product_improvement: 25, // 12.5%
    root_cause_analysis: 20, // 10%
    guesstimates: 15, // 7.5%
  },
  // Additional categories (30% = 60 questions)
  additional: {
    behavioral: 15, // 7.5%
    technical: 10, // 5%
    system_design: 10, // 5%
    data_analysis: 8, // 4%
    project_management: 7, // 3.5%
    customer_interaction: 5, // 2.5%
    app_critique: 3, // 1.5%
    machine_learning: 2, // 1%
  },
};

async function scrape200ExponentQuestions() {
  console.log('🕷️  Starting comprehensive Exponent scraping for 200 questions...');
  console.log('📊 Target: 70% core categories, 30% additional categories\n');

  try {
    // Get existing questions to avoid duplicates
    const existingQuestions = await prisma.question.findMany({
      select: { text: true },
    });
    const existingTexts = new Set(existingQuestions.map(q => q.text.toLowerCase().trim()));

    let totalScraped = 0;
    let totalAdded = 0;
    const categoryCounts = {};

    // Scrape multiple pages to get 200+ questions
    for (let page = 1; page <= 10; page++) {
      console.log(`📄 Scraping page ${page}...`);

      try {
        const questions = await scrapePage(page);
        totalScraped += questions.length;

        for (const question of questions) {
          if (totalAdded >= 200) {
            console.log('\n🎯 Reached target of 200 questions!');
            break;
          }

          // Check if we should add this question based on category distribution
          const mappedCategory = EXPONENT_CATEGORY_MAPPING[question.category] || 'product_strategy';
          const categoryLimit = getCategoryLimit(mappedCategory);

          if (categoryCounts[mappedCategory] >= categoryLimit) {
            continue; // Skip if we've reached the limit for this category
          }

          if (await addQuestionIfNew(question, existingTexts)) {
            totalAdded++;
            categoryCounts[mappedCategory] = (categoryCounts[mappedCategory] || 0) + 1;

            if (totalAdded % 10 === 0) {
              console.log(`📈 Progress: ${totalAdded}/200 questions added`);
            }
          }

          // Small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (totalAdded >= 200) break;

        // Delay between pages
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (pageError) {
        console.error(`❌ Error scraping page ${page}:`, pageError.message);
        continue;
      }
    }

    console.log('\n📊 Final Results:');
    console.log(`✅ Total questions scraped: ${totalScraped}`);
    console.log(`✅ Total questions added: ${totalAdded}`);
    console.log(`⏭️  Duplicates skipped: ${totalScraped - totalAdded}\n`);

    console.log('📈 Category Distribution:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = ((count / totalAdded) * 100).toFixed(1);
      console.log(`  ${category}: ${count} questions (${percentage}%)`);
    });

    await showQuestionSummary();
  } catch (error) {
    console.error('❌ Scraping error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getCategoryLimit(category) {
  // Check if it's a core category
  if (TARGET_DISTRIBUTION.core[category]) {
    return TARGET_DISTRIBUTION.core[category];
  }

  // Check if it's an additional category
  if (TARGET_DISTRIBUTION.additional[category]) {
    return TARGET_DISTRIBUTION.additional[category];
  }

  // Default limit for unmapped categories
  return 5;
}

async function scrapePage(page) {
  try {
    const response = await axios.get(
      `https://www.tryexponent.com/questions?role=pm&src=nav&page=${page}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

    // Try multiple selectors to find questions
    const selectors = [
      'h3',
      '.question-title',
      '.interview-question h3',
      '.question-card h3',
      '[data-testid*="question"]',
    ];

    selectors.forEach(selector => {
      $(selector).each((index, element) => {
        const text = $(element).text().trim();

        if (isValidQuestion(text)) {
          const company = extractCompany(text);
          const category = extractCategory(text, $(element));
          const level = COMPANY_DIFFICULTY[company] || 'mid';
          const difficulty = level === 'senior' ? 8 : level === 'mid' ? 6 : 4;

          questions.push({
            text: cleanText(text),
            category: category,
            level: level,
            difficulty: difficulty,
            tags: generateTags(text, category, company),
            source: 'exponent',
            company: company,
          });
        }
      });
    });

    return questions;
  } catch (error) {
    console.error(`❌ Error scraping page ${page}:`, error.message);
    return [];
  }
}

function extractCategory(text, $element) {
  // Try to find category from parent elements or nearby elements
  const $parent = $element.parent();
  const $card = $parent.closest('.question-card, .interview-question, [class*="card"]');

  // Look for category indicators in the card
  const categoryText = $card
    .find('.category, .question-type, [class*="category"], .tag, .label')
    .first()
    .text()
    .trim();

  if (categoryText && EXPONENT_CATEGORY_MAPPING[categoryText]) {
    return categoryText;
  }

  // Fallback to text-based categorization
  return categorizeQuestion(text);
}

function categorizeQuestion(text) {
  const lowerText = text.toLowerCase();

  // Core category detection
  if (
    lowerText.includes('design') ||
    lowerText.includes('feature') ||
    lowerText.includes('product') ||
    lowerText.includes('app')
  ) {
    return 'Product Design';
  }

  if (
    lowerText.includes('metric') ||
    lowerText.includes('measure') ||
    lowerText.includes('kpi') ||
    lowerText.includes('analytics') ||
    lowerText.includes('success')
  ) {
    return 'Analytical';
  }

  if (
    lowerText.includes('strategy') ||
    lowerText.includes('market') ||
    lowerText.includes('competitor') ||
    lowerText.includes('business') ||
    lowerText.includes('expand')
  ) {
    return 'Product Strategy';
  }

  if (
    lowerText.includes('improve') ||
    lowerText.includes('optimize') ||
    lowerText.includes('enhance') ||
    lowerText.includes('increase')
  ) {
    return 'Execution';
  }

  if (
    lowerText.includes('estimate') ||
    lowerText.includes('calculate') ||
    lowerText.includes('how many') ||
    lowerText.includes('guesstimate')
  ) {
    return 'Estimation';
  }

  if (
    lowerText.includes('system') ||
    lowerText.includes('architecture') ||
    lowerText.includes('scale') ||
    lowerText.includes('infrastructure')
  ) {
    return 'System Design';
  }

  // Additional category detection
  if (
    lowerText.includes('behavioral') ||
    lowerText.includes('tell me about') ||
    lowerText.includes('experience')
  ) {
    return 'Behavioral';
  }

  if (
    lowerText.includes('technical') ||
    lowerText.includes('api') ||
    lowerText.includes('database') ||
    lowerText.includes('algorithm')
  ) {
    return 'Technical';
  }

  if (
    lowerText.includes('data') ||
    lowerText.includes('analysis') ||
    lowerText.includes('sql') ||
    lowerText.includes('query')
  ) {
    return 'Data Analysis';
  }

  if (
    lowerText.includes('project') ||
    lowerText.includes('management') ||
    lowerText.includes('timeline') ||
    lowerText.includes('deadline')
  ) {
    return 'Project Management';
  }

  if (
    lowerText.includes('customer') ||
    lowerText.includes('user') ||
    lowerText.includes('support') ||
    lowerText.includes('feedback')
  ) {
    return 'Customer Interaction';
  }

  if (
    lowerText.includes('critique') ||
    lowerText.includes('review') ||
    lowerText.includes('evaluate') ||
    lowerText.includes('assess')
  ) {
    return 'App Critique';
  }

  if (
    lowerText.includes('machine learning') ||
    lowerText.includes('ml') ||
    lowerText.includes('ai') ||
    lowerText.includes('model')
  ) {
    return 'Machine Learning';
  }

  return 'Product Strategy'; // Default fallback
}

function extractCompany(text) {
  // Direct company mentions
  const companies = Object.keys(COMPANY_DIFFICULTY);
  for (const company of companies) {
    if (text.includes(company)) {
      return company;
    }
  }

  // Extract from common patterns
  if (text.includes("You're a PM at")) {
    const match = text.match(/You're a PM at ([^.]+)/);
    if (match) return match[1].trim();
  }

  if (text.includes("You're a PM for")) {
    const match = text.match(/You're a PM for ([^.]+)/);
    if (match) return match[1].trim();
  }

  if (text.includes('As a PM at')) {
    const match = text.match(/As a PM at ([^.]+)/);
    if (match) return match[1].trim();
  }

  if (text.includes('As a PM for')) {
    const match = text.match(/As a PM for ([^.]+)/);
    if (match) return match[1].trim();
  }

  return 'Unknown';
}

function isValidQuestion(text) {
  return (
    text &&
    text.length > 20 &&
    text.length < 500 &&
    (text.includes('?') ||
      text.includes('How') ||
      text.includes('What') ||
      text.includes('Why') ||
      text.includes('Design') ||
      text.includes('Tell me') ||
      text.includes('Explain') ||
      text.includes('Describe')) &&
    !text.includes('Sign up') &&
    !text.includes('Log in') &&
    !text.includes('Get updates') &&
    !text.includes('Subscribe') &&
    !text.includes('Newsletter')
  );
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
}

function generateTags(text, category, company) {
  const tags = [];

  // Add category tag
  if (category) tags.push(category.toLowerCase().replace(/\s+/g, '-'));

  // Add company tag
  if (company && company !== 'Unknown') {
    tags.push(company.toLowerCase().replace(/\s+/g, '-'));
  }

  // Add content-based tags
  const lowerText = text.toLowerCase();

  // Technology tags
  if (lowerText.includes('mobile')) tags.push('mobile');
  if (lowerText.includes('web')) tags.push('web');
  if (lowerText.includes('api')) tags.push('api');
  if (lowerText.includes('database')) tags.push('database');
  if (lowerText.includes('algorithm')) tags.push('algorithms');
  if (lowerText.includes('recommendation')) tags.push('recommendations');
  if (lowerText.includes('ai') || lowerText.includes('artificial intelligence')) tags.push('ai');
  if (lowerText.includes('ml') || lowerText.includes('machine learning'))
    tags.push('machine-learning');

  // Domain tags
  if (lowerText.includes('ecommerce')) tags.push('ecommerce');
  if (lowerText.includes('social')) tags.push('social-media');
  if (lowerText.includes('fintech')) tags.push('fintech');
  if (lowerText.includes('healthcare')) tags.push('healthcare');
  if (lowerText.includes('education')) tags.push('education');

  return [...new Set(tags)]; // Remove duplicates
}

async function addQuestionIfNew(question, existingTexts) {
  const normalizedText = question.text.toLowerCase().trim();

  if (existingTexts.has(normalizedText)) {
    return false; // Skip duplicate
  }

  const mappedCategory = EXPONENT_CATEGORY_MAPPING[question.category] || 'product_strategy';

  await prisma.question.create({
    data: {
      text: question.text,
      category: mappedCategory,
      level: question.level,
      difficulty: question.difficulty,
      tags: JSON.stringify(question.tags),
      source: question.source,
      company: question.company,
    },
  });

  existingTexts.add(normalizedText);
  console.log(
    `✅ Added: ${question.text.substring(0, 50)}... [${mappedCategory}] [${question.company}]`
  );
  return true;
}

async function showQuestionSummary() {
  const total = await prisma.question.count();
  const byCategory = await prisma.question.groupBy({
    by: ['category'],
    _count: { id: true },
  });
  const bySource = await prisma.question.groupBy({
    by: ['source'],
    _count: { id: true },
  });

  console.log('\n📊 Final Question Database Summary:');
  console.log(`Total Questions: ${total}`);

  console.log('\nBy Category:');
  byCategory.forEach(cat => {
    console.log(`  ${cat.category}: ${cat._count.id} questions`);
  });

  console.log('\nBy Source:');
  bySource.forEach(src => {
    console.log(`  ${src.source}: ${src._count.id} questions`);
  });
}

// Run if called directly
if (require.main === module) {
  scrape200ExponentQuestions();
}

module.exports = { scrape200ExponentQuestions };
