/**
 * Email Service
 * Handles transactional and scheduled emails
 * NOTE: Configure your email provider (SendGrid, Resend, etc.) and update this service
 */

/**
 * Send weekly insights email to user
 */
async function sendWeeklyInsights({ userId, email, insights }) {
  console.log(`📧 Sending weekly insights to ${email} (User ${userId})`);

  // TODO: Integrate with your email provider (SendGrid, Resend, etc.)
  // Example structure:
  
  const emailContent = `
# Your Weekly PM Practice Insights

Hi there! Here's your weekly progress summary:

## 📊 This Week's Stats
- Questions attempted: ${insights.questionsAttempted}
- Average score: ${insights.averageScore}/10
- Best category: ${insights.bestCategory}
- Focus area: ${insights.weakestCategory}

## 🎯 Next Week's Plan
${insights.weeklyPlan.map((item, i) => `${i + 1}. ${item}`).join('\n')}

## 📚 Recommended Readings
${insights.readings.map(r => `- ${r.title} (${r.category})`).join('\n')}

## 💡 Key Improvement Areas
${insights.improvementAreas.join('\n')}

Keep practicing! You're making great progress.

---
PM Interview Practice Platform
  `;

  // Placeholder - implement with your email provider
  console.log('Email content:', emailContent);

  return {
    success: true,
    message: 'Email queued (implement email provider integration)',
  };
}

/**
 * Send daily job recommendations
 */
async function sendDailyJobRecommendations({ userId, email, jobs }) {
  console.log(`📧 Sending job recommendations to ${email} (User ${userId})`);

  const emailContent = `
# Today's Top Job Matches for You

Based on your resume and profile, here are today's best PM opportunities:

${jobs.map((job, i) => `
## ${i + 1}. ${job.title} at ${job.company}
📍 ${job.location}
🔗 Apply: ${job.url}
Match score: ${Math.round(job.score * 100)}%

${job.rationale}

**Practice prep:** ${job.practiceSet}
`).join('\n---\n')}

Good luck with your applications!

---
PM Interview Practice Platform
  `;

  console.log('Email content:', emailContent);

  return {
    success: true,
    message: 'Email queued (implement email provider integration)',
  };
}

module.exports = {
  sendWeeklyInsights,
  sendDailyJobRecommendations,
};
