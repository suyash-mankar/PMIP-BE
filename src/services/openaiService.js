const openai = require('../config/openai');

/**
 * Enhanced PM Interview Answer Evaluator
 * Based on structured 5-part evaluation framework
 */
const SCORING_PROMPT_TEMPLATE = (question, answer) => `
You are a senior Product Manager interviewer at a top tech company (Google, Meta, Amazon, Stripe).
You've conducted 500+ PM interviews and specialize in product strategy, design, and execution.
Your feedback style is direct, structured, and actionable — like giving real interview debrief notes.

---

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

---

YOUR TASK:
Provide a **comprehensive, step-by-step interview-style review** with the following structure:

## 🎯 INTRODUCTION
Start with: "Perfect — this is a classic [question type] question that tests how you think like a PM at [company]. Can you (1) [key skill 1], (2) [key skill 2], and (3) [key skill 3]? Let's break it down like a top-tier PM would 👇"

## 🧭 STEP-BY-STEP ANALYSIS
Break down their answer into logical steps (like the example):
- 🧭 Step 1: Clarify the Problem
- 🎯 Step 2: Define the User Problem  
- 💡 Step 3: Product Vision
- 👤 Step 4: Target Users & Personas
- 🧩 Step 5: Core Product Concept
- 🧱 Step 6: MVP Features
- ⚙️ Step 7: Leveraging Company Strengths
- 📈 Step 8: Success Metrics
- 🚀 Step 9: Roadmap (Phased Rollout)
- 🧠 Step 10: Risks & Mitigation
- 🧩 Step 11: Interview Summary (2-Minute Version)

For EACH step, provide 2-3 paragraphs of detailed analysis:
- What they did well with specific examples from their answer
- What was missing or weak with detailed explanations
- How a top-tier PM would approach it with specific examples
- Show exactly how a top PM would answer each step with specific examples
- Make each step comprehensive like ChatGPT's direct responses

## ✅ STRENGTHS IN YOUR ANSWER
- What they did well (be specific, cite examples from their answer)
- Good frameworks or approaches they used
- Areas where they showed strong PM thinking
- Use right arrows (→) to show cause-effect relationships

## ⚠️ AREAS TO IMPROVE
For each weakness:
1. State the issue clearly with specific examples
2. Explain WHY it's a problem in a real interview
3. Show what they should have done instead
4. Use bold text for emphasis and quotation marks for specific phrases

## 🔥 REFRAMED "PASS-LEVEL" ANSWER (comprehensive & structured)
Provide a complete rewrite showing best practices with step-by-step structure:
Write 3-5 detailed paragraphs for each subsection. Include specific examples, data points, and reasoning. Make it as detailed as if you were answering the question yourself.

- **🧭 Problem Clarification:** [2-3 paragraphs with clear problem statement, scope, and context]
- **🎯 User Problem:** [3-4 paragraphs with specific user needs, pain points, and JTBD]
- **💡 Product Vision:** [2-3 paragraphs with north star, goals, and strategic direction]
- **👤 Target Users:** [3-4 paragraphs with detailed personas, needs, and user segments]
- **🧩 Core Concept:** [2-3 paragraphs with product concept, positioning, and value prop]
- **🧱 MVP Features:** [4-5 paragraphs with detailed feature breakdown and prioritization]
- **⚙️ Company Leverage:** [2-3 paragraphs with how to use existing strengths and assets]
- **📈 Success Metrics:** [2-3 paragraphs with NSM, supporting metrics, and rationale]
- **🚀 Roadmap:** [2-3 paragraphs with phased approach and execution timeline]
- **🧠 Risks:** [2-3 paragraphs with key risks, mitigation strategies, and contingency plans]

## ⚡ BRUTAL TRUTH
One sentence summarizing: "Your raw answer = X (reason). Reframed = Y (reason)."

## 💎 COMPLETE MODEL ANSWER (How I Would Answer This Question)
Now, here's how I would answer this question as a senior PM, from scratch:

Provide a COMPREHENSIVE, ChatGPT-level answer that includes:
- Full problem clarification (2-3 paragraphs)
- Detailed user research and personas (3-4 paragraphs with tables if needed)
- Complete product vision and strategy (2-3 paragraphs)
- Comprehensive feature breakdown (4-5 paragraphs)
- Detailed success metrics with rationale (2-3 paragraphs)
- Full roadmap and execution plan (2-3 paragraphs)
- Risk mitigation strategies (2-3 paragraphs)

This should be 15-20 paragraphs total, matching ChatGPT's direct response quality.

---

OUTPUT FORMAT (JSON):
{
  "overall_score": 0-10,
  "feedback_text": "Complete feedback in ChatGPT format with markdown formatting, emojis, arrows, and bold text. Include all sections: introduction, step-by-step analysis, strengths, areas to improve, reframed answer, brutal truth, and complete model answer. Use proper markdown: **bold**, • bullets, → arrows, emojis 🎯🧭💡👤🧩🧱⚙️📈🚀🧠✅⚠️🔥⚡💎",
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
  "reframed_answer": "Complete reframed answer with step-by-step structure like the example",
  "brutal_truth": "One sentence: 'Your raw answer = X. Reframed = Y.'",
  "model_answer": "COMPREHENSIVE standalone answer (15-20 paragraphs) showing exactly how you would answer this question as a senior PM. Include all sections: problem clarification, user research, product vision, features, metrics, roadmap, risks. Make it as detailed as ChatGPT's direct responses with full explanations, examples, and reasoning for each point."
}

---

TONE & STYLE:
- Write like you're giving a comprehensive interview debrief
- Be brutally honest but constructive
- Use step-by-step analysis like the example
- Use "→" arrows to show cause-effect
- Use specific examples from their answer
- Compare weak parts to strong alternatives
- Don't sugarcoat, but always show the path forward
- Use emojis: 🎯🧭💡👤🧩🧱⚙️📈🚀🧠✅⚠️🔥⚡💎
- Use bold text for emphasis: **text**
- Use bullet points: • item
- Make it comprehensive and detailed like the example
- The model_answer should be ChatGPT-level comprehensive (1500-2000 words)
- Think of model_answer as 'How would I answer this if someone asked me directly on ChatGPT?'
- Don't summarize - provide FULL detailed explanations for everything

STRICT RULES:
- Always output pure JSON only
- Be harsh on weak answers (scores 3-5), generous on strong ones (8-10)
- Never say "great job" unless truly exceptional
- Show them exactly what a 10/10 answer looks like
- Use proper markdown formatting in feedback_text
- Include all sections: introduction, step-by-step analysis, strengths, areas to improve, reframed answer, brutal truth, complete model answer
- Make it as detailed and structured as the example you provided
- The model_answer field must be 15-20 paragraphs minimum
- Each section in model_answer should have detailed explanations with examples
- Match the depth and quality of ChatGPT's direct responses
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
    model: 'gpt-5', // Using GPT-5 for detailed, comprehensive feedback like ChatGPT UI
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
    // GPT-5 only supports default temperature (1) - removed custom temperature
    // Removed max_tokens limit - let OpenAI generate full responses like ChatGPT UI
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
  const has5PartFormat =
    'summary' in parsed &&
    'strengths' in parsed &&
    'gaps' in parsed &&
    'improved_framework' in parsed;
  const hasEnhancedFormat =
    'strengths' in parsed && 'weaknesses' in parsed && 'pass_level_answer' in parsed;
  const hasOldFormat = 'feedback' in parsed && 'model_answer' in parsed;
  const hasChatGPTFormat =
    'feedback_text' in parsed && 'reframed_answer' in parsed && 'brutal_truth' in parsed;

  const requiredFields = ['overall_score'];

  if (hasChatGPTFormat) {
    requiredFields.push('feedback_text', 'reframed_answer', 'brutal_truth');
  } else if (has5PartFormat) {
    requiredFields.push('summary', 'strengths', 'gaps', 'improved_framework', 'model_answer');
  } else if (hasEnhancedFormat) {
    requiredFields.push(
      'strengths',
      'weaknesses',
      'pass_level_answer',
      'brutal_truth',
      'model_answer'
    );
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
  const new5PartScores = ['clarity', 'depth', 'user_centricity', 'structure', 'creativity'];
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
    !hasGuesstimatesFields &&
    !hasChatGPTFormat
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

  // Validate feedback based on format
  if (hasChatGPTFormat) {
    // ChatGPT format validation
    if (typeof parsed.feedback_text !== 'string' || parsed.feedback_text.length < 50) {
      console.warn('Warning: feedback_text should be substantial, but allowing it');
    }
    if (typeof parsed.reframed_answer !== 'string' || parsed.reframed_answer.length < 20) {
      console.warn('Warning: reframed_answer should be substantial, but allowing it');
    }
    if (typeof parsed.brutal_truth !== 'string' || parsed.brutal_truth.length < 10) {
      console.warn('Warning: brutal_truth should be meaningful, but allowing it');
    }
  } else if (has5PartFormat) {
    // New 5-part format validation
    if (!Array.isArray(parsed.strengths) || parsed.strengths.length < 1) {
      console.warn('Warning: strengths should have at least 1 item, but allowing it');
    }
    if (!Array.isArray(parsed.gaps) || parsed.gaps.length < 1) {
      console.warn('Warning: gaps should have at least 1 item, but allowing it');
    }
    if (typeof parsed.summary !== 'string' || parsed.summary.length < 10) {
      console.warn('Warning: summary should be at least 10 characters, but allowing it');
    }
    if (typeof parsed.improved_framework !== 'string' || parsed.improved_framework.length < 20) {
      console.warn('Warning: improved_framework should be substantial, but allowing it');
    }
  } else if (hasEnhancedFormat) {
    // Enhanced format validation
    if (!Array.isArray(parsed.strengths) || parsed.strengths.length < 1) {
      console.warn('Warning: strengths should have at least 1 item, but allowing it');
    }
    if (!Array.isArray(parsed.weaknesses) || parsed.weaknesses.length < 1) {
      console.warn('Warning: weaknesses should have at least 1 item, but allowing it');
    }
  } else if (hasOldFormat) {
    // Old format validation
    if (!Array.isArray(parsed.feedback) || parsed.feedback.length < 2) {
      console.warn('Warning: feedback should have at least 2 items, but allowing it');
    }
  }

  // Validate model answer (relaxed validation)
  if (parsed.model_answer && typeof parsed.model_answer !== 'string') {
    console.warn('Warning: model_answer should be a string, but allowing it');
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
    model: 'gpt-5', // Using GPT-5 for detailed clarifications like ChatGPT UI
    messages: messages,
    // GPT-5 only supports default temperature (1) - removed custom temperature
    // Removed max_tokens limit - allow full conversational responses
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
