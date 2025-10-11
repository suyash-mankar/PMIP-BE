const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupCategories() {
  try {
    console.log('🔍 Checking current categories...\n');
    
    // Get current category distribution
    const categories = await prisma.question.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    console.log('Current categories:');
    categories.forEach(cat => {
      console.log(`- ${cat.category}: ${cat._count.id} questions`);
    });

    // Define categories to remove
    const categoriesToRemove = [
      'project_management',
      'customer_interaction', 
      'machine_learning'
    ];

    console.log(`\n🗑️  Removing unwanted categories: ${categoriesToRemove.join(', ')}`);

    // Delete questions from unwanted categories
    for (const category of categoriesToRemove) {
      const deleteResult = await prisma.question.deleteMany({
        where: {
          category: category
        }
      });
      console.log(`- Deleted ${deleteResult.count} questions from ${category}`);
    }

    // Show final category distribution
    console.log('\n✅ Final categories:');
    const finalCategories = await prisma.question.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    finalCategories.forEach(cat => {
      console.log(`- ${cat.category}: ${cat._count.id} questions`);
    });

    console.log(`\n🎯 Total questions remaining: ${finalCategories.reduce((sum, cat) => sum + cat._count.id, 0)}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupCategories();
