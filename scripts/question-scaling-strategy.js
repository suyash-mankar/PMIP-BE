const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Target question distribution for US PM market launch
const TARGET_DISTRIBUTION = {
  // Phase 1: MVP Launch (200 questions)
  phase1: {
    total: 200,
    categories: {
      product_design: 40, // 20%
      product_strategy: 40, // 20%
      metrics: 32, // 16%
      product_improvement: 32, // 16%
      root_cause_analysis: 28, // 14%
      guesstimates: 28, // 14%
    },
    levels: {
      junior: 60, // 30%
      mid: 100, // 50%
      senior: 40, // 20%
    },
    companies: {
      faang: 80, // 40%
      unicorns: 70, // 35%
      enterprise: 50, // 25%
    },
  },

  // Phase 2: Scale Up (500 questions)
  phase2: {
    total: 500,
    categories: {
      product_design: 100, // 20%
      product_strategy: 100, // 20%
      metrics: 80, // 16%
      product_improvement: 80, // 16%
      root_cause_analysis: 70, // 14%
      guesstimates: 70, // 14%
    },
    levels: {
      junior: 150, // 30%
      mid: 250, // 50%
      senior: 100, // 20%
    },
    companies: {
      faang: 200, // 40%
      unicorns: 175, // 35%
      enterprise: 125, // 25%
    },
  },

  // Phase 3: Market Leader (1000 questions)
  phase3: {
    total: 1000,
    categories: {
      product_design: 200, // 20%
      product_strategy: 200, // 20%
      metrics: 150, // 15%
      product_improvement: 150, // 15%
      root_cause_analysis: 150, // 15%
      guesstimates: 150, // 15%
    },
    levels: {
      junior: 300, // 30%
      mid: 500, // 50%
      senior: 200, // 20%
    },
    companies: {
      faang: 400, // 40%
      unicorns: 350, // 35%
      enterprise: 250, // 25%
    },
  },
};

// Company categorization
const COMPANY_CATEGORIES = {
  faang: ['Google', 'Meta (Facebook)', 'Amazon', 'Apple', 'Netflix', 'Microsoft'],
  unicorns: [
    'Uber',
    'DoorDash',
    'Airbnb',
    'Stripe',
    'Coinbase',
    'Pinterest',
    'Snapchat',
    'TikTok',
    'Shopify',
    'Slack',
    'Zoom',
    'Dropbox',
  ],
  enterprise: [
    'Oracle',
    'IBM',
    'Salesforce',
    'Adobe',
    'PayPal',
    'LinkedIn',
    'Twitter',
    'YouTube',
    'Instagram',
    'WhatsApp',
  ],
};

async function analyzeCurrentDatabase() {
  console.log('📊 Current Question Database Analysis');
  console.log('=====================================\n');

  const total = await prisma.question.count();
  const byCategory = await prisma.question.groupBy({
    by: ['category'],
    _count: { id: true },
  });
  const byLevel = await prisma.question.groupBy({
    by: ['level'],
    _count: { id: true },
  });
  const bySource = await prisma.question.groupBy({
    by: ['source'],
    _count: { id: true },
  });

  console.log(`Current Total: ${total} questions\n`);

  console.log('Current Distribution by Category:');
  byCategory.forEach(cat => {
    const percentage = ((cat._count.id / total) * 100).toFixed(1);
    console.log(`  ${cat.category}: ${cat._count.id} questions (${percentage}%)`);
  });

  console.log('\nCurrent Distribution by Level:');
  byLevel.forEach(level => {
    const percentage = ((level._count.id / total) * 100).toFixed(1);
    console.log(`  ${level.level}: ${level._count.id} questions (${percentage}%)`);
  });

  console.log('\nCurrent Distribution by Source:');
  bySource.forEach(src => {
    const percentage = ((src._count.id / total) * 100).toFixed(1);
    console.log(`  ${src.source}: ${src._count.id} questions (${percentage}%)`);
  });
}

