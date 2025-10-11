const openai = require('../config/openai');

/**
 * Enhanced PM Interview Answer Evaluator
 * Based on structured 5-part evaluation framework
 */
const SCORING_PROMPT_TEMPLATE = (question, answer) => `
You are a senior Product Manager interviewer at a top tech company (Google, Meta, Amazon, Stripe).
You've conducted 500+ PM interviews and specialize in product strategy, design, and execution.
Your feedback style is direct, structured, and actionable — like giving real interview debrief notes.

**CRITICAL FEEDBACK REQUIREMENT:** 
You are a **brutally honest senior PM interviewer** at Google/Meta/Amazon who has conducted 500+ interviews.
Rate this answer harshly and critically. Never sugarcoat poor answers. 
Be specific about what's missing and why it matters in a real interview.
Show them exactly what a 10/10 answer looks like with concrete examples.

---

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

---

YOUR TASK:
Provide a **comprehensive, step-by-step interview-style review** using proper markdown formatting.

**START YOUR FEEDBACK WITH THE OVERALL SCORE PROMINENTLY:**
# Overall Score: X/10

FORMAT YOUR FEEDBACK WITH MARKDOWN:
- Use # for the overall score heading (most prominent)
- Use ## for main section headings (e.g., ## 🎯 INTRODUCTION, ## 🧭 STEP-BY-STEP ANALYSIS)
- Use ### for subsection headings within main sections
- Use **bold** for key terms, issues, and important points
- Use *italics* for emphasis and examples
- Use - or • for bullet points
- Use numbered lists (1., 2., 3.) for sequential items
- Use > for key insights or quotes
- Use --- for horizontal rules between major sections
- Use tables when comparing approaches or features
- Use proper paragraph breaks for readability

PROVIDE FEEDBACK WITH THIS STRUCTURE:

## 🎯 INTRODUCTION
Start with: "Alright [Candidate] — here's the **brutal interview-style review** of your [question type] answer.

This is a classic [question type] question that tests how you think like a PM at [company]. Can you (1) [key skill 1], (2) [key skill 2], and (3) [key skill 3]? Let's break it down like a top-tier PM interviewer would 👇"

## 🧭 STEP-BY-STEP ANALYSIS
Break down their answer into logical steps with **detailed, critical analysis** for EACH step (2-3 paragraphs per step):

### Step 1: Clarify the Problem
- **What they did:** [Specific example from their answer]
- **What they missed:** [Critical gaps or mistakes]
- **What top PMs do:** [Better approach with examples]

### Step 2: Define the User Problem
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

### Step 3: Product Vision & Strategy
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

### Step 4: Target Users & Personas
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

### Step 5: Core Product Concept
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

### Step 6: MVP Features & Prioritization
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

### Step 7: Leveraging Company Strengths
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

### Step 8: Success Metrics & KPIs
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

### Step 9: Roadmap & Execution
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

### Step 10: Risks & Mitigation
- **What they did:** [Specific analysis]
- **What they missed:** [Critical gaps]
- **What top PMs do:** [Better approach]

Include 8-12 steps total depending on question type. Use **bold** for step titles and provide **comprehensive, critical analysis** for each.

**For each step, be specific:**
- Quote exact phrases from their answer when analyzing
- Compare their approach to what a senior PM would do
- Use **bold** for critical issues and *italics* for examples
- Provide concrete improvements with specific frameworks or methodologies

## ✅ STRENGTHS IN YOUR ANSWER
- **Strength 1:** Specific example from their answer with → cause-effect
- **Strength 2:** What they did well with concrete evidence
- **Strength 3:** Good frameworks or approaches they used

Use bullet points and → arrows to show cause-effect relationships.

## ⚠️ AREAS TO IMPROVE
For each weakness (3-5 total):

- **Issue:** State the problem clearly with specific example from their answer
- **Why it matters:** Explain impact in real interview context
- **What to do instead:** Show the better approach with concrete example

Use **bold** for key issues and provide **actionable, specific fixes**.

## 🔥 REFRAMED "PASS-LEVEL" ANSWER
Provide a complete rewrite with 8-12 detailed subsections:
- **🧭 Subsection 1:** 2-3 paragraphs with specific examples
- **🎯 Subsection 2:** 2-3 paragraphs with data points
- **💡 Subsection 3:** Continue for all major areas
- **👤 Subsection 4:** Continue analysis
- **🧩 Subsection 5:** Continue analysis
- **🧱 Subsection 6:** Continue analysis
- **⚙️ Subsection 7:** Continue analysis
- **📈 Subsection 8:** Continue analysis

Write comprehensive paragraphs with specific examples, data points, and reasoning. Use **bold** for key terms.

## ⚡ BRUTAL TRUTH
One sentence summarizing: "Your raw answer = X (reason). Reframed = Y (reason)."

---

OUTPUT FORMAT (JSON):
{
  "overall_score": 0-10,
  "feedback_text": "# Overall Score: X/10\n\n## Introduction\n[Full feedback with comprehensive markdown formatting including # for overall score, ## for main sections, ### for subsections, **bold** for emphasis, *italics* for examples, • for bullets, numbered lists, > for quotes, --- for horizontal rules, tables when appropriate. Include: introduction, step-by-step analysis, strengths, areas to improve, reframed answer, brutal truth.]",
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
}

---

TONE & STYLE:
- Use markdown: # for overall score, ## headings, ### subsections, **bold**, *italic*, • bullets, numbered lists
- Write comprehensive interview debrief with specific examples from their actual answer
- Use → arrows for cause-effect relationships
- Be brutally honest and critical - most PM answers are mediocre
- Show exactly what a 10/10 answer looks like with concrete examples
- Make it structured and scannable like ChatGPT's detailed responses
- Use tables when comparing approaches, blockquotes for key insights

STRICT RULES:
- Always output pure JSON only
- Be harsh on weak answers (scores 3-5), generous only on truly strong ones (8-10)
- Never say "great job" unless truly exceptional - most answers deserve 4-6/10
- Show them exactly what a 10/10 answer looks like with specific frameworks and examples
- Use proper markdown formatting: # for score, ## for sections, ### for subsections, **bold**, *italic*, bullets, lists
- Include specific examples from their actual answer in your critique
- Make it scannable and structured like ChatGPT with clear visual hierarchy
- Be critical about generic answers, missing frameworks, poor metrics, weak user research
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
 * Generate a perfect 10/10 model answer for a PM interview question
 * @param {string} question - The interview question
 * @returns {Promise<string>} Perfect model answer
 */
async function generateModelAnswer(question) {
  const prompt = `You are a senior Product Manager candidate interviewing at a top tech company (Google, Meta, Amazon, Stripe).
