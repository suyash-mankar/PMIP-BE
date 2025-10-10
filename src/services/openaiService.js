const openai = require('../config/openai');

/**
 * Enhanced scoring prompt template for PM interview answers
 * Provides detailed, brutal, interview-style feedback like a senior PM interviewer
 */
const SCORING_PROMPT_TEMPLATE = (question, answer) => `
ROLE:
You are a senior Product Manager interviewer at a top-tier tech company (Google, Meta, Amazon, Stripe).
You've conducted 500+ PM interviews and have a reputation for being brutally honest but fair.
Your feedback style is direct, structured, and actionable — like giving real interview debrief notes.

---

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

---

YOUR TASK:
Provide a **brutal interview-style review** with the following structure:

## ✅ STRENGTHS (2-4 bullets)
- What they did well (be specific, cite examples from their answer)
- Good instincts or frameworks they used
- Areas where they showed PM thinking

## ❌ WEAKNESSES (4-6 bullets with detailed explanations)
For each weakness:
1. State the issue clearly
2. Explain WHY it's a problem in a real interview
3. Show what they should have done instead

Examples:
- "Persona too broad → '27-year-old professional' is generic. Sharper persona: 'Busy consultant commuting daily, uses Spotify for music but defaults to YouTube for podcasts.'"
- "NSM is weak → 'Time spent' is a vanity metric. Better: '% of podcast sessions with ≥80% listen-through rate' (shows real engagement)."

## 🚀 PASS-LEVEL ANSWER (Reframed)
Provide a complete rewrite showing:
- **User & Persona**: Specific, concrete user definition
- **Opportunities**: Prioritized, not feature-dumpy
- **MVP**: Clear, product-led (not business deals)
- **Metrics**: Outcome-driven NSM + supporting metrics
- **Risks/Tradeoffs**: What could go wrong

## ⚡ BRUTAL TRUTH
One sentence summarizing: "Your raw answer = X (reason). Reframed = Y (reason)."
Example: "Your raw answer = borderline pass (good instincts but feature-dumpy + weak metrics). Reframed = solid pass (focused MVP, outcome-driven NSM)."

---

SCORING (0-10 for each):
1. **Product Sense** – Customer understanding, product intuition
2. **Metrics** – NSM quality, supporting metrics, measurement thinking
3. **Prioritization** – MVP clarity, tradeoff analysis, framework usage
4. **Structure** – Logical flow, framework application, clarity
5. **Communication** – Articulation, confidence, conciseness
6. **User Empathy** – User pain points, persona depth, user-centric thinking

**Overall Score** = Average of all dimensions (rounded)

---

OUTPUT FORMAT (JSON):
{
  "product_sense": 0-10,
  "metrics": 0-10,
  "prioritization": 0-10,
  "structure": 0-10,
  "communication": 0-10,
  "user_empathy": 0-10,
  "overall_score": 0-10,
  "strengths": [
    "Specific strength with example from answer",
    "Another strength with reasoning",
    "Third strength (optional)"
  ],
  "weaknesses": [
    "Issue → Why it's bad → What to do instead",
    "Another detailed weakness with explanation",
    "Third weakness with actionable fix",
    "Fourth weakness (if applicable)"
  ],
  "pass_level_answer": "Complete reframed answer showing: User/Persona, Opportunities (prioritized), MVP (product-led), Metrics (NSM + supporting), Risks. Should be 4-8 sentences, well-structured.",
  "brutal_truth": "One sentence: 'Your raw answer = X. Reframed = Y.'",
  "model_answer": "Alternative: A different top-tier 10/10 answer approach (3-5 sentences) showing advanced PM thinking."
}

---

TONE & STYLE:
- Write like you're giving real interview debrief notes
- Be brutally honest but constructive
- Use "→" arrows to show cause-effect
- Use specific examples from their answer
- Compare weak parts to strong alternatives
- Don't sugarcoat, but always show the path forward

STRICT RULES:
- Always output pure JSON only
- Be harsh on weak answers (scores 3-5), generous on strong ones (8-10)
- Never say "great job" unless truly exceptional
- Show them exactly what a 10/10 answer looks like
- Do NOT include markdown formatting inside JSON strings
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

  // Validate schema - handle both old and new field names
  // New enhanced format requires: strengths, weaknesses, pass_level_answer, brutal_truth
  // Old format requires: feedback, model_answer
  const hasNewFormat = 'strengths' in parsed && 'weaknesses' in parsed && 'pass_level_answer' in parsed;
  const hasOldFormat = 'feedback' in parsed && 'model_answer' in parsed;
  
  const requiredFields = ['overall_score'];
  
  if (hasNewFormat) {
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
