const openai = require('../config/openai');

/**
 * Enhanced PM Interview Answer Evaluator
 * Based on structured 5-part evaluation framework
 */
const SCORING_PROMPT_TEMPLATE = (question, answer) => `
🎯 ROLE:
You are a senior Product Manager at a top tech company (like Google, Swiggy, or Razorpay), interviewing a candidate for a PM role.
You're experienced in evaluating product design, strategy, metrics, guesstimates, root cause analysis, and execution questions.

🎯 TASK:
Evaluate the candidate's answer critically and comprehensively — just like an interviewer would — in a structured, 5-part format.
Be brutally honest, concise, and specific about what's missing or weak.
No sugarcoating. You are a tough but fair mentor.

---

📋 INPUT:

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

---

📊 OUTPUT STRUCTURE (5 PARTS):

1️⃣ SUMMARY OF UNDERSTANDING (2–3 lines)
Briefly summarize what the candidate is trying to say — to show you understood their intent.

2️⃣ EVALUATION (Score out of 10)
Rate the answer on:
- Clarity of thought
- Depth of analysis
- User-centricity
- Structure & flow
- Creativity & practicality of solution

3️⃣ STRENGTHS (2–3 bullet points)
Highlight what the candidate did well — frameworks used, insights, structure, user empathy, quantification, etc.
Use ✅ prefix for each strength.

4️⃣ GAPS / WHAT'S MISSING (4–6 bullet points)
Be blunt about what was weak — missing problem framing, vague success metrics, no prioritization logic, lack of user persona, etc.
If they jumped to features too fast, call it out.
Use ⚠️ prefix for each gap.

5️⃣ SUGGESTED IMPROVED FRAMEWORK (short, reusable)
Give a mini-framework or restructured outline for how they should've answered this kind of question.
Use 💡 prefix.
Then provide a rewritten answer in 3–5 bullet points demonstrating what a "9/10" answer would look like.

---

OUTPUT FORMAT (JSON):
{
  "clarity": 0-10,
  "depth": 0-10,
  "user_centricity": 0-10,
  "structure": 0-10,
  "creativity": 0-10,
  "overall_score": 0-10,
  "summary": "2-3 line summary of what the candidate is trying to say",
  "strengths": [
    "What they did well (framework used, insights, etc.)",
    "Another strength",
    "Third strength (if applicable)"
  ],
  "gaps": [
    "Missing problem framing",
    "Vague success metrics",
    "No prioritization logic",
    "Lack of user persona",
    "Jumped to features too early",
    "Other specific gaps"
  ],
  "improved_framework": "Mini-framework for this question type (e.g., Clarify → Define User & Goal → Identify Pain Points → Ideate → Prioritize → Metrics → Risks)",
  "model_answer": "Rewritten 9/10 answer in 3-5 bullet points showing what excellence looks like"
}

---

🎨 TONE GUIDELINES:
- Be critical but encouraging ("strong instincts, weak structure" > "bad answer")
- Keep total feedback under 400 words
- Always include numeric scores
- Do not be generic — tailor feedback to their actual content
- Use clear, direct language
- Point out specific examples from their answer

🚨 STRICT RULES:
- Always output pure JSON only
- No markdown formatting inside JSON strings
- Be harsh on weak answers (scores 3-5), generous on strong ones (8-10)
- Gaps should be specific (not "lacks detail" but "no success metrics defined")
- Model answer must be concrete with frameworks and numbers
- Overall score = average of 5 dimensions, rounded
`;

/**
 * Call OpenAI API to score an answer
 * @param {string} question - The interview question
 * @param {string} answer - The candidate's answer
 * @returns {Promise<Object>} Parsed score object
 */
