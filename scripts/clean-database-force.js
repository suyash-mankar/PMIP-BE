/**
 * Database Cleanup Script - FORCE MODE (No Confirmation)
 *
 * Use this for automated deployment/CI/CD
 * Run regular clean-database.js for interactive mode
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup (FORCE MODE)...\n');

  try {
    // Delete in order respecting foreign key constraints
    console.log('Deleting Events...');
    await prisma.event.deleteMany({});

    console.log('Deleting Scores...');
    await prisma.score.deleteMany({});

    console.log('Deleting Question Views...');
    await prisma.questionView.deleteMany({});

    console.log('Deleting Answers...');
    await prisma.answer.deleteMany({});

    console.log('Deleting Practice Sessions...');
    await prisma.practiceSession.deleteMany({});

    console.log('Deleting Payments...');
    await prisma.payment.deleteMany({});

    console.log('Deleting Anonymous Sessions...');
    await prisma.anonymousSession.deleteMany({});

    console.log('Deleting Newsletter Subscriptions...');
    await prisma.newsletterSubscription.deleteMany({});

    console.log('Deleting Users...');
    await prisma.user.deleteMany({});

    console.log('\n✅ Database cleanup completed!\n');

    // Show final stats
    const questions = await prisma.question.count();
    console.log(`Questions remaining: ${questions} ✅\n`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
