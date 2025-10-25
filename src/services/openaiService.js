const openai = require('../config/openai');

/**
 * Enhanced PM Interview Answer Evaluator
 * Interviewer-style feedback (not AI assistant tone)
 */
const SCORING_PROMPT_TEMPLATE = (question, answer) => `
I'm your interviewer today - a Senior PM at a top tech company (Google, Meta, Amazon, Stripe). I've conducted 200+ PM interviews and I'm here to give you honest, actionable feedback on your answer.

**SCORING GUIDANCE:**
Evaluate each answer on its own merit using the full 0-10 scale. Strong answers with clear structure, data-driven thinking, and user focus should score 8-10. Adequate answers with some gaps score 5-7. Weak answers with significant issues score 0-4. Be honest and fair - reward quality where you see it.

---

QUESTION:
${question}

YOUR ANSWER:
${answer}

---

YOUR ANSWER EVALUATION:

Let me walk through your answer and give you specific feedback on what worked and what didn't.

**FORMAT YOUR FEEDBACK WITH MARKDOWN:**
- Use ## for main section headings (ANSWER EVALUATION, YOUR STRENGTHS, CRITICAL GAPS TO ADDRESS, BOTTOM LINE)
- Use ### for subsection headings within sections (Step 1, Step 2, etc.)
- Use **bold** for key terms, dimension names, issues, and important points
- Use *italics* for emphasis and examples
- Use - or • for bullet points
- Use numbered lists when appropriate
- Use proper paragraph breaks for readability

**EXAMPLE FORMATTING:**
## ANSWER EVALUATION

### Step 1: Problem Clarification
**What you did:** You mentioned "users want faster checkout" but didn't clarify *which* users or *what specific friction* they face.

**What was missing:** No user segmentation or data to validate the problem.

**Impact:** Without user context, solutions risk being generic and miss the mark.

---

PROVIDE FEEDBACK WITH THIS STRUCTURE:

## ANSWER EVALUATION

I'm going to walk through your answer step-by-step and show you what you did well and what you missed:

### Step 1: [First key aspect to evaluate]
- **What you did:** [Specific quote/example from their answer or note if missing]
- **What was missing:** [Specific gap with example of what they should have included]
- **Impact:** [Why this matters in an interview]

### Step 2: [Second key aspect]
- **What you did:** [Specific analysis]
- **What was missing:** [Specific gap]
- **Impact:** [Why this matters]

### Step 3: [Third key aspect]
- **What you did:** [Specific analysis]
- **What was missing:** [Specific gap]
- **Impact:** [Why this matters]

### Step 4: [Fourth key aspect]
- **What you did:** [Specific analysis]
- **What was missing:** [Specific gap]
- **Impact:** [Why this matters]

### Step 5: [Fifth key aspect]
- **What you did:** [Specific analysis]
- **What was missing:** [Specific gap]
- **Impact:** [Why this matters]

[Continue for 5-8 key steps depending on question complexity]

**For each step:**
- Quote exact phrases from their answer when analyzing
- Be specific about gaps (not "lacks detail" but "no success metrics defined - should specify X% increase in Y")
- Use **bold** for critical issues
- Speak directly to them ("You did..." not "The candidate did...")

---

## YOUR STRENGTHS

I noticed these strong points in your answer:

- **[Specific strength]:** [Concrete example from their answer showing why this was good]
- **[Another strength]:** [Another concrete example]
- **[Third strength if applicable]:** [Example]

---

## CRITICAL GAPS TO ADDRESS

Here's what would hurt you in a real interview:

- **[Gap 1]:** [Why it matters] → [What to do instead with specific example]
- **[Gap 2]:** [Why it matters] → [What to do instead]
- **[Gap 3]:** [Why it matters] → [What to do instead]
- **[Gap 4]:** [Why it matters] → [What to do instead]
- **[Gap 5-6 if applicable]:** [Continue pattern]

---

## BOTTOM LINE

[One sentence brutal truth about their performance and what they need to focus on]

---

**CRITICAL: YOU MUST PROVIDE dimension_scores FOR EVERY ANSWER**
The dimension_scores object is MANDATORY. Score each dimension independently based on the rubric.

OUTPUT FORMAT (JSON):
{
  "overall_score": 0-10,
  "summary_feedback": "Brief 2-3 sentence summary of your performance and main areas to focus on. Keep it concise and actionable.",
  "detailed_feedback": "## ANSWER EVALUATION\n\nI'm going to walk through your answer step-by-step and show you what you did well and what you missed:\n\n### Step 1: [aspect]\n**What you did:** [specific quote or note]\n\n**What was missing:** [specific gap]\n\n**Impact:** [why it matters]\n\n### Step 2: [aspect]\n**What you did:** [specific]\n\n**What was missing:** [specific]\n\n**Impact:** [why it matters]\n\n[Continue for 5-8 steps with proper markdown]\n\n---\n\n## YOUR STRENGTHS\n\nI noticed these strong points in your answer:\n\n- **[Strength 1]:** [Concrete example]\n- **[Strength 2]:** [Another example]\n\n---\n\n## CRITICAL GAPS TO ADDRESS\n\nHere's what would hurt you in a real interview:\n\n- **[Gap 1]:** [Why it matters] → [What to do instead]\n- **[Gap 2]:** [Why it matters] → [What to do instead]\n\n---\n\n## BOTTOM LINE\n\n[One sentence truth]",
  "dimension_scores": {
    "structure": 0-10 [REQUIRED - Rate problem framing, organization, and logical flow],
    "metrics": 0-10 [REQUIRED - Rate data-driven thinking and success metrics],
    "prioritization": 0-10 [REQUIRED - Rate decision-making and trade-off analysis],
    "user_empathy": 0-10 [REQUIRED - Rate understanding of user needs and pain points],
    "communication": 0-10 [REQUIRED - Rate clarity, coherence, and presentation]
  },
  "strengths": [
    "Specific strength with concrete example from answer",
    "Another strength with example",
    "Third strength if applicable"
  ],
  "gaps": [
    "Gap 1: Why it matters → What to do instead",
    "Gap 2: Why it matters → What to do instead",
    "Gap 3: Why it matters → What to do instead",
    "Gap 4-6: Continue pattern"
  ],
  "brutal_truth": "One sentence summary of performance and focus area"
}

**SCORING RUBRIC FOR EACH DIMENSION (EVALUATE INDEPENDENTLY!):**

⚠️ CRITICAL: Score each dimension separately based on what you observe. An answer can have high structure but low metrics - this is NORMAL. Do NOT give all dimensions the same score!

- **structure** (0-10): How well did they frame the problem and organize their answer?
  - 9-10: Crystal clear framework, logical flow, addressed all key aspects
  - 7-8: Good structure with minor gaps
  - 5-6: Basic structure but missing organization or key sections
  - 3-4: Weak structure, hard to follow
  - 0-2: No clear structure or framework

- **metrics** (0-10): How data-driven is their thinking? (Look for numbers, percentages, KPIs)
  - 9-10: Specific metrics defined, quantified targets, measurement approach clear
  - 7-8: Good metrics but missing quantification or measurement details
  - 5-6: Mentioned metrics but vague or generic
  - 3-4: Weak metrics thinking
  - 0-2: No metrics or data-driven thinking

- **prioritization** (0-10): How well did they prioritize and make trade-offs? (Look for frameworks, criteria)
  - 9-10: Clear prioritization framework, justified trade-offs, considered constraints
  - 7-8: Good prioritization with minor gaps
  - 5-6: Basic prioritization but weak justification
  - 3-4: Poor prioritization logic
  - 0-2: No prioritization or all options treated equally

- **user_empathy** (0-10): How well did they understand users? (Look for user needs, pain points, personas)
  - 9-10: Deep user insights, specific pain points, persona definition, empathetic approach
  - 7-8: Good user understanding with minor gaps
  - 5-6: Basic user awareness but generic
  - 3-4: Weak user understanding
  - 0-2: No user consideration or highly company-centric

- **communication** (0-10): How clear and compelling was their delivery? (Clarity, conciseness, flow)
  - 9-10: Exceptionally clear, concise, persuasive, easy to follow
  - 7-8: Good communication with minor areas for improvement
  - 5-6: Understandable but could be clearer
  - 3-4: Hard to follow or verbose
  - 0-2: Confusing or incoherent

EXAMPLE: An answer might be structured well (structure: 8) but lack metrics (metrics: 3) and prioritization (prioritization: 4) while being clear (communication: 7) and user-focused (user_empathy: 8). This is NORMAL - score based on actual observations!

---

TONE & STYLE:
- Speak as an interviewer, not an AI ("I noticed..." not "The candidate demonstrated...")
- Be direct and specific with examples from their actual answer
- Quote their exact words when analyzing
- Be encouraging but honest about gaps
- **CRITICAL: Use markdown in feedback_text** (## for sections, ### for steps, **bold**, *italics*, bullets)
- Use → arrows for cause-effect in gaps section
- Be fair and balanced: use the full scoring range (0-10) based on answer quality

STRICT RULES:
- Always output pure JSON only
- **USE MARKDOWN FORMATTING IN feedback_text field** (## headings, ### subsections, **bold**, *italics*, bullets)
- Be specific with examples (not "lacks depth" but "no success metrics defined - should specify X% increase in Y")
- Gaps should be actionable (not generic platitudes)
- Include 5-8 analysis steps depending on answer depth
- Include 2-4 strengths and 3-6 gaps
- Speak directly: "You did..." not "The candidate did..."
- Use the full 0-10 scale fairly: reward strong answers (8-10), identify adequate ones (5-7), flag weak ones (0-4)
- **Format each step with proper paragraph breaks between What you did / What was missing / Impact**
`;

