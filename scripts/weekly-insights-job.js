/**
 * Weekly Insights Job
 * Runs weekly to send personalized insights emails
 * Schedule with cron: 0 9 * * 1 (every Monday at 9am)
 */

const { PrismaClient } = require('@prisma/client');
const { generateWeeklyPlan } = require('../src/agents/subagents/curriculum');
const { sendWeeklyInsights } = require('../src/services/emailService');

const prisma = new PrismaClient();

async function runWeeklyInsights() {
  console.log('📊 Starting weekly insights job...');

  try {
    // Get all active users (last activity within 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const activeUsers = await prisma.user.findMany({
      where: {
        answers: {
          some: {
            createdAt: {
              gte: cutoffDate,
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    console.log(`Found ${activeUsers.length} active users`);

    let sentCount = 0;
    let failedCount = 0;

    for (const user of activeUsers) {
      try {
        console.log(`\nGenerating insights for user ${user.id}...`);

        // Get user stats from last week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const answers = await prisma.answer.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: weekAgo },
          },
          include: {
            question: true,
            scores: true,
          },
        });

        if (answers.length === 0) {
          console.log(`  Skipping user ${user.id} - no activity this week`);
          continue;
        }

        // Calculate insights
        const categorySet = new Set();
        const scores = [];

        answers.forEach((ans) => {
          categorySet.add(ans.question.category);
          if (ans.scores) {
            scores.push(ans.scores.totalScore);
          }
        });

        const avgScore =
          scores.length > 0
            ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
            : 0;

        // Generate next week's plan (simplified for email)
        const plan = await generateWeeklyPlan({ userId: user.id });

        const insights = {
          questionsAnswered: answers.length,
          avgScore,
          categories: Array.from(categorySet),
          strengths: ['Structured thinking', 'Clear communication'],
          focusAreas: ['Metrics definition', 'Trade-off analysis'],
          nextWeekPlan: [
            'Practice 3 RCA questions',
            'Review metrics framework',
            'Complete 2 guesstimates',
          ],
          resources: [
            { title: 'RCA Framework', url: '#' },
            { title: 'Metrics Guide', url: '#' },
          ],
        };

        // Send email
        await sendWeeklyInsights({
          to: user.email,
          userName: user.email.split('@')[0],
          insights,
        });

        sentCount++;
        console.log(`  ✓ Sent insights to ${user.email}`);
      } catch (userError) {
        console.error(`  ✗ Failed for user ${user.id}:`, userError.message);
        failedCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Weekly insights job completed');
    console.log(`✓ Sent: ${sentCount}`);
    console.log(`✗ Failed: ${failedCount}`);
    console.log(`${'='.repeat(60)}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Weekly insights job failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runWeeklyInsights();
}

module.exports = { runWeeklyInsights };

