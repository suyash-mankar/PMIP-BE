const axios = require('axios');
const cheerio = require('cheerio');

async function testExponentScraper() {
  try {
    console.log('🧪 Testing Exponent scraper...');
    
    const response = await axios.get('https://www.tryexponent.com/questions?role=pm&src=nav', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    console.log('✅ Got response, parsing...');
    const $ = cheerio.load(response.data);
    
    // Try different selectors to find questions
    const selectors = [
      'h3', 'h4', '.question', '.question-text', '.interview-question',
      '[data-testid*="question"]', '.question-title', '.card-title'
    ];
    
    let questions = [];
    
    selectors.forEach(selector => {
      $(selector).each((index, element) => {
        const text = $(element).text().trim();
        if (text && text.length > 20 && text.includes('?')) {
          questions.push({
            selector,
            text: text.substring(0, 100) + '...'
          });
        }
      });
    });
    
    console.log(`\n📊 Found ${questions.length} potential questions:`);
    questions.slice(0, 10).forEach((q, i) => {
      console.log(`${i + 1}. [${q.selector}] ${q.text}`);
    });
    
    // Save HTML for debugging
    const fs = require('fs');
    fs.writeFileSync('exponent-page.html', response.data);
    console.log('\n💾 Saved HTML to exponent-page.html for debugging');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testExponentScraper();
