const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

// Additional question sources to scrape
const ADDITIONAL_SOURCES = [
  {
    name: 'Exponent Additional Pages',
    url: 'https://www.tryexponent.com/questions?role=pm&src=nav',
    pages: [4, 5, 6, 7, 8]
  }
];

// Company difficulty mapping (expanded)
const COMPANY_DIFFICULTY = {
  'Google': 'senior',
  'Meta (Facebook)': 'senior', 
  'Amazon': 'senior',
  'Microsoft': 'senior',
  'Apple': 'senior',
  'Netflix': 'senior',
  'Uber': 'mid',
  'DoorDash': 'mid',
  'Spotify': 'mid',
  'Airbnb': 'mid',
  'Stripe': 'senior',
  'Coinbase': 'senior',
  'LinkedIn': 'senior',
  'Pinterest': 'mid',
  'Snapchat': 'mid',
  'TikTok': 'mid',
  'Shopify': 'mid',
  'Slack': 'mid',
  'Zoom': 'mid',
  'Dropbox': 'mid',
  'YouTube': 'senior',
  'Instagram': 'senior',
  'WhatsApp': 'senior',
  'Twitter': 'senior',
  'Gmail': 'senior',
  'Capital One': 'mid',
  'PayPal': 'senior',
  'Tesla': 'senior',
  'Nvidia': 'senior',
  'Adobe': 'senior',
  'Salesforce': 'senior',
  'Oracle': 'senior',
  'IBM': 'senior',
  'Intel': 'senior',
  'AMD': 'senior'
};

async function scrapeMoreQuestions() {
  console.log('🕷️  Starting additional question scraping...');
  
  try {
    // Get existing questions to avoid duplicates
    const existingQuestions = await prisma.question.findMany({
      select: { text: true }
    });
    const existingTexts = new Set(existingQuestions.map(q => q.text.toLowerCase().trim()));

    let totalScraped = 0;
    let totalAdded = 0;

    // Scrape additional Exponent pages
    for (let page = 4; page <= 10; page++) {
      console.log(`📄 Scraping Exponent page ${page}...`);
      
      try {
        const questions = await scrapeExponentPage(page);
        totalScraped += questions.length;

        for (const question of questions) {
          if (await addQuestionIfNew(question, existingTexts)) {
            totalAdded++;
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not scrape page ${page}, stopping...`);
        break;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`\n🎉 Additional scraping completed!`);
    console.log(`📊 Total scraped: ${totalScraped}`);
    console.log(`✅ Total added: ${totalAdded}`);
    console.log(`⏭️  Duplicates skipped: ${totalScraped - totalAdded}`);

    // Show final summary
    await showQuestionSummary();

  } catch (error) {
    console.error('❌ Scraping error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function scrapeExponentPage(page) {
  try {
    const response = await axios.get(`https://www.tryexponent.com/questions?role=pm&src=nav&page=${page}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);
    const questions = [];

    // Parse questions from h3 elements
    $('h3').each((index, element) => {
      const text = $(element).text().trim();
      
      if (isValidQuestion(text)) {
        const company = extractCompany(text);
        const category = categorizeQuestion(text);
        const level = COMPANY_DIFFICULTY[company] || 'mid';
        const difficulty = level === 'senior' ? 8 : level === 'mid' ? 6 : 4;
        
        questions.push({
          text: cleanText(text),
          category: category,
          level: level,
          difficulty: difficulty,
          tags: generateTags(text, category, company),
          source: 'exponent',
          company: company
        });
      }
    });

    return questions;
  } catch (error) {
    console.error(`❌ Error scraping page ${page}:`, error.message);
    return [];
  }
}

function isValidQuestion(text) {
  return text && 
         text.length > 20 && 
         text.length < 500 &&
         (text.includes('?') || text.includes('How') || text.includes('What') || text.includes('Why') || text.includes('Design')) &&
         !text.includes('Sign up') &&
         !text.includes('Log in') &&
         !text.includes('Get updates');
}

function extractCompany(text) {
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
  
  if (text.includes("As a PM at")) {
    const match = text.match(/As a PM at ([^.]+)/);
    if (match) return match[1].trim();
  }
  
  if (text.includes("As a PM for")) {
    const match = text.match(/As a PM for ([^.]+)/);
    if (match) return match[1].trim();
  }
  
  return 'Unknown';
}

function categorizeQuestion(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('design') || lowerText.includes('feature') || lowerText.includes('product') || lowerText.includes('app')) {
    return 'product_design';
  }
  
  if (lowerText.includes('metric') || lowerText.includes('measure') || lowerText.includes('kpi') || lowerText.includes('analytics') || lowerText.includes('success')) {
    return 'metrics';
  }
  
  if (lowerText.includes('strategy') || lowerText.includes('market') || lowerText.includes('competitor') || lowerText.includes('business') || lowerText.includes('expand')) {
    return 'product_strategy';
  }
  
  if (lowerText.includes('improve') || lowerText.includes('optimize') || lowerText.includes('enhance') || lowerText.includes('increase')) {
    return 'product_improvement';
  }
  
  if (lowerText.includes('estimate') || lowerText.includes('calculate') || lowerText.includes('how many')) {
    return 'guesstimates';
  }
  
  if (lowerText.includes('investigate') || lowerText.includes('analyze') || lowerText.includes('root cause') || lowerText.includes('why') && lowerText.includes('dropped')) {
    return 'root_cause_analysis';
  }
  
  return 'product_strategy'; // Default fallback
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
  if (category) tags.push(category.replace(/_/g, '-'));
  
  // Add company tag
  if (company && company !== 'Unknown') {
    tags.push(company.toLowerCase().replace(/\s+/g, '-'));
  }
  
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
  if (lowerText.includes('algorithm')) tags.push('algorithms');
  if (lowerText.includes('recommendation')) tags.push('recommendations');
  if (lowerText.includes('ai') || lowerText.includes('artificial intelligence')) tags.push('ai');
  if (lowerText.includes('ml') || lowerText.includes('machine learning')) tags.push('machine-learning');
  
  return [...new Set(tags)]; // Remove duplicates
}

async function addQuestionIfNew(question, existingTexts) {
  // Check for duplicates
  if (existingTexts.has(question.text.toLowerCase().trim())) {
    console.log(`⏭️  Skipping duplicate: ${question.text.substring(0, 50)}...`);
    return false;
  }

  // Add to database
  await prisma.question.create({
    data: {
      text: question.text,
      category: question.category,
      level: question.level,
      difficulty: question.difficulty,
      tags: JSON.stringify(question.tags),
      source: question.source,
      company: question.company
    }
  });

  existingTexts.add(question.text.toLowerCase().trim());
  console.log(`✅ Added: ${question.text.substring(0, 50)}... [${question.category}] [${question.company}]`);
  return true;
}

async function showQuestionSummary() {
  const total = await prisma.question.count();
  const byCategory = await prisma.question.groupBy({
    by: ['category'],
    _count: { id: true }
  });
  const bySource = await prisma.question.groupBy({
    by: ['source'],
    _count: { id: true }
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
  scrapeMoreQuestions()
    .then(() => {
      console.log('🎉 Additional question scraping completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Additional question scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeMoreQuestions };
