/**
 * Database Cleanup Script - Production Ready
 *
 * This script removes all test/development data while keeping:
 * - Questions (interview questions)
 * - Database schema
 *
 * This will delete:
 * - All users
 * - All practice sessions
 * - All answers
 * - All scores
 * - All payments
 * - All events
 * - All question views
 * - All anonymous sessions
 * - All newsletter subscriptions (optional)
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getDatabaseStats() {
  console.log('\n📊 Current Database Statistics:\n');

  const stats = {
    users: await prisma.user.count(),
    practiceSessions: await prisma.practiceSession.count(),
    answers: await prisma.answer.count(),
    scores: await prisma.score.count(),
    payments: await prisma.payment.count(),
    events: await prisma.event.count(),
    questionViews: await prisma.questionView.count(),
    anonymousSessions: await prisma.anonymousSession.count(),
    newsletterSubscriptions: await prisma.newsletterSubscription.count(),
    questions: await prisma.question.count(),
  };

  console.log(`   Users:                    ${stats.users}`);
  console.log(`   Practice Sessions:        ${stats.practiceSessions}`);
  console.log(`   Answers:                  ${stats.answers}`);
  console.log(`   Scores:                   ${stats.scores}`);
  console.log(`   Payments:                 ${stats.payments}`);
  console.log(`   Events:                   ${stats.events}`);
  console.log(`   Question Views:           ${stats.questionViews}`);
  console.log(`   Anonymous Sessions:       ${stats.anonymousSessions}`);
  console.log(`   Newsletter Subscriptions: ${stats.newsletterSubscriptions}`);
  console.log(`   Questions (WILL KEEP):    ${stats.questions} ✅`);

  return stats;
}

async function cleanDatabase(keepNewsletters = false) {
  console.log('\n🧹 Starting database cleanup...\n');

  try {
    // Delete in order respecting foreign key constraints

    console.log('🗑️  Deleting Events...');
    const deletedEvents = await prisma.event.deleteMany({});
    console.log(`   ✅ Deleted ${deletedEvents.count} events`);

    console.log('🗑️  Deleting Scores...');
    const deletedScores = await prisma.score.deleteMany({});
    console.log(`   ✅ Deleted ${deletedScores.count} scores`);

    console.log('🗑️  Deleting Question Views...');
    const deletedViews = await prisma.questionView.deleteMany({});
    console.log(`   ✅ Deleted ${deletedViews.count} question views`);

    console.log('🗑️  Deleting Answers...');
    const deletedAnswers = await prisma.answer.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAnswers.count} answers`);

    console.log('🗑️  Deleting Practice Sessions...');
    const deletedSessions = await prisma.practiceSession.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSessions.count} practice sessions`);

    console.log('🗑️  Deleting Payments...');
    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPayments.count} payments`);

    console.log('🗑️  Deleting Anonymous Sessions...');
    const deletedAnonymous = await prisma.anonymousSession.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAnonymous.count} anonymous sessions`);

    if (!keepNewsletters) {
      console.log('🗑️  Deleting Newsletter Subscriptions...');
      const deletedNewsletters = await prisma.newsletterSubscription.deleteMany({});
      console.log(`   ✅ Deleted ${deletedNewsletters.count} newsletter subscriptions`);
    } else {
      console.log('📧 Keeping Newsletter Subscriptions (as requested)');
    }

    console.log('🗑️  Deleting Users...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`   ✅ Deleted ${deletedUsers.count} users`);

    console.log('\n✨ Database cleanup completed successfully!\n');

    return {
      events: deletedEvents.count,
      scores: deletedScores.count,
      views: deletedViews.count,
      answers: deletedAnswers.count,
      sessions: deletedSessions.count,
      payments: deletedPayments.count,
      anonymousSessions: deletedAnonymous.count,
      newsletters: keepNewsletters ? 0 : await prisma.newsletterSubscription.count(),
      users: deletedUsers.count,
    };
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    throw error;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   DATABASE CLEANUP - PRODUCTION READY SCRIPT   ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    // Show current stats
    const statsBefore = await getDatabaseStats();

    // Check if database is already clean
    const totalRecords =
      statsBefore.users + statsBefore.practiceSessions + statsBefore.answers + statsBefore.scores;

    if (totalRecords === 0) {
      console.log('\n✨ Database is already clean! Nothing to delete.');
      rl.close();
      process.exit(0);
    }

    console.log('\n⚠️  WARNING: This will DELETE ALL the data above (except Questions)!');
    console.log('   This action CANNOT be undone!\n');

    // Ask for confirmation
    const confirm1 = await question('Are you sure you want to proceed? (type "yes" to confirm): ');

    if (confirm1.toLowerCase() !== 'yes') {
      console.log('\n❌ Cleanup cancelled.');
      rl.close();
      process.exit(0);
    }

    // Ask about newsletters
    const keepNewsletters = await question(
      '\nDo you want to KEEP newsletter subscriptions? (yes/no): '
    );
    const shouldKeepNewsletters = keepNewsletters.toLowerCase() === 'yes';

    // Final confirmation
    const confirm2 = await question('\n🔴 FINAL CONFIRMATION: Type "DELETE ALL" to proceed: ');

    if (confirm2 !== 'DELETE ALL') {
      console.log('\n❌ Cleanup cancelled. (You must type "DELETE ALL" exactly)');
      rl.close();
      process.exit(0);
    }

    console.log('\n⏳ Processing cleanup...');

    // Perform cleanup
    const results = await cleanDatabase(shouldKeepNewsletters);

    // Show results
    console.log('📊 Cleanup Summary:');
    console.log(`   Events deleted:               ${results.events}`);
    console.log(`   Scores deleted:               ${results.scores}`);
    console.log(`   Question Views deleted:       ${results.views}`);
    console.log(`   Answers deleted:              ${results.answers}`);
    console.log(`   Practice Sessions deleted:    ${results.sessions}`);
    console.log(`   Payments deleted:             ${results.payments}`);
    console.log(`   Anonymous Sessions deleted:   ${results.anonymousSessions}`);
    console.log(`   Newsletter Subs deleted:      ${results.newsletters}`);
    console.log(`   Users deleted:                ${results.users}`);

    // Show final stats
    console.log('\n📊 Database After Cleanup:\n');
    await getDatabaseStats();

    console.log('\n🎉 Your database is now production-ready!');
    console.log('   All test data has been removed.');
    console.log(`   ${statsBefore.questions} interview questions remain intact.\n`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run the script
main();