async function callOpenAIForScoring(question, answer, customPrompt = null) {
  const prompt = customPrompt || SCORING_PROMPT_TEMPLATE(question, answer);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', // Using GPT-4o - proven fast and reliable for PM scoring
    messages: [
      {
        role: 'system',
        content:
          'You are a senior PM interviewer at a top-tier tech company. You are professional, sharp, analytical, and critical. Always respond with valid JSON only. Be brutally honest in your feedback.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7, // GPT-4o supports custom temperature
    max_tokens: 2000, // Increased to ensure full JSON response (6 scores + feedback + model answer)
    response_format: { type: 'json_object' }, // Enforce JSON mode
  });

  const content = completion.choices[0].message.content;
  const tokensUsed = completion.usage.total_tokens;

  console.log('OpenAI Scoring Response Length:', content.length, 'characters');
  console.log('Tokens Used:', tokensUsed);

  return { content, tokensUsed };
}

/**
 * Parse and validate OpenAI JSON response
 * @param {string} content - Raw OpenAI response
 * @returns {Object} Validated score object
 * @throws {Error} If JSON is invalid or doesn't match schema
 */
function parseAndValidateScore(content) {
  // Strip potential markdown code blocks
  let cleanedContent = content.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/```\n?/g, '');
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${err.message}`);
  }

  // Debug logging
  console.log('AI Response - Keys returned:', Object.keys(parsed));
  console.log('AI Response - Full object:', JSON.stringify(parsed, null, 2));

  // Validate schema - handle multiple field formats
  // New 5-part format: summary, strengths, gaps, improved_framework, model_answer
  // Previous enhanced format: strengths, weaknesses, pass_level_answer, brutal_truth
  // Old format: feedback, model_answer
  const has5PartFormat = 'summary' in parsed && 'strengths' in parsed && 'gaps' in parsed && 'improved_framework' in parsed;
  const hasEnhancedFormat = 'strengths' in parsed && 'weaknesses' in parsed && 'pass_level_answer' in parsed;
  const hasOldFormat = 'feedback' in parsed && 'model_answer' in parsed;

  const requiredFields = ['overall_score'];

  if (has5PartFormat) {
    requiredFields.push('summary', 'strengths', 'gaps', 'improved_framework', 'model_answer');
  } else if (hasEnhancedFormat) {
    requiredFields.push('strengths', 'weaknesses', 'pass_level_answer', 'brutal_truth', 'model_answer');
  } else if (hasOldFormat) {
    requiredFields.push('feedback', 'model_answer');
  } else {
    requiredFields.push('feedback', 'model_answer'); // Default to old format requirements
  }

  // Check for old field format
  const oldFields = [
    'product_sense',
    'metrics',
    'prioritization',
    'structure',
    'communication',
    'user_empathy',
  ];
  const hasOldFields = oldFields.every(field => field in parsed);
  
  // Check for new 5-part scoring dimensions
  const new5PartScores = [
    'clarity',
    'depth',
    'user_centricity',
    'structure',
    'creativity',
  ];
  const hasNew5PartScores = new5PartScores.every(field => field in parsed);

  // Check for new Exponent-style field format (product design)
  const productDesignFields = [
    'user_centricity',
    'innovation',
    'technical_feasibility',
    'user_experience',
    'success_metrics',
    'iteration',
  ];
  const hasProductDesignFields = productDesignFields.every(field => field in parsed);

  // Check for new Exponent-style field format (metrics)
  const metricsFields = [
    'metrics_selection',
    'data_analysis',
    'statistical_understanding',
    'ab_testing',
    'actionable_insights',
    'business_impact',
  ];
  const hasMetricsFields = metricsFields.every(field => field in parsed);

  // Check for other category field formats
  const rootCauseFields = [
    'problem_identification',
    'analysis_depth',
    'data_driven_approach',
    'solution_prioritization',
    'implementation_planning',
    'risk_assessment',
  ];
  const hasRootCauseFields = rootCauseFields.every(field => field in parsed);

  const productImprovementFields = [
    'user_research_foundation',
    'improvement_prioritization',
    'solution_innovation',
    'implementation_planning',
    'metrics_definition',
    'iteration_strategy',
  ];
  const hasProductImprovementFields = productImprovementFields.every(field => field in parsed);

  const productStrategyFields = [
    'market_analysis',
    'competitive_positioning',
    'strategic_thinking',
    'resource_allocation',
    'risk_assessment',
    'execution_planning',
  ];
  const hasProductStrategyFields = productStrategyFields.every(field => field in parsed);

  const guesstimatesFields = [
    'estimation_framework',
    'data_reasoning',
    'assumption_validation',
    'calculation_accuracy',
    'sensitivity_analysis',
    'business_application',
  ];
  const hasGuesstimatesFields = guesstimatesFields.every(field => field in parsed);

  if (
    !hasOldFields &&
    !hasNew5PartScores &&
    !hasProductDesignFields &&
    !hasMetricsFields &&
    !hasRootCauseFields &&
    !hasProductImprovementFields &&
    !hasProductStrategyFields &&
    !hasGuesstimatesFields
  ) {
    // Try to find any scoring fields
    const scoringFields = Object.keys(parsed).filter(
      key => typeof parsed[key] === 'number' && key !== 'overall_score'
    );

    if (scoringFields.length === 0) {
      console.error('VALIDATION ERROR - Received keys:', Object.keys(parsed));
      console.error('VALIDATION ERROR - Full response:', JSON.stringify(parsed, null, 2));
      throw new Error(
        `Missing required scoring fields. Expected one of: old format (${oldFields.join(
          ', '
        )}) or any category format. Received keys: ${Object.keys(parsed).join(', ')}`
      );
    }

    // If we have scoring fields but they don't match known formats, log a warning but allow it
    console.warn(
      'WARNING: Unknown field format detected, using fallback scoring. Fields:',
      Object.keys(parsed)
    );
  }

  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate numeric ranges (0-10) - only validate fields that exist
  // Get all numeric fields (excluding overall_score which is validated separately)
  const numericFieldsInResponse = Object.keys(parsed).filter(
    key => typeof parsed[key] === 'number'
  );

  for (const field of numericFieldsInResponse) {
    const value = parsed[field];
    if (typeof value !== 'number' || value < 0 || value > 10) {
      throw new Error(`Invalid ${field}: must be a number between 0 and 10`);
    }
  }

  // Validate feedback array
  if (!Array.isArray(parsed.feedback) || parsed.feedback.length < 2) {
    throw new Error('Invalid feedback: must be an array with at least 2 bullet points');
  }

  for (const bullet of parsed.feedback) {
    if (typeof bullet !== 'string' || bullet.length < 10) {
      throw new Error('Invalid feedback bullet: each must be a non-empty string');
    }
  }

  // Validate model answer
  if (typeof parsed.model_answer !== 'string' || parsed.model_answer.length < 50) {
    throw new Error('Invalid model_answer: must be a substantial string');
  }

  return parsed;
}

