require('dotenv').config({ path: './.env' });
const { prisma } = require('./src/config/database');

async function resetAnonymousSessions() {
  try {
    console.log('🗑️  Deleting all anonymous sessions...');

    const result = await prisma.anonymousSession.deleteMany({});

    console.log(`✅ Deleted ${result.count} anonymous session(s)`);
    console.log('🎉 Anonymous sessions reset complete!');
    console.log('\n💡 You can now test the 3-question limit as a fresh anonymous user.');
  } catch (error) {
    console.error('❌ Error resetting anonymous sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAnonymousSessions();
