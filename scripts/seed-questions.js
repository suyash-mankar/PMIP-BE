const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const questionCategories = {
  'Root Cause Analysis': [
    {
      text: "Our mobile app's daily active users have dropped by 30% in the last month. How would you investigate this issue and what steps would you take to identify the root cause?",
      difficulty: 7,
      tags: ['metrics', 'user-behavior', 'investigation', 'mobile'],
    },
    {
      text: 'Customer support tickets have increased by 200% in the past two weeks. Walk me through your approach to diagnosing this problem.',
      difficulty: 6,
      tags: ['customer-support', 'escalation', 'process', 'data-analysis'],
    },
    {
      text: 'Our checkout conversion rate dropped from 15% to 8% after a recent product update. How would you systematically identify what went wrong?',
      difficulty: 8,
      tags: ['conversion', 'funnel', 'e-commerce', 'ab-testing'],
    },
    {
      text: "User engagement time on our content platform has decreased by 40%. What's your framework for investigating this decline?",
      difficulty: 7,
      tags: ['engagement', 'content', 'user-retention', 'analytics'],
    },
  ],

  'Product Improvement': [
    {
      text: "Our social media app's user retention is poor - only 20% of users return after day 1. How would you improve this metric?",
      difficulty: 8,
      tags: ['retention', 'onboarding', 'user-experience', 'social'],
    },
    {
      text: 'Users are complaining that our e-commerce search is slow and inaccurate. Propose a solution to improve search functionality.',
      difficulty: 7,
      tags: ['search', 'performance', 'algorithms', 'e-commerce'],
    },
    {
      text: 'Our food delivery app has a 25% order cancellation rate. How would you reduce this and improve the user experience?',
      difficulty: 6,
      tags: ['cancellation', 'user-experience', 'logistics', 'mobile'],
    },
    {
      text: 'Users are abandoning our checkout process at a 60% rate. Design a solution to improve checkout completion.',
      difficulty: 7,
      tags: ['conversion', 'checkout', 'user-flow', 'optimization'],
    },
  ],

  'Product Design': [
    {
      text: 'Design a feature for a music streaming app that helps users discover new music based on their listening patterns.',
      difficulty: 7,
      tags: ['recommendations', 'algorithms', 'music', 'personalization'],
    },
    {
      text: 'How would you design a notification system for a fitness app that motivates users without being intrusive?',
      difficulty: 6,
      tags: ['notifications', 'motivation', 'fitness', 'user-behavior'],
    },
    {
      text: 'Design a feature for a job search platform that helps recruiters find better candidate matches.',
      difficulty: 8,
      tags: ['matching', 'recruiting', 'algorithms', 'b2b'],
    },
    {
      text: 'Create a feature for a travel booking app that helps users plan multi-city trips efficiently.',
      difficulty: 7,
      tags: ['travel', 'planning', 'complex-flows', 'booking'],
    },
  ],

  Metrics: [
    {
      text: 'How would you measure the success of a new social media feature? Define the key metrics and explain your reasoning.',
      difficulty: 7,
      tags: ['kpis', 'social-media', 'engagement', 'measurement'],
    },
    {
      text: 'For a subscription-based SaaS product, what metrics would you track to ensure healthy growth and retention?',
      difficulty: 8,
      tags: ['saas', 'subscription', 'retention', 'growth'],
    },
    {
      text: 'How would you measure the impact of a new recommendation algorithm on an e-commerce platform?',
      difficulty: 6,
      tags: ['recommendations', 'e-commerce', 'algorithms', 'conversion'],
    },
    {
      text: "Define success metrics for a mobile gaming app's new multiplayer feature.",
      difficulty: 7,
      tags: ['gaming', 'multiplayer', 'engagement', 'monetization'],
    },
  ],

  'Product Strategy': [
    {
      text: 'Should Netflix enter the gaming market? Analyze this strategic decision with pros, cons, and recommendations.',
      difficulty: 8,
      tags: ['strategy', 'market-entry', 'competition', 'streaming'],
    },
    {
      text: 'How would you approach launching a new product in a market dominated by an established competitor?',
      difficulty: 7,
      tags: ['market-entry', 'competition', 'differentiation', 'strategy'],
    },
    {
      text: 'A startup has limited resources. Should they focus on acquiring new users or retaining existing ones? Make a recommendation.',
      difficulty: 6,
      tags: ['resource-allocation', 'growth', 'retention', 'startup'],
    },
    {
      text: 'How would you decide whether to build a feature in-house or partner with a third-party vendor?',
      difficulty: 7,
      tags: ['build-vs-buy', 'partnerships', 'technical-debt', 'strategy'],
    },
  ],

  Guesstimates: [
    {
      text: 'How many people are using WhatsApp right now globally? Walk me through your estimation process.',
      difficulty: 8,
      tags: ['estimation', 'global-scale', 'messaging', 'calculations'],
    },
    {
      text: 'Estimate the number of Uber rides happening in New York City on a typical weekday morning.',
      difficulty: 7,
      tags: ['estimation', 'rideshare', 'urban', 'logistics'],
    },
    {
      text: 'How many iPhones are sold in India each month? Show your calculation approach.',
      difficulty: 6,
      tags: ['estimation', 'smartphones', 'india', 'market-size'],
    },
    {
      text: 'Estimate the daily revenue of a popular food delivery app like DoorDash in San Francisco.',
      difficulty: 8,
      tags: ['estimation', 'revenue', 'food-delivery', 'local-market'],
    },
  ],
};

async function seedQuestions() {
  console.log('🌱 Starting question seeding...');

  try {
    // Clear existing questions
    await prisma.question.deleteMany({});
    console.log('🗑️  Cleared existing questions');

    let totalQuestions = 0;

    // Seed questions for each category
    for (const [category, questions] of Object.entries(questionCategories)) {
      console.log(`📝 Seeding ${category} questions...`);

      for (const questionData of questions) {
        await prisma.question.create({
          data: {
            text: questionData.text,
            category: category.toLowerCase().replace(/\s+/g, '_'),
            level:
              questionData.difficulty >= 7
                ? 'senior'
                : questionData.difficulty >= 5
                ? 'mid'
                : 'junior',
            difficulty: questionData.difficulty,
            tags: JSON.stringify(questionData.tags),
          },
        });
        totalQuestions++;
      }
    }

    console.log(
      `✅ Successfully seeded ${totalQuestions} questions across ${
        Object.keys(questionCategories).length
      } categories`
    );

    // Display summary
    const categorySummary = await prisma.question.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    console.log('\n📊 Question distribution:');
    categorySummary.forEach(group => {
      console.log(`   ${group.category}: ${group._count.id} questions`);
    });
  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedQuestions()
    .then(() => {
      console.log('🎉 Question seeding completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Question seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedQuestions, questionCategories };
