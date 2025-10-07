const openai = require('../config/openai');

/**
 * Scoring prompt template for PM interview answers
 * Senior PM interviewer with harsh, realistic feedback
 */
const SCORING_PROMPT_TEMPLATE = (question, answer) => `
ROLE:
You are a senior Product Manager interviewer at a top-tier tech company (e.g. Google, Meta, Amazon). 
You have conducted hundreds of PM interviews across Product Sense, Metrics, Strategy, and Execution.
You are professional, sharp, analytical, and critical. You always assess with fairness but high standards.

---

OBJECTIVE:
You are interviewing a candidate for a Product Manager role.
The candidate answered the following PM interview question.
You will:
1. Evaluate their response across multiple PM skill dimensions.
2. Give **numeric scores (0–10)** for each category.
3. Provide **harsh, honest feedback** about weaknesses and improvement areas.
4. Then provide a **model 10/10 answer** for reference.

Your feedback should help the candidate understand what a "great PM answer" actually looks like.

---

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

---

EVALUATION CRITERIA:
Rate the candidate's answer from **0 to 10** in each of the following dimensions:

1. **Product Sense** – Does the answer demonstrate deep customer understanding and product intuition?
2. **Metrics & Data** – Does the candidate define measurable success metrics, north-star metric, or KPIs logically?
3. **Prioritization & Tradeoffs** – Does the answer reflect clear decision frameworks (ICE, RICE, impact vs effort, etc.)?
4. **Analytical Structure** – Is the response logically structured and well-organized (step-by-step thinking, frameworks)?
5. **Communication Clarity** – Is the answer articulate, confident, and concise?
6. **User Empathy** – Does the answer reflect customer pain points and reasoning from user perspective?

Also provide:
- **Feedback (2–4 short bullet points):** Candid improvement notes, pointing out flaws, gaps, or missteps.
- **10/10 Model Answer:** A fully rewritten, top-tier answer that would score 10/10 across all dimensions.
- **Overall Score:** The average (rounded) of all dimension scores.

---

TONE GUIDELINES:
- Speak as a **seasoned interviewer**, not as a friendly coach.
- Be direct, professional, and brutally honest.
- Don't flatter; if something is weak, say so clearly.
- Your tone should sound like real feedback from a PM hiring panel:
  > "Your approach lacks measurable KPIs."  
  > "You didn't clearly define the user problem before proposing features."  
  > "You jumped into solutions without exploring tradeoffs."

You are here to make the candidate **think harder**, not feel comfortable.

---

OUTPUT FORMAT (JSON):
Return a clean JSON object with no extra text or commentary. It must follow this exact schema:

{
  "product_sense": 0-10,
  "metrics": 0-10,
  "prioritization": 0-10,
  "structure": 0-10,
  "communication": 0-10,
  "user_empathy": 0-10,
  "overall_score": 0-10,
  "feedback": [
    "Short bullet 1 (direct, critical, 1 sentence)",
    "Short bullet 2 (focus on weakness or improvement)",
    "Short bullet 3 (optional, additional critique)"
  ],
  "model_answer": "Write the ideal 10/10 Product Manager answer in 3-6 sentences. Be concise, structured, and show clear product thinking, metrics, and tradeoffs."
}

All numbers must be integers 0–10. 
All feedback must be short, punchy, and written in a realistic human tone (like a real interviewer's written feedback).

---

STRICT INSTRUCTIONS:
- Always output pure JSON. No explanations, no markdown, no prose.
- Be tough but fair — never say "great job" unless it truly deserves it.
- Your model answer should always demonstrate advanced PM frameworks, structured reasoning, and clarity.
- Never skip fields or output partial data.
- Do NOT include any text before or after the JSON object.
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
    model: 'gpt-5', // Latest GPT-5 flagship model - best for analytical PM scoring
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
    temperature: 0.3, // Slightly higher for more varied, human-like feedback
    max_completion_tokens: 1500, // GPT-5 uses max_completion_tokens instead of max_tokens
    response_format: { type: 'json_object' }, // Enforce JSON mode
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
    'product_sense',
    'metrics',
    'prioritization',
    'structure',
    'communication',
    'user_empathy',
    'overall_score',
    'feedback',
    'model_answer',
  ];

  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate numeric ranges (0-10)
  const numericFields = [
    'product_sense',
    'metrics',
    'prioritization',
    'structure',
    'communication',
    'user_empathy',
    'overall_score',
  ];
  for (const field of numericFields) {
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
    model: 'gpt-5-mini', // Faster and cheaper GPT-5 mini for clarifications
    messages: messages,
    temperature: 0.7, // More conversational than scoring
    max_completion_tokens: 300, // GPT-5 uses max_completion_tokens instead of max_tokens
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
