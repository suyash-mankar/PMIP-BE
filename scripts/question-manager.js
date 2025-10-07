const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const CATEGORIES = {
  1: 'product_design',
  2: 'product_strategy',
  3: 'metrics',
  4: 'product_improvement',
  5: 'root_cause_analysis',
  6: 'guesstimates',
};

const LEVELS = {
  1: 'junior',
  2: 'mid',
  3: 'senior',
};

const COMPANIES = {
  Google: 'senior',
  'Meta (Facebook)': 'senior',
  Amazon: 'senior',
  Microsoft: 'senior',
  Apple: 'senior',
  Netflix: 'senior',
  Uber: 'mid',
  DoorDash: 'mid',
  Spotify: 'mid',
  Airbnb: 'mid',
  Stripe: 'senior',
  Coinbase: 'senior',
  LinkedIn: 'senior',
  Pinterest: 'mid',
  Snapchat: 'mid',
  TikTok: 'mid',
  Shopify: 'mid',
  Slack: 'mid',
  Zoom: 'mid',
  Dropbox: 'mid',
  YouTube: 'senior',
  Instagram: 'senior',
  WhatsApp: 'senior',
  Twitter: 'senior',
  Gmail: 'senior',
  'Capital One': 'mid',
  PayPal: 'senior',
  Tesla: 'senior',
  Nvidia: 'senior',
  Adobe: 'senior',
  Salesforce: 'senior',
  Oracle: 'senior',
  IBM: 'senior',
  Intel: 'senior',
  AMD: 'senior',
};

async function questionManager() {
  console.log('🎯 PM Interview Question Manager');
  console.log('================================\n');

  while (true) {
    console.log('Options:');
    console.log('1. View question statistics');
    console.log('2. Add new question manually');
    console.log('3. Add questions from file');
    console.log('4. Search questions');
    console.log('5. Update question');
    console.log('6. Delete question');
    console.log('7. Export questions');
    console.log('8. Exit\n');

    const choice = await askQuestion('Choose an option (1-8): ');

    switch (choice) {
      case '1':
        await showStatistics();
        break;
      case '2':
        await addQuestionManually();
        break;
      case '3':
        await addQuestionsFromFile();
        break;
      case '4':
        await searchQuestions();
        break;
      case '5':
        await updateQuestion();
        break;
      case '6':
        await deleteQuestion();
        break;
      case '7':
        await exportQuestions();
        break;
      case '8':
        console.log('👋 Goodbye!');
        await prisma.$disconnect();
        process.exit(0);
      default:
        console.log('❌ Invalid option. Please try again.\n');
    }
  }
}

async function showStatistics() {
  console.log('\n📊 Question Database Statistics');
  console.log('===============================\n');

  const total = await prisma.question.count();
  const byCategory = await prisma.question.groupBy({
    by: ['category'],
    _count: { id: true },
  });
  const bySource = await prisma.question.groupBy({
    by: ['source'],
    _count: { id: true },
  });
  const byLevel = await prisma.question.groupBy({
    by: ['level'],
    _count: { id: true },
  });

  console.log(`Total Questions: ${total}\n`);

  console.log('By Category:');
  byCategory.forEach(cat => {
    console.log(`  ${cat.category}: ${cat._count.id} questions`);
  });

  console.log('\nBy Source:');
  bySource.forEach(src => {
    console.log(`  ${src.source}: ${src._count.id} questions`);
  });

  console.log('\nBy Level:');
  byLevel.forEach(level => {
    console.log(`  ${level.level}: ${level._count.id} questions`);
  });

  // Show recent questions
  const recentQuestions = await prisma.question.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { text: true, category: true, source: true, createdAt: true },
  });

  console.log('\nRecent Questions:');
  recentQuestions.forEach((q, i) => {
    console.log(`  ${i + 1}. [${q.category}] ${q.text.substring(0, 60)}... (${q.source})`);
  });

  console.log('\n');
}

async function addQuestionManually() {
  console.log('\n➕ Add New Question Manually');
  console.log('=============================\n');

  const text = await askQuestion('Question text: ');
  if (!text.trim()) {
    console.log('❌ Question text cannot be empty.\n');
    return;
  }

  console.log('\nCategories:');
  console.log('1. Product Design');
  console.log('2. Product Strategy');
  console.log('3. Metrics');
  console.log('4. Product Improvement');
  console.log('5. Root Cause Analysis');
  console.log('6. Guesstimates');

  const categoryChoice = await askQuestion('Choose category (1-6): ');
  const category = CATEGORIES[categoryChoice];
  if (!category) {
    console.log('❌ Invalid category choice.\n');
    return;
  }

  console.log('\nLevels:');
  console.log('1. Junior');
  console.log('2. Mid');
  console.log('3. Senior');

  const levelChoice = await askQuestion('Choose level (1-3): ');
  const level = LEVELS[levelChoice];
  if (!level) {
    console.log('❌ Invalid level choice.\n');
    return;
  }

  const company = await askQuestion('Company (optional, press Enter to skip): ');
  const tags = await askQuestion('Tags (comma-separated, optional): ');
  const source =
    (await askQuestion('Source (curated/exponent/user_generated, default: curated): ')) ||
    'curated';

  const difficulty = level === 'senior' ? 8 : level === 'mid' ? 6 : 4;

  try {
    const question = await prisma.question.create({
      data: {
        text: text.trim(),
        category: category,
        level: level,
        difficulty: difficulty,
        tags: tags ? JSON.stringify(tags.split(',').map(t => t.trim())) : null,
        source: source,
        company: company.trim() || null,
      },
    });

    console.log(`\n✅ Question added successfully! ID: ${question.id}\n`);
  } catch (error) {
    console.log(`❌ Error adding question: ${error.message}\n`);
  }
}

