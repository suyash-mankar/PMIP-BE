require('dotenv').config({ path: './.env' });
const { Client } = require('pg');

const url = process.env.DATABASE_URL;

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function checkAnonymousUsers() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const result = await client.query(`
      SELECT 
        id,
        fingerprint,
        "ipAddress",
        "questionCount",
        "lastQuestionDate",
        "createdAt",
        "updatedAt"
      FROM "AnonymousSession"
      ORDER BY "updatedAt" DESC
    `);

    console.log('📊 ANONYMOUS SESSIONS:\n');
    console.log(`Total anonymous users: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('No anonymous sessions found.');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`─────────────────────────────────────────────────────────`);
        console.log(`User #${index + 1}`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Fingerprint: ${row.fingerprint.substring(0, 20)}...`);
        console.log(`  IP Address: ${row.ipAddress}`);
        console.log(`  Questions Done: ${row.questionCount} / 3`);
        console.log(`  Last Activity: ${row.lastQuestionDate || 'Never'}`);
        console.log(`  First Seen: ${row.createdAt}`);
        console.log(`  Last Updated: ${row.updatedAt}`);
      });
      console.log(`─────────────────────────────────────────────────────────\n`);

      const totalQuestions = result.rows.reduce((sum, row) => sum + row.questionCount, 0);
      const avgQuestions = (totalQuestions / result.rows.length).toFixed(2);
      const maxedOut = result.rows.filter(row => row.questionCount >= 3).length;

      console.log('📈 SUMMARY STATISTICS:');
      console.log(`  Total Questions Answered: ${totalQuestions}`);
      console.log(`  Average per User: ${avgQuestions}`);
      console.log(`  Users at Limit (3/3): ${maxedOut}`);
      console.log(`  Conversion Opportunities: ${maxedOut} users ready to upgrade!`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAnonymousUsers();
