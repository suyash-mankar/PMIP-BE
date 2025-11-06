/**
 * Manual test script for LinkedIn Cookie Provider
 *
 * Usage:
 *   node scripts/test-linkedin-provider.js <li_at_cookie>
 *
 * This script tests the LinkedIn provider without hitting the database
 */

require('dotenv').config();
const { LinkedInCookieProvider } = require('../src/agents/jobMatcher/providers/linkedinCookie');
const { JSearchProvider } = require('../src/agents/jobMatcher/providers/jsearch');

async function testLinkedInProvider() {
  const liAtCookie = process.argv[2];

  if (!liAtCookie) {
    console.error('❌ Please provide li_at cookie as argument');
    console.log('Usage: node scripts/test-linkedin-provider.js <li_at_cookie>');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('LinkedIn Cookie Provider Test');
  console.log('========================================\n');

  // Initialize provider
  const provider = new LinkedInCookieProvider({
    liAtCookie,
    enabled: true,
  });

  // Test 1: Cookie validity
  console.log('Test 1: Testing cookie validity...');
  try {
    const testResult = await provider.test();
    console.log(`✓ Test result:`, testResult);

    if (!testResult.available) {
      console.error('❌ Cookie is invalid or expired');
      console.log('\nTroubleshooting:');
      console.log('1. Make sure you copied the entire li_at cookie value');
      console.log("2. Check if you're still logged in to LinkedIn");
      console.log('3. Try logging out and back in to get a fresh cookie');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }

  console.log('\n');

  // Test 2: Job search
  console.log('Test 2: Searching for jobs...');
  try {
    const searchQuery = {
      keywords: 'Product Manager AI',
      location: 'India',
      datePosted: 'week',
    };

    console.log('Query:', searchQuery);

    const jobs = await provider.search(searchQuery, 5);

    console.log(`✓ Found ${jobs.length} jobs`);

    if (jobs.length > 0) {
      console.log('\nSample job:');
      console.log(JSON.stringify(jobs[0], null, 2));
    } else {
      console.log('⚠️  No jobs found (this might be normal for specific queries)');
    }
  } catch (error) {
    console.error('❌ Search failed:', error.message);
  }

  console.log('\n');

  // Test 3: Provider status
  console.log('Test 3: Checking provider status...');
  const status = await provider.getStatus();
  console.log('Status:', status);

  console.log('\n========================================');
  console.log('All tests completed!');
  console.log('========================================\n');
}

async function testJSearchProvider() {
  console.log('\n========================================');
  console.log('JSearch Provider Test');
  console.log('========================================\n');

  const provider = new JSearchProvider();

  // Test status
  console.log('Checking JSearch status...');
  const status = await provider.getStatus();
  console.log('Status:', status);

  if (!status.healthy) {
    console.error('❌ JSearch not configured (missing RAPIDAPI_KEY)');
    return;
  }

  console.log('\n');

  // Test search
  console.log('Searching for jobs...');
  try {
    const searchQuery = {
      keywords: 'Product Manager',
      location: 'India',
      datePosted: 'week',
    };

    console.log('Query:', searchQuery);

    const jobs = await provider.search(searchQuery, 5);

    console.log(`✓ Found ${jobs.length} jobs`);

    if (jobs.length > 0) {
      console.log('\nSample job:');
      console.log(JSON.stringify(jobs[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Search failed:', error.message);
  }

  console.log('\n========================================');
  console.log('JSearch test completed!');
  console.log('========================================\n');
}

async function main() {
  const mode = process.argv[2];

  if (mode === '--jsearch') {
    await testJSearchProvider();
  } else {
    await testLinkedInProvider();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
