require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');

async function resetSessions() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('🗑️  Deleting all anonymous sessions...');
    console.log(
      'Using URL:',
      process.env.DATABASE_URL.replace(/:\/\/(.*?):.*?@/, '://*****:****@')
    );

    const result = await prisma.anonymousSession.deleteMany({});

    console.log(`✅ Deleted ${result.count} anonymous session(s)`);
    console.log('🎉 Reset complete! You can now test with fresh data.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetSessions();