async function addQuestionsFromFile() {
  console.log('\n📁 Add Questions from File');
  console.log('===========================\n');

  const fs = require('fs');
  const path = await askQuestion('File path (JSON format): ');

  try {
    if (!fs.existsSync(path)) {
      console.log('❌ File not found.\n');
      return;
    }

    const fileContent = fs.readFileSync(path, 'utf8');
    const questions = JSON.parse(fileContent);

    if (!Array.isArray(questions)) {
      console.log('❌ File must contain an array of questions.\n');
      return;
    }

    let added = 0;
    for (const q of questions) {
      try {
        await prisma.question.create({
          data: {
            text: q.text,
            category: q.category,
            level: q.level,
            difficulty: q.difficulty || 5,
            tags: q.tags ? JSON.stringify(q.tags) : null,
            source: q.source || 'curated',
            company: q.company || null,
          },
        });
        added++;
      } catch (error) {
        console.log(`⚠️  Skipped question: ${error.message}`);
      }
    }

    console.log(`\n✅ Added ${added} questions from file.\n`);
  } catch (error) {
    console.log(`❌ Error processing file: ${error.message}\n`);
  }
}

async function searchQuestions() {
  console.log('\n🔍 Search Questions');
  console.log('===================\n');

  const searchTerm = await askQuestion('Search term: ');
  const category = await askQuestion('Category filter (optional): ');

  try {
    const whereClause = {
      text: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    };

    if (category) {
      whereClause.category = category;
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, text: true, category: true, level: true, company: true, source: true },
    });

    if (questions.length === 0) {
      console.log('❌ No questions found.\n');
      return;
    }

    console.log(`\nFound ${questions.length} questions:\n`);
    questions.forEach((q, i) => {
      console.log(`${i + 1}. [${q.category}] [${q.level}] [${q.company || 'Unknown'}]`);
      console.log(`   ${q.text}`);
      console.log(`   ID: ${q.id} | Source: ${q.source}\n`);
    });
  } catch (error) {
    console.log(`❌ Error searching questions: ${error.message}\n`);
  }
}

async function updateQuestion() {
  console.log('\n✏️  Update Question');
  console.log('===================\n');

  const id = await askQuestion('Question ID to update: ');

  try {
    const question = await prisma.question.findUnique({
      where: { id: parseInt(id) },
    });

    if (!question) {
      console.log('❌ Question not found.\n');
      return;
    }

    console.log(`\nCurrent question: ${question.text}\n`);

    const newText = await askQuestion('New text (press Enter to keep current): ');
    const newCategory = await askQuestion('New category (press Enter to keep current): ');
    const newLevel = await askQuestion('New level (press Enter to keep current): ');
    const newCompany = await askQuestion('New company (press Enter to keep current): ');

    const updateData = {};
    if (newText) updateData.text = newText;
    if (newCategory) updateData.category = newCategory;
    if (newLevel) updateData.level = newLevel;
    if (newCompany) updateData.company = newCompany;

    if (Object.keys(updateData).length === 0) {
      console.log('❌ No changes made.\n');
      return;
    }

    await prisma.question.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    console.log('✅ Question updated successfully!\n');
  } catch (error) {
    console.log(`❌ Error updating question: ${error.message}\n`);
  }
}

async function deleteQuestion() {
  console.log('\n🗑️  Delete Question');
  console.log('===================\n');

  const id = await askQuestion('Question ID to delete: ');

  try {
    const question = await prisma.question.findUnique({
      where: { id: parseInt(id) },
    });

    if (!question) {
      console.log('❌ Question not found.\n');
      return;
    }

    console.log(`\nQuestion to delete: ${question.text}\n`);
    const confirm = await askQuestion('Are you sure? (yes/no): ');

    if (confirm.toLowerCase() === 'yes') {
      await prisma.question.delete({
        where: { id: parseInt(id) },
      });
      console.log('✅ Question deleted successfully!\n');
    } else {
      console.log('❌ Deletion cancelled.\n');
    }
  } catch (error) {
    console.log(`❌ Error deleting question: ${error.message}\n`);
  }
}

async function exportQuestions() {
  console.log('\n📤 Export Questions');
  console.log('====================\n');

  const category = await askQuestion('Category to export (press Enter for all): ');
  const source = await askQuestion('Source to export (press Enter for all): ');

  try {
    const whereClause = {};
    if (category) whereClause.category = category;
    if (source) whereClause.source = source;

    const questions = await prisma.question.findMany({
      where: whereClause,
      select: {
        text: true,
        category: true,
        level: true,
        difficulty: true,
        tags: true,
        source: true,
        company: true,
      },
    });

    const fs = require('fs');
    const filename = `questions_export_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(questions, null, 2));

    console.log(`\n✅ Exported ${questions.length} questions to ${filename}\n`);
  } catch (error) {
    console.log(`❌ Error exporting questions: ${error.message}\n`);
  }
}

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

// Run if called directly
if (require.main === module) {
  questionManager().catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
}

module.exports = { questionManager };