/**
 * Call OpenAI API to answer clarifying questions during PM interview
 * Acts as an interviewer who helps clarify the question context
 * @param {string} question - The original interview question
 * @param {Array} conversationHistory - Array of {role, content} message objects
 * @returns {Promise<string>} AI response to the clarification
 */
async function callOpenAIForClarification(question, conversationHistory) {
  const systemPrompt = `You are an experienced Product Management interviewer conducting a mock interview. 
The candidate has been asked the following question:

"${question}"

Your role is to:
1. Answer clarifying questions the candidate may have about the scope, constraints, or context
2. Provide helpful guidance without giving away the answer
3. Encourage the candidate to think through the problem
4. Be supportive and professional, like a real interviewer
5. If the candidate asks for specific details (target users, market, constraints), provide reasonable assumptions
6. Keep responses concise and conversational (2-4 sentences typically)

Remember: You're helping them understand the question better, not solving it for them.`;

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...conversationHistory,
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', // Using GPT-4o since gpt-5-mini not yet available
    messages: messages,
    temperature: 0.7, // GPT-4o supports custom temperature
    max_tokens: 300, // GPT-4o uses max_tokens
  });

  const response = completion.choices[0].message.content;
  const tokensUsed = completion.usage.total_tokens;

  return { response, tokensUsed };
}

module.exports = {
  callOpenAIForScoring,
  parseAndValidateScore,
  callOpenAIForClarification,
  SCORING_PROMPT_TEMPLATE,
};
