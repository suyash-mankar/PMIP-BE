const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DEMO_USER = {
  email: 'demo@pmpractice.com',
  password: 'Demo123456!',
};

const PM_QUESTIONS = [
  {
    text: 'Design a feature for a fitness app that helps users stay motivated to exercise regularly.',
    category: 'product_design',
    level: 'junior',
    difficulty: 4,
    tags: JSON.stringify(['fitness', 'motivation', 'mobile']),
  },
  {
    text: 'How would you improve the user experience of an e-commerce checkout process?',
    category: 'product_design',
    level: 'junior',
    difficulty: 3,
    tags: JSON.stringify(['e-commerce', 'checkout', 'ux']),
  },
  {
    text: 'Design a product that helps remote teams collaborate more effectively.',
    category: 'product_design',
    level: 'mid',
    difficulty: 6,
    tags: JSON.stringify(['remote', 'collaboration', 'saas']),
  },
  {
    text: 'Facebook has noticed a decline in daily active users among teenagers. How would you investigate and address this?',
    category: 'strategy',
    level: 'mid',
    difficulty: 7,
    tags: JSON.stringify(['social-media', 'retention', 'analytics']),
  },
  {
    text: 'Design a ride-sharing app for pets.',
    category: 'product_design',
    level: 'mid',
    difficulty: 5,
    tags: JSON.stringify(['marketplace', 'pets', 'transportation']),
  },
  {
    text: 'How would you prioritize features for the next quarter when you have limited engineering resources?',
    category: 'execution',
    level: 'senior',
    difficulty: 8,
    tags: JSON.stringify(['prioritization', 'resources', 'roadmap']),
  },
  {
    text: 'Design a dashboard for a B2B SaaS product that helps managers track team productivity.',
    category: 'product_design',
    level: 'senior',
    difficulty: 7,
    tags: JSON.stringify(['b2b', 'analytics', 'dashboard']),
  },
  {
    text: "Imagine you're the PM for Google Maps. What metrics would you track to measure success?",
    category: 'strategy',
    level: 'senior',
    difficulty: 8,
    tags: JSON.stringify(['metrics', 'maps', 'success-metrics']),
  },
  {
    text: 'Tell me about a time when you had to make a difficult product decision with incomplete information.',
    category: 'behavioral',
    level: 'mid',
    difficulty: 5,
    tags: JSON.stringify(['decision-making', 'ambiguity', 'leadership']),
  },
  {
    text: 'How would you design a feature to help users discover new content they might like on a music streaming platform?',
    category: 'product_design',
    level: 'junior',
    difficulty: 4,
    tags: JSON.stringify(['discovery', 'music', 'recommendation']),
  },
];

async function main() {
  console.log('🌱 Starting seed...');

  try {
    // Create demo user
    const hashedPassword = await bcrypt.hash(DEMO_USER.password, 10);

    const user = await prisma.user.upsert({
      where: { email: DEMO_USER.email },
      update: {},
      create: {
        email: DEMO_USER.email,
        password: hashedPassword,
        role: 'admin', // Make demo user an admin
      },
    });

    console.log(`✅ Created demo user: ${user.email}`);

    // Create questions
    for (const question of PM_QUESTIONS) {
      await prisma.question.create({
        data: question,
      });
    }

    console.log(`✅ Created ${PM_QUESTIONS.length} PM questions`);

    console.log('🎉 Seed completed successfully!');
    console.log('\nDemo credentials:');
    console.log(`Email: ${DEMO_USER.email}`);
    console.log(`Password: ${DEMO_USER.password}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
