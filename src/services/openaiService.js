const openai = require('../config/openai');

/**
 * Scoring prompt template for PM interview answers
 * Enforces strict JSON output with defined schema
 */
const SCORING_PROMPT_TEMPLATE = (question, answer) => `
You are an expert product management interviewer evaluating a candidate's answer to a PM interview question.

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

Evaluate the answer using these criteria (each scored 0-10):
1. Structure: Logical flow, clear framework usage (CIRCLES, HEART, etc.)
2. Metrics: Quality and relevance of metrics defined
3. Prioritization: Ability to prioritize features/problems effectively
4. User Empathy: Understanding of user needs and pain points
5. Communication: Clarity, conciseness, and articulation

Provide constructive feedback (2-3 bullet points) and a concise sample answer demonstrating best practices.

CRITICAL: Respond ONLY with valid JSON matching this exact schema:
{
  "structure": <number 0-10>,
  "metrics": <number 0-10>,
  "prioritization": <number 0-10>,
  "user_empathy": <number 0-10>,
  "communication": <number 0-10>,
  "feedback": "<2-3 bullet points>",
  "sample_answer": "<concise sample answer>"
}

Do NOT include any text before or after the JSON object.
`;

/**
 * Call OpenAI API to score an answer
 * @param {string} question - The interview question
 * @param {string} answer - The candidate's answer
 * @returns {Promise<Object>} Parsed score object
 */
async function callOpenAIForScoring(question, answer) {
  const prompt = SCORING_PROMPT_TEMPLATE(question, answer);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert PM interviewer. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2, // Low temperature for consistent, deterministic scoring
    max_tokens: 1000,
    response_format: { type: 'json_object' }, // Enforce JSON mode (GPT-4 Turbo feature)
  });

  const content = completion.choices[0].message.content;
  const tokensUsed = completion.usage.total_tokens;

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

  // Validate schema
  const requiredFields = [
    'structure',
    'metrics',
    'prioritization',
    'user_empathy',
    'communication',
    'feedback',
    'sample_answer',
  ];

  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate numeric ranges (0-10)
  const numericFields = ['structure', 'metrics', 'prioritization', 'user_empathy', 'communication'];
  for (const field of numericFields) {
    const value = parsed[field];
    if (typeof value !== 'number' || value < 0 || value > 10) {
      throw new Error(`Invalid ${field}: must be a number between 0 and 10`);
    }
  }

  // Validate string fields
  if (typeof parsed.feedback !== 'string' || parsed.feedback.length < 10) {
    throw new Error('Invalid feedback: must be a non-empty string');
  }

  if (typeof parsed.sample_answer !== 'string' || parsed.sample_answer.length < 10) {
    throw new Error('Invalid sample_answer: must be a non-empty string');
  }

  return parsed;
}

module.exports = {
  callOpenAIForScoring,
  parseAndValidateScore,
  SCORING_PROMPT_TEMPLATE,
};
