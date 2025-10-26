const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapping from incorrect names to correct names
const CATEGORY_FIXES = {
  product_design: 'Product Design',
  metrics: 'Metrics',
  guesstimates: 'Guesstimates',
  product_improvement: 'Product Improvement',
  product_strategy: 'Product Strategy',
  root_cause_analysis: 'RCA',
};

async function fixCategoryNames() {
  console.log('🔧 Starting category name standardization...\n');

  try {
    for (const [oldName, newName] of Object.entries(CATEGORY_FIXES)) {
      // Count questions with old name
      const count = await prisma.question.count({
        where: { category: oldName },
      });

      if (count > 0) {
        console.log(`📝 Updating ${count} questions from "${oldName}" to "${newName}"...`);

        // Update all questions with this category
        const result = await prisma.question.updateMany({
          where: { category: oldName },
          data: { category: newName },
        });

        console.log(`✅ Updated ${result.count} questions\n`);
      } else {
        console.log(`⏭️  No questions found with category "${oldName}"\n`);
      }
    }

    // Show final category distribution
    console.log('='.repeat(60));
    console.log('📊 Final Category Distribution:\n');

    const categories = await prisma.question.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    categories.forEach(cat => {
      console.log(`   ${cat.category}: ${cat._count.id} questions`);
    });

    console.log('='.repeat(60));
    console.log('\n✅ Category standardization complete!\n');
  } catch (error) {
    console.error('❌ Error fixing categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fixCategoryNames()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { fixCategoryNames };
