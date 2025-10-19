const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// NextLeap API authentication cookie
const COOKIE =
  'mp_344c114d886ddef572928a792ecc6741_mixpanel=%7B%22distinct_id%22%3A%20%22NLUID-62d0b140-14ec-42c6-adb3-8e8e1ea8dfb7%22%2C%22%24device_id%22%3A%20%22199f9b1e173270-0f81309d198416-1e525631-1fa400-199f9b1e173270%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%2C%22%24user_id%22%3A%20%22NLUID-62d0b140-14ec-42c6-adb3-8e8e1ea8dfb7%22%2C%22%24email%22%3A%20%22suyashmankar%40gmail.com%22%2C%22Whitelist%20Status%22%3A%20%22WAITLISTED%22%7D';

const TOTAL_QUESTIONS = 1685;
const PAGE_SIZE = 20;
const TOTAL_PAGES = Math.ceil(TOTAL_QUESTIONS / PAGE_SIZE);
const BATCH_SIZE = 50; // Insert questions in batches

// API endpoint and configuration
const API_URL = 'https://nextleap.app/api/v1/nebula-service/problem/discussions';

// Delay between API calls to avoid rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch questions from NextLeap API for a specific page
 */
async function fetchQuestionsPage(pageNum) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        cookie:
          'mp_344c114d886ddef572928a792ecc6741_mixpanel=%7B%22distinct_id%22%3A%20%22NLUID-62d0b140-14ec-42c6-adb3-8e8e1ea8dfb7%22%2C%22%24device_id%22%3A%20%22199f9b1e173270-0f81309d198416-1e525631-1fa400-199f9b1e173270%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%2C%22%24user_id%22%3A%20%22NLUID-62d0b140-14ec-42c6-adb3-8e8e1ea8dfb7%22%2C%22%24email%22%3A%20%22suyashmankar%40gmail.com%22%2C%22Whitelist%20Status%22%3A%20%22WAITLISTED%22%7D',
      },
      body: JSON.stringify({
        pageNum,
        pageSize: PAGE_SIZE,
        refreshAttemptNum: 0,
        problemTypes: ['PRODUCT'],
        prefixUrl: '/course-dashboard/nlcfshwyuxi5ksyz8qlk3/interview-prep/question',
        totalCount: TOTAL_QUESTIONS,
        sortByEngagementScore: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching page ${pageNum}:`, error.message);
    throw error;
  }
}

/**
 * Parse question data from API response
 */
function parseQuestion(problem) {
  try {
    // Extract question text
    const text = problem.title?.text || problem.title || '';
    if (!text) {
      console.warn('Question without text found, skipping');
      return null;
    }

    // Extract category (first tag, default to "General")
    let category = 'General';
    if (problem.tags && problem.tags.length > 0 && problem.tags[0].text?.text) {
      category = problem.tags[0].text.text;
    }

    // Extract companies (all bottomTags)
    const companies = [];
    if (problem.bottomTags && Array.isArray(problem.bottomTags)) {
      problem.bottomTags.forEach(tag => {
        if (tag.text?.text) {
          companies.push(tag.text.text);
        }
      });
    }

    return {
      text,
      category,
      company: JSON.stringify(companies),
      source: 'nextleap',
    };
  } catch (error) {
    console.error('Error parsing question:', error.message);
    return null;
  }
}

/**
 * Insert questions in batch
 */
async function insertQuestionsBatch(questions) {
  try {
    const result = await prisma.question.createMany({
      data: questions,
      skipDuplicates: true,
    });
    return result.count;
  } catch (error) {
    console.error('Error inserting batch:', error.message);
    throw error;
  }
}

/**
 * Main scraping function
 */
async function scrapeAllQuestions() {
  console.log(`🚀 Starting NextLeap questions scraper...`);
  console.log(`📊 Total questions to fetch: ${TOTAL_QUESTIONS}`);
  console.log(`📄 Pages to process: ${TOTAL_PAGES}`);
  console.log(`⏱️  Batch size: ${BATCH_SIZE} questions\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let currentBatch = [];

  try {
    for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
      console.log(`📥 Fetching page ${pageNum}/${TOTAL_PAGES}...`);

      // Fetch page data
      const response = await fetchQuestionsPage(pageNum);

      if (!response.data || !Array.isArray(response.data)) {
        console.warn(`⚠️  No data found on page ${pageNum}`);
        continue;
      }

      console.log(`   Found ${response.data.length} questions on this page`);

      // Parse questions from this page
      for (const problem of response.data) {
        const parsedQuestion = parseQuestion(problem);

        if (parsedQuestion) {
          currentBatch.push(parsedQuestion);
        } else {
          totalSkipped++;
        }

        // Insert batch when it reaches BATCH_SIZE
        if (currentBatch.length >= BATCH_SIZE) {
          const inserted = await insertQuestionsBatch(currentBatch);
          totalInserted += inserted;
          console.log(`   ✅ Inserted batch: ${inserted} questions (Total: ${totalInserted})`);
          currentBatch = [];
        }
      }

      // Add delay between pages to avoid rate limiting
      if (pageNum < TOTAL_PAGES) {
        await delay(500); // 500ms delay between requests
      }
    }

    // Insert remaining questions in the last batch
    if (currentBatch.length > 0) {
      const inserted = await insertQuestionsBatch(currentBatch);
      totalInserted += inserted;
      console.log(`   ✅ Inserted final batch: ${inserted} questions`);
    }

    console.log(`\n🎉 Scraping completed!`);
    console.log(`✅ Total questions inserted: ${totalInserted}`);
    console.log(`⚠️  Total questions skipped: ${totalSkipped}`);
  } catch (error) {
    console.error('\n❌ Fatal error during scraping:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the scraper
if (require.main === module) {
  scrapeAllQuestions()
    .then(() => {
      console.log('\n✨ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeAllQuestions };
