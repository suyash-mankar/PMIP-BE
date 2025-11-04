/**
 * Resume Controller
 * Handles resume analysis, profiling, and personalized practice plan generation
 */

const { resumeProfileUpsert, resumeProfileGet } = require('../utils/vector');
const { prisma } = require('../config/database');

/**
 * Analyze user's resume and generate personalized practice plan
 */
exports.analyzeResume = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { text } = req.body;
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Resume text is required (minimum 50 characters)' });
    }

    const rawText = text.trim();

    console.log(`📄 Analyzing resume for user ${userId}...`);

    // Extract structured data from resume
    const structured = await extractResumeStructure(rawText);

    // Store resume profile with embedding
    const profileId = await resumeProfileUpsert({
      userId,
      rawText,
      structured,
    });

    console.log(`✓ Resume profile saved (ID: ${profileId})`);

    // Generate personalized practice plan
    const practicePlan = await generatePracticePlan(structured, userId);

    res.json({
      success: true,
      profile: {
        id: profileId,
        ...structured,
      },
      plan: practicePlan,
    });
  } catch (error) {
    console.error('Resume analysis error:', error);
    next(error);
  }
};

/**
 * Get user's stored resume profile
 */
exports.getResumeProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const profile = await resumeProfileGet(userId);

    if (!profile) {
      return res.status(404).json({ error: 'No resume profile found' });
    }

    res.json({
      success: true,
      profile: {
        id: profile.id,
        ...profile.structured,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get resume profile error:', error);
    next(error);
  }
};

/**
 * Extract structured data from resume text
 */
async function extractResumeStructure(text) {
  // Skills detection
  const pmSkills = [
    'product management',
    'product manager',
    'pm',
    'roadmap',
    'agile',
    'scrum',
    'stakeholder',
    'metrics',
    'kpi',
    'analytics',
    'a/b test',
    'experiment',
    'user research',
    'ux',
    'sql',
    'python',
    'excel',
    'jira',
    'figma',
    'wireframe',
    'prototype',
    'strategy',
    'vision',
    'prioritization',
    'backlog',
    'sprint',
    'feature',
  ];

  const lowerText = text.toLowerCase();
  const detectedSkills = [];

  for (const skill of pmSkills) {
    if (lowerText.includes(skill)) {
      detectedSkills.push(skill);
    }
  }

  // Domain detection
  const domains = {
    'b2b': /\b(b2b|enterprise|saas|business software)\b/i,
    'b2c': /\b(b2c|consumer|marketplace|e-commerce)\b/i,
    'fintech': /\b(fintech|payment|banking|financial|wallet)\b/i,
    'healthtech': /\b(health|medical|healthcare|telemedicine)\b/i,
    'edtech': /\b(education|learning|edtech|course)\b/i,
    'social': /\b(social network|community|messaging|chat)\b/i,
    'marketplace': /\b(marketplace|platform|two-sided)\b/i,
  };

  const detectedDomains = [];
  for (const [domain, regex] of Object.entries(domains)) {
    if (regex.test(text)) {
      detectedDomains.push(domain);
    }
  }

  // Experience level inference
  const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(of)?\s*experience/i);
  let inferredLevel = 'mid';
  
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1], 10);
    if (years < 2) inferredLevel = 'junior';
    else if (years >= 5) inferredLevel = 'senior';
  } else if (detectedSkills.length > 12) {
    inferredLevel = 'senior';
  } else if (detectedSkills.length < 6) {
    inferredLevel = 'junior';
  }

  // Company extraction (simple heuristic)
  const companyMatches = text.match(/\b(Google|Meta|Amazon|Microsoft|Apple|Netflix|Uber|Airbnb|Stripe|Spotify)\b/gi);
  const companies = companyMatches ? Array.from(new Set(companyMatches.map(c => c.toLowerCase()))) : [];

  return {
    skills: Array.from(new Set(detectedSkills)),
    domains: detectedDomains,
    inferredLevel,
    companies,
    hasMetrics: lowerText.includes('metric') || lowerText.includes('kpi'),
    hasExperiments: lowerText.includes('a/b') || lowerText.includes('experiment'),
    hasStrategy: lowerText.includes('strategy') || lowerText.includes('vision') || lowerText.includes('roadmap'),
  };
}

/**
 * Generate personalized practice plan based on resume profile
 */
async function generatePracticePlan(structured, userId) {
  const { skills, domains, inferredLevel, hasMetrics, hasExperiments, hasStrategy } = structured;

  // Determine weak areas and focus categories
  const focusCategories = [];
  const rationale = [];

  // Category recommendations based on profile
  if (!hasMetrics || skills.filter(s => s.includes('metric') || s.includes('analytics')).length === 0) {
    focusCategories.push('Metrics');
    rationale.push('Limited metrics experience detected - focus on defining and tracking KPIs');
  }

  if (!hasExperiments) {
    focusCategories.push('RCA');
    rationale.push('Build skills in root cause analysis and data-driven investigation');
  }

  if (!hasStrategy || inferredLevel === 'junior') {
    focusCategories.push('Product Strategy');
    rationale.push('Strengthen strategic thinking and long-term vision');
  }

  // Always include Product Design for well-rounded practice
  if (!focusCategories.includes('Product Design')) {
    focusCategories.push('Product Design');
    rationale.push('Core PM skill - designing user-centric solutions');
  }

  // Guesstimates for quantitative thinking
  if (inferredLevel !== 'senior' || !skills.includes('analytics')) {
    focusCategories.push('Guesstimates');
    rationale.push('Practice structured problem decomposition and estimation');
  }

  // Get question counts per recommended category
  const categoryCounts = await prisma.question.groupBy({
    by: ['category'],
    where: {
      category: { in: focusCategories },
    },
    _count: true,
  });

  const categoryAvailability = {};
  categoryCounts.forEach(c => {
    categoryAvailability[c.category] = c._count;
  });

  // Build weekly schedule
  const weeklySchedule = {
    monday: { category: focusCategories[0] || 'Product Design', questions: 1 },
    wednesday: { category: focusCategories[1] || 'Metrics', questions: 1 },
    friday: { category: focusCategories[2] || 'RCA', questions: 1 },
    saturday: { category: focusCategories[3] || 'Guesstimates', questions: 2 },
  };

  // Suggested readings (can be expanded with KB retrieval)
  const suggestedReadings = [];
  if (focusCategories.includes('Metrics')) {
    suggestedReadings.push({
      title: 'Defining North Star Metrics',
      category: 'Metrics',
      priority: 'high',
    });
  }
  if (focusCategories.includes('Product Strategy')) {
    suggestedReadings.push({
      title: 'Product Strategy Frameworks',
      category: 'Product Strategy',
      priority: 'high',
    });
  }

  return {
    focusAreas: focusCategories.slice(0, 3),
    rationale,
    inferredLevel,
    weeklySchedule,
    targetQuestions: 5, // per week
    estimatedWeeks: 8, // 2-month plan
    categoryAvailability,
    suggestedReadings,
    nextSteps: [
      `Start with ${focusCategories[0] || 'Product Design'} questions this week`,
      'Review your answers against model answers',
      'Track weak dimensions and iterate',
      'Schedule 1 mock interview after 4 weeks',
    ],
  };
}
