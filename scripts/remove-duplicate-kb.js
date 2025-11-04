/**
 * Remove duplicate KnowledgeDoc entries
 * Keeps the first occurrence (lowest ID) and deletes duplicates
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeDuplicates() {
  console.log('🔍 Finding duplicate KnowledgeDoc entries...\n');

  try {
    // Get all KB docs
    const allDocs = await prisma.knowledgeDoc.findMany({
      orderBy: { id: 'asc' }, // Order by ID to keep the first one
      select: {
        id: true,
        title: true,
        source: true,
      },
    });

    console.log(`📊 Total documents: ${allDocs.length}`);

    // Find duplicates by title (most reliable identifier)
    const seen = new Map();
    const duplicatesToDelete = [];

    for (const doc of allDocs) {
      const titleKey = doc.title.trim().toLowerCase();
      
      if (seen.has(titleKey)) {
        // This is a duplicate
        const originalId = seen.get(titleKey);
        duplicatesToDelete.push({
          id: doc.id,
          title: doc.title,
          originalId: originalId,
        });
      } else {
        // First occurrence - keep it
        seen.set(titleKey, doc.id);
      }
    }

    console.log(`\n🔍 Found ${duplicatesToDelete.length} duplicates\n`);

    if (duplicatesToDelete.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    // Show first 10 duplicates
    console.log('📋 First 10 duplicates to be removed:');
    duplicatesToDelete.slice(0, 10).forEach((dup, idx) => {
      console.log(`  ${idx + 1}. ID ${dup.id}: "${dup.title.substring(0, 60)}..." (duplicate of ID ${dup.originalId})`);
    });

    if (duplicatesToDelete.length > 10) {
      console.log(`  ... and ${duplicatesToDelete.length - 10} more\n`);
    }

    // Delete duplicates
    console.log('\n🗑️  Removing duplicates...\n');
    
    let deleted = 0;
    for (const dup of duplicatesToDelete) {
      try {
        await prisma.knowledgeDoc.delete({
          where: { id: dup.id },
        });
        deleted++;
        if (deleted % 10 === 0) {
          console.log(`  ✓ Deleted ${deleted}/${duplicatesToDelete.length}...`);
        }
      } catch (err) {
        console.error(`  ❌ Error deleting ID ${dup.id}: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Duplicate removal completed!');
    console.log(`📊 Duplicates removed: ${deleted}`);
    console.log(`📚 Remaining documents: ${allDocs.length - deleted}`);
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  removeDuplicates()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed:', error);
      process.exit(1);
    });
}

module.exports = { removeDuplicates };