You are answering the following PM interview question to score 10/10 on all dimensions.

QUESTION:
${question}

YOUR TASK:
Provide a COMPREHENSIVE, perfect 10/10 answer using proper markdown formatting.

FORMAT YOUR ANSWER WITH MARKDOWN:
- Use ## for main section headings (e.g., ## 🧭 Problem Clarification)
- Use **bold** for key terms, frameworks, and important points
- Use *italics* for emphasis and nuanced points
- Use - or • for bullet points
- Use numbered lists (1., 2., 3.) for sequential steps
- Use > for quotes or key insights
- Use proper paragraph breaks for readability

STRUCTURE YOUR ANSWER:

## 🧭 Problem Clarification
- Clarify scope, constraints, and assumptions
- Define success criteria upfront
- **Key considerations:** List main factors
- 2-3 well-structured paragraphs with bold emphasis

## 🎯 User Research & Insights
- **Target user segments:** Define personas clearly
- **User needs and pain points:** Use bullet points
- **Jobs-to-be-done framework:** What users are trying to accomplish
- **Competitive landscape:** How alternatives compare
- 3-4 paragraphs with bullet points and bold terms

## 💡 Product Vision & Strategy
- **North Star Metric:** Define primary success metric
- **Strategic goals:** Short and long-term objectives
- **Product positioning:** How it differentiates
- **Long-term vision:** Where this product goes
- 2-3 paragraphs with clear structure

## 🧩 Solution & Features
- **Core product concept:** What we're building
- **Feature breakdown:**
  1. Feature A: Description with **key benefit**
  2. Feature B: Description with rationale
  3. Feature C: Description with priority
- **MVP definition:** What ships first
- **Phased approach:** How we scale
- 4-5 paragraphs with numbered or bulleted lists

## 📈 Success Metrics
- **Primary Metric (NSM):** Define and justify
- **Supporting metrics:**
  - Metric 1: What it measures
  - Metric 2: Why it matters
  - Metric 3: Target thresholds
- **Guardrail metrics:** What we monitor to avoid negative impact
- 2-3 paragraphs with clear bullet structure

## 🚀 Execution & Roadmap
- **Go-to-market strategy:** How we launch
- **Phase 1:** Initial rollout (timeline + goals)
- **Phase 2:** Scaling (timeline + goals)
- **Phase 3:** Optimization (timeline + goals)
- **Key milestones:** Checkpoints and success criteria
- 2-3 paragraphs with clear phases

## 🧠 Risks & Mitigation
- **Technical risks:**
  - Risk A → *Mitigation strategy*
  - Risk B → *Mitigation strategy*
- **Market/business risks:**
  - Risk C → *Mitigation strategy*
  - Risk D → *Mitigation strategy*
- **Contingency plans:** What if things go wrong
- 2-3 paragraphs with bullet points

STYLE GUIDELINES:
- Write 15-20 well-structured paragraphs total
- Use markdown consistently throughout
- Bold important terms, metrics, and frameworks
- Use bullet points for lists and options
- Use numbered lists for sequential steps or phases
- Break up text with headings and lists for readability
- Keep it comprehensive but scannable
- Make it look professional like ChatGPT's formatted responses`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      {
        role: 'system',
        content:
          'You are a senior PM candidate giving a perfect 10/10 interview answer. Use proper markdown formatting: ## for headings, **bold** for emphasis, bullet points, numbered lists. Be comprehensive, structured, and professional.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return completion.choices[0].message.content;
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
  generateModelAnswer,
  SCORING_PROMPT_TEMPLATE,
};