async function generateScalingPlan() {
  console.log('\n🚀 Question Scaling Plan for US PM Market Launch');
  console.log('================================================\n');

  const currentTotal = await prisma.question.count();

  // Phase 1: MVP Launch
  console.log('📋 PHASE 1: MVP Launch (200 questions total)');
  console.log('Target: Launch with solid foundation\n');

  const phase1Gap = TARGET_DISTRIBUTION.phase1.total - currentTotal;
  console.log(`Current: ${currentTotal} questions`);
  console.log(`Target: ${TARGET_DISTRIBUTION.phase1.total} questions`);
  console.log(`Gap to fill: ${phase1Gap} questions\n`);

  console.log('Category targets:');
  for (const [cat, target] of Object.entries(TARGET_DISTRIBUTION.phase1.categories)) {
    const current = await prisma.question.count({ where: { category: cat } });
    const gap = Math.max(0, target - current);
    console.log(`  ${cat}: ${current} → ${target} (need ${gap} more)`);
  }

  console.log('\n📋 PHASE 2: Scale Up (500 questions total)');
  console.log('Target: Comprehensive coverage\n');

  const phase2Gap = TARGET_DISTRIBUTION.phase2.total - currentTotal;
  console.log(`Gap to fill: ${phase2Gap} questions\n`);

  console.log('📋 PHASE 3: Market Leader (1000 questions total)');
  console.log('Target: Become the go-to PM interview prep platform\n');

  const phase3Gap = TARGET_DISTRIBUTION.phase3.total - currentTotal;
  console.log(`Gap to fill: ${phase3Gap} questions\n`);
}

async function generateActionPlan() {
  console.log('\n📝 Action Plan for Scaling Questions');
  console.log('=====================================\n');

  console.log('🎯 IMMEDIATE ACTIONS (Next 2-3 weeks):');
  console.log('1. Continue Exponent scraping (target: 150+ more questions)');
  console.log('2. Add Glassdoor PM interview questions');
  console.log('3. Add LeetCode PM questions');
  console.log('4. Curate and improve existing questions');
  console.log('5. Add company-specific question sets\n');

  console.log('🎯 SHORT-TERM (1-2 months):');
  console.log('1. Partner with PM communities (PMHQ, Product School)');
  console.log('2. Add user-generated questions with moderation');
  console.log('3. Create industry-specific question sets');
  console.log('4. Add behavioral and system design questions\n');

  console.log('🎯 LONG-TERM (3-6 months):');
  console.log('1. AI-generated question variations');
  console.log('2. Real-time question updates from job postings');
  console.log('3. Partner with companies for authentic questions');
  console.log('4. Advanced question types (case studies, role-plays)\n');

  console.log('📊 SOURCES TO TARGET:');
  console.log('• Exponent (already started): 500+ questions');
  console.log('• Glassdoor: 200+ questions');
  console.log('• LeetCode: 100+ questions');
  console.log('• Company career pages: 200+ questions');
  console.log('• PM communities: 100+ questions');
  console.log('• User submissions: 100+ questions');
  console.log('• AI generation: 200+ questions\n');
}

async function estimateMarketImpact() {
  console.log('\n📈 Market Impact Estimation');
  console.log('===========================\n');

  console.log('🎯 TARGET MARKET SIZE:');
  console.log('• Total PM roles in US: ~50,000 positions');
  console.log('• Aspiring PMs: ~500,000 people');
  console.log('• PM interview prep market: ~$100M annually\n');

  console.log('🚀 COMPETITIVE ADVANTAGE:');
  console.log('• Current competitors: 30-90 questions each');
  console.log('• Our target: 500-1000 questions');
  console.log('• Free access vs. paid platforms');
  console.log('• AI-powered scoring and feedback');
  console.log('• Real-time practice with conversation mode\n');

  console.log('📊 SUCCESS METRICS:');
  console.log('• User acquisition: 10,000+ users in first 6 months');
  console.log('• Question completion rate: 80%+');
  console.log('• User satisfaction: 4.5+ stars');
  console.log('• Market share: 20% of PM interview prep market\n');
}

async function main() {
  try {
    await analyzeCurrentDatabase();
    await generateScalingPlan();
    await generateActionPlan();
    await estimateMarketImpact();

    console.log('\n🎉 Ready to scale to serve every aspiring PM in the US!');
    console.log('Start with Phase 1 and iterate based on user feedback.\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeCurrentDatabase,
  generateScalingPlan,
  generateActionPlan,
  TARGET_DISTRIBUTION,
};