/**
 * RCA-Specific PM Interview Answer Evaluator
 * Evaluates both clarifying questions AND final answer for Root Cause Analysis
 */
const RCA_SCORING_PROMPT_TEMPLATE = (question, answer, conversationHistory = []) => `
I'm your interviewer today - a Senior PM at a top tech company with extensive experience in Root Cause Analysis. I've conducted 200+ PM interviews and I'm here to give you honest, actionable feedback on your RCA performance.

**SCORING GUIDANCE FOR RCA:**
This is a Root Cause Analysis question. Evaluate BOTH the quality of clarifying questions asked AND the final answer. Strong RCA performance requires:
1. **Systematic investigation** through clarifying questions (50% weight)
2. **Structured final answer** using RCA framework (50% weight)

---

QUESTION:
${question}

CLARIFYING QUESTIONS & INVESTIGATION:
${
  conversationHistory.length > 0
    ? conversationHistory
        .map((msg, idx) => `${msg.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${msg.content}`)
        .join('\n\n')
    : 'No clarifying questions were asked.'
}

FINAL ANSWER:
${answer}

---

**EVALUATION FRAMEWORK:**

## PART 1: CLARIFYING QUESTIONS EVALUATION (50% weight)

Assess the quality and breadth of their investigation through clarifying questions:

### Investigation Coverage (Score: 0-10)
- **External Factors Explored:**
  - Did they ask about competitors, market trends, external events?
  - Depth of questioning in this area?
  
- **Internal Factors Explored:**
  - Technical issues (bugs, deployments, infrastructure)?
  - Product changes (new features, UI changes, flows)?
  - Operational changes (pricing, policies, team)?
  
- **Data Requests:**
  - Timeline and magnitude (when did it start, how big is the drop)?
  - Scope (platform, geography, user segments affected)?
  - Related metrics (what else is impacted)?
  - Funnel analysis (where in the user journey)?

### Framework & Methodology (Score: 0-10)
- Did they show systematic investigation approach (5 Whys, Fishbone, user journey)?
- Did they move from broad hypotheses to specific investigation?
- Did they prioritize high-impact hypotheses first?

**Clarifying Questions Score:** /10 (average of coverage and methodology)

---

## PART 2: FINAL ANSWER EVALUATION (50% weight)

Evaluate their final answer using the RCA framework:

### Step 1: Problem Definition
- **What you did:** [Did they clearly define the problem scope, metrics affected, magnitude?]
- **What was missing:** [Gaps in problem clarification]
- **Impact:** [Why this matters]

### Step 2: Hypothesis Formation
- **What you did:** [Did they formulate broad hypotheses covering external AND internal factors?]
- **What was missing:** [Missing hypothesis categories]
- **Impact:** [Why this matters]

### Step 3: Investigation Approach
- **What you did:** [Did they describe data-driven investigation, prioritization, user journey mapping?]
- **What was missing:** [Gaps in investigation methodology]
- **Impact:** [Why this matters]

### Step 4: Root Cause Identification
- **What you did:** [Did they pinpoint the root cause with evidence?]
- **What was missing:** [Lack of evidence or multiple causes not addressed]
- **Impact:** [Why this matters]

### Step 5: Solution Proposal
- **What you did:** [Short-term fix AND long-term prevention?]
- **What was missing:** [Missing immediate action or systemic fixes]
- **Impact:** [Why this matters]

### Step 6: Success Metrics
- **What you did:** [Did they define how to measure success of the fix?]
- **What was missing:** [Lack of concrete metrics]
- **Impact:** [Why this matters]

**Final Answer Score:** /10

---

## YOUR STRENGTHS

I noticed these strong points in your RCA approach:

- **[Specific strength from questions OR answer]:** [Concrete example]
- **[Another strength]:** [Example]
- **[Third strength if applicable]:** [Example]

---

## CRITICAL GAPS TO ADDRESS

Here's what would hurt you in a real RCA interview:

- **[Gap 1]:** [Why it matters] → [What to do instead with specific example]
- **[Gap 2]:** [Why it matters] → [What to do instead]
- **[Gap 3]:** [Why it matters] → [What to do instead]
- **[Gap 4-6 if applicable]:** [Continue pattern]

---

## BOTTOM LINE

[One sentence brutal truth about their RCA performance combining both investigation and final answer quality]

---

**FORMAT YOUR FEEDBACK WITH MARKDOWN:**
- Use ## for main section headings
- Use ### for subsection headings
- Use **bold** for key terms and critical issues
- Use *italics* for emphasis
- Use bullet points and numbered lists
- Use proper paragraph breaks for readability

OUTPUT FORMAT (JSON):
{
  "overall_score": 0-10 [Weighted average: 50% clarifying questions + 50% final answer],
  "summary_feedback": "Brief 2-3 sentence summary covering both investigation quality and final answer",
  "detailed_feedback": "[Full markdown formatted feedback following structure above]",
  "dimension_scores": {
    "problem_definition": 0-10 [Rate how well they clarified scope, timeline, magnitude, and affected metrics],
    "investigation_methodology": 0-10 [Rate systematic investigation - coverage of internal/external factors, framework usage (5 Whys, Fishbone)],
    "data_driven_analysis": 0-10 [Rate quality of data requests and use of data to validate hypotheses],
    "root_cause_identification": 0-10 [Rate ability to identify actual root cause vs symptoms with evidence],
    "solution_quality": 0-10 [Rate solution comprehensiveness - short-term fix, long-term prevention, and success metrics]
  },
  "clarifying_questions_score": 0-10 [Quality of investigation through questions],
  "final_answer_score": 0-10 [Quality of structured final answer],
  "strengths": [
    "Specific strength with example",
    "Another strength with example",
    "Third strength if applicable"
  ],
  "gaps": [
    "Gap 1: Why it matters → What to do instead",
    "Gap 2: Why it matters → What to do instead",
    "Gap 3-6: Continue pattern"
  ],
  "brutal_truth": "One sentence about RCA performance"
}

**RCA SCORING RUBRIC:**

**RCA-Specific Dimension Scoring (Score each independently):**

1. **problem_definition (0-10):**
   - 8-10: Clearly defined scope, timeline, magnitude, and affected metrics through clarifying questions
   - 5-7: Defined some aspects but missed key details (timeline, scope, or magnitude)
   - 0-4: Vague problem definition, didn't clarify scope or magnitude

2. **investigation_methodology (0-10):**
   - 8-10: Systematic approach, covered both internal AND external factors, used frameworks (5 Whys, Fishbone, user journey)
   - 5-7: Some systematic investigation but missed internal OR external factors, limited framework usage
   - 0-4: Random questioning without strategy, no framework, missed major factor categories

3. **data_driven_analysis (0-10):**
   - 8-10: Asked for relevant data (user segments, funnel analysis, related metrics), used data to validate hypotheses
   - 5-7: Asked for some data but missed key metrics or didn't use data to validate
   - 0-4: Minimal data requests, didn't validate with data

4. **root_cause_identification (0-10):**
   - 8-10: Identified actual root cause (not just symptoms) with clear evidence from investigation
   - 5-7: Identified a cause but may have confused symptoms with root cause, weak evidence
   - 0-4: Only identified symptoms, no clear root cause, no evidence

5. **solution_quality (0-10):**
   - 8-10: Comprehensive solution with short-term fix, long-term prevention, and clear success metrics
   - 5-7: Has solution but missing either immediate fix, prevention strategy, or metrics
   - 0-4: Vague solution, no prevention strategy, no success metrics

**Overall Scoring:**
- **Clarifying Questions (50%):** Based on problem_definition + investigation_methodology + data_driven_analysis
- **Final Answer (50%):** Based on all 5 dimensions with emphasis on root_cause_identification + solution_quality
- **Overall Score:** Weighted average (50% clarifying questions + 50% final answer)

STRICT RULES:
- Always output pure JSON only
- Use markdown formatting in detailed_feedback field
- Score each RCA dimension independently (don't give all dimensions the same score)
- Be specific with examples from their clarifying questions AND answer
- Evaluate clarifying questions separately from final answer
- Include both scores in response: clarifying_questions_score and final_answer_score
- Overall score is weighted average (50-50 split)
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
          'You are a senior PM interviewer at a top-tier tech company. You are professional, sharp, analytical, and critical. Always respond with valid JSON only. Be brutally honest in your feedback. CRITICAL SCORING REQUIREMENTS: 1) You MUST score EACH dimension INDEPENDENTLY - evaluate structure, metrics, prioritization, user_empathy, and communication separately. 2) Each dimension should have a DIFFERENT score reflecting specific observations. 3) An answer might have strong structure (8-9) but weak metrics (3-4) - score accordingly. 4) Look for specific evidence in each dimension before scoring. 5) DO NOT give all dimensions the same score - that indicates you are not evaluating independently.',
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
 * Call OpenAI API to score an answer with summarised feedback (faster)
 * @param {string} question - The interview question
 * @param {string} answer - The candidate's answer
 * @returns {Promise<Object>} Parsed score object with summarised feedback
 */
async function callOpenAIForSummarisedScoring(question, answer, customPrompt = null) {
  // Create a much shorter, focused prompt for summarised scoring
  const summarisedPrompt = `
You are a senior PM interviewer at a top tech company. Provide SHORT, CONCISE feedback for this interview answer.

QUESTION:
${question}

ANSWER:
${answer}

---

PROVIDE BRIEF FEEDBACK (2-3 SENTENCES PER SECTION):

1. **Quick Take (2-3 sentences):** Overall assessment - what worked and what didn't.

2. **Top Strengths (2-3 bullets, one line each):** Most notable strong points.

3. **Critical Gaps (2-3 bullets, one line each):** Most important issues to fix.

4. **Bottom Line (1-2 sentences):** Main takeaway and focus area.

Keep it SHORT and ACTIONABLE. This is a quick summary - detailed feedback is provided separately.

OUTPUT FORMAT (JSON):
{
  "overall_score": <number 0-10>,
  "dimension_scores": {
    "structure": <number 0-10>,
    "metrics": <number 0-10>,
    "prioritization": <number 0-10>,
    "user_empathy": <number 0-10>,
    "communication": <number 0-10>
  },
  "summary_feedback": "<concise markdown feedback following the structure above - keep each section to 2-3 sentences or bullets>",
  "detailed_feedback": ""
}

CRITICAL SCORING RULES:
1. Score EACH dimension independently based on what you observe in the answer
2. Structure: How well organized and logical is the answer?
3. Metrics: Are there data points, measurements, or quantified goals?
4. Prioritization: Do they show clear decision-making and trade-offs?
5. User Empathy: Do they consider user needs and pain points?
6. Communication: How clear and articulate is the explanation?
7. DO NOT give all dimensions the same score - evaluate each separately
8. Use the full 0-10 range: 8-10 for strong, 5-7 for adequate, 0-4 for weak
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Using GPT-4o-mini for faster summarised feedback
    messages: [
      {
        role: 'system',
        content:
          'You are a senior PM interviewer providing CONCISE feedback. Respond with valid JSON only. CRITICAL REQUIREMENTS: 1) You MUST score each dimension (structure, metrics, prioritization, user_empathy, communication) INDEPENDENTLY - each dimension should have a DIFFERENT score based on what you observe. 2) Structure: logical organization. 3) Metrics: data/numbers. 4) Prioritization: decision-making/trade-offs. 5) User Empathy: user focus. 6) Communication: clarity. 7) Keep feedback SHORT (2-3 sentences per section). 8) Use full 0-10 scale.',
      },
      {
        role: 'user',
        content: summarisedPrompt,
      },
    ],
    temperature: 0.8, // Slightly higher for more variation in scores
    max_tokens: 1500, // Reduced for shorter, more concise feedback
    response_format: { type: 'json_object' }, // Enforce JSON mode
  });

  const content = completion.choices[0].message.content;
  const tokensUsed = completion.usage.total_tokens;

  console.log('OpenAI Summarised Scoring Response Length:', content.length, 'characters');
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

  // Check for new interviewer-style format with dimension_scores object
  const hasInterviewerFormat =
    'dimension_scores' in parsed &&
    typeof parsed.dimension_scores === 'object' &&
    'feedback_text' in parsed &&
    'gaps' in parsed;

  // Build required fields based on format detected
  const requiredFields = [];

  if (hasChatGPTFormat) {
    requiredFields.push('dimension_scores', 'feedback_text', 'reframed_answer', 'brutal_truth');
  } else if (hasInterviewerFormat) {
    requiredFields.push('dimension_scores', 'feedback_text', 'strengths', 'gaps', 'brutal_truth');
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
    // For other formats (including summarised), require overall_score and feedback
    requiredFields.push('overall_score');
    const hasFeedback = parsed.summary_feedback || parsed.detailed_feedback || parsed.feedback;
    if (!hasFeedback) {
      requiredFields.push('feedback'); // Will fail validation if no feedback provided
    }
  }

  // Log warning if dimension_scores is missing (we prefer it for accurate scoring)
  if (!parsed.dimension_scores && parsed.overall_score) {
    console.warn(
      '⚠️  AI response missing dimension_scores - will use overall_score fallback. This may affect scoring accuracy.'
    );
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
    !hasChatGPTFormat &&
    !hasInterviewerFormat
  ) {
    // Try to find any scoring fields
    const scoringFields = Object.keys(parsed).filter(
      key => typeof parsed[key] === 'number' && key !== 'overall_score'
    );

    // Check if we have overall_score as a fallback
    const hasOverallScore = 'overall_score' in parsed && typeof parsed.overall_score === 'number';

    if (scoringFields.length === 0 && !hasOverallScore) {
      console.error('VALIDATION ERROR - Received keys:', Object.keys(parsed));
      console.error('VALIDATION ERROR - Full response:', JSON.stringify(parsed, null, 2));
      throw new Error(
        `Missing required scoring fields. Expected one of: old format (${oldFields.join(
          ', '
        )}) or any category format. Received keys: ${Object.keys(parsed).join(', ')}`
      );
    }

    if (scoringFields.length === 0 && hasOverallScore) {
      // Valid summarised format with only overall_score
      console.log('✅ Summarised format detected: overall_score only (no dimension breakdown)');
    } else if (scoringFields.length > 0) {
      // If we have scoring fields but they don't match known formats, log a warning but allow it
      console.warn(
        'WARNING: Unknown field format detected, using fallback scoring. Fields:',
        Object.keys(parsed)
      );
    }
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

  // Validate dimension_scores if present (new interviewer format)
  if (hasInterviewerFormat && parsed.dimension_scores) {
    for (const [dimension, scoreObj] of Object.entries(parsed.dimension_scores)) {
      if (typeof scoreObj === 'object' && scoreObj.score !== undefined) {
        const score = scoreObj.score;
        if (typeof score !== 'number' || score < 0 || score > 10) {
          throw new Error(
            `Invalid dimension score for ${dimension}: must be a number between 0 and 10`
          );
        }
      }
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
1. **Give short, direct answers** to clarifying questions (1-2 sentences max)
2. **Be conversational and natural** like a real interviewer
3. **Provide specific details** when asked (target users, market, constraints, metrics, etc.)
4. **Use simple formatting** - only use **bold** for key terms when needed
5. **Do NOT use bullet points or structured lists** - keep it conversational
6. **Do NOT ask questions back** to the candidate
7. **Do NOT give lengthy explanations** - just answer what they asked

Examples of good responses:
- "For this scenario, assume you're targeting enterprise customers with 1000+ employees."
- "The current conversion rate is around 15% and you want to improve it to 25%."
- "You have a team of 3 engineers and 2 months to implement this."

Remember: Keep it short, direct, and conversational like a real interviewer would respond.`;

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...conversationHistory,
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Using GPT-4o-mini for faster clarification responses
    messages: messages,
    temperature: 0.7, // Slightly creative but consistent
    max_tokens: 1000, // Reasonable limit for clarification responses
  });

  const response = completion.choices[0].message.content;
  const tokensUsed = completion.usage.total_tokens;

  return { response, tokensUsed };
}

/**
 * Call OpenAI API for RCA-specific clarification
 * Generates hypothetical data and guides systematic investigation
 * @param {string} question - The original RCA interview question
 * @param {Array} conversationHistory - Array of {role, content} message objects
 * @returns {Promise<string>} AI response to the clarification
 */
async function callOpenAIForRCAClarification(question, conversationHistory) {
  const systemPrompt = `You are an experienced Product Management interviewer conducting a Root Cause Analysis (RCA) interview. 
The candidate has been asked the following question:

"${question}"

Your role is to:
1. **Generate realistic hypothetical data** when the candidate asks for metrics, numbers, or data points
   - DO NOT use real internet data - make up believable numbers
   - Examples: "15% drop over 3 months", "from 50K to 42.5K daily active users", "$2.3M in monthly revenue"
   - Be consistent - if you say something dropped by 15%, maintain that number throughout the conversation

2. **Store and remember the data you provide** to maintain consistency
   - Reference your previous responses: "As I mentioned, the 15% drop started in January..."
   - Build on the hypothetical scenario you're creating

3. **Be conversational and realistic** like a real interviewer:
   - Keep responses 1-3 sentences for simple questions
   - Provide more detail when asked about specific areas (timeline, scope, magnitude, related metrics)
   - Use phrases like: "Our data shows...", "Looking at the analytics...", "From what we can see..."

4. **Do NOT ask questions back to the candidate**
   - Simply answer what they asked
   - Do NOT prompt them with follow-up questions like "What else would you want to know?" or "Does that help narrow it down?"
   - Do NOT guide them with questions - they should drive the investigation
   - Just provide the information requested

5. **Subtly encourage investigation through your answers** (without asking questions):
   - When appropriate, mention related areas they might want to explore
   - Example: "The drop started in January across all platforms" (instead of "Does that suggest anything?")
   - Let them decide what to investigate next based on your answers

Examples of good RCA responses:
- "Looking at our data, DAUs dropped from 50K to 42.5K - that's a 15% decline starting in mid-January."
- "The drop affected both iOS and Android equally, around 15% on each platform."
- "We did deploy a new onboarding flow on January 10th, which changed the signup process significantly."
- "Conversion rate at checkout dropped from 8% to 6.8%. No major competitor launched anything new that we're aware of."
- "By 'Live Audio metrics,' I mean the number of live sessions, listener counts, and engagement during those sessions. We've seen a 30% increase in live sessions, and listener counts rose from 200K to 260K in the past three months."

Remember: Generate believable hypothetical data, stay consistent, answer only what was asked, and DO NOT ask questions back to the candidate.`;

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...conversationHistory,
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    temperature: 0.7, // Balanced for consistency and creativity
    max_tokens: 1500, // More tokens for detailed RCA responses
  });

  const response = completion.choices[0].message.content;
  const tokensUsed = completion.usage.total_tokens;

  return { response, tokensUsed };
}

module.exports = {
  callOpenAIForScoring,
  callOpenAIForSummarisedScoring,
  parseAndValidateScore,
  callOpenAIForClarification,
  callOpenAIForRCAClarification,
  generateModelAnswer,
  SCORING_PROMPT_TEMPLATE,
  RCA_SCORING_PROMPT_TEMPLATE,
};
