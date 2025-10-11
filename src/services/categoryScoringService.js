/**
 * Category-specific scoring rubrics for different PM interview question types
 * Each category has tailored dimensions and evaluation criteria
 * Tone: Direct interviewer feedback (not AI assistant)
 */

/**
 * Category dimension definitions with weights
 */
const CATEGORY_DIMENSIONS = {
  product_design: {
    user_research: { weight: 0.2, name: 'User Research' },
    problem_definition: { weight: 0.15, name: 'Problem Definition' },
    solution_ideation: { weight: 0.2, name: 'Solution Ideation' },
    prioritization: { weight: 0.15, name: 'Prioritization' },
    metrics: { weight: 0.15, name: 'Metrics' },
    execution: { weight: 0.15, name: 'Execution' },
  },
  root_cause_analysis: {
    problem_framing: { weight: 0.2, name: 'Problem Framing' },
    hypothesis_generation: { weight: 0.2, name: 'Hypothesis Generation' },
    data_analysis: { weight: 0.2, name: 'Data Analysis' },
    root_cause_identification: { weight: 0.15, name: 'Root Cause Identification' },
    solution_prioritization: { weight: 0.15, name: 'Solution Prioritization' },
    implementation: { weight: 0.1, name: 'Implementation' },
  },
  metrics: {
    goal_clarity: { weight: 0.15, name: 'Goal Clarity' },
    metric_selection: { weight: 0.25, name: 'Metric Selection' },
    data_analysis: { weight: 0.2, name: 'Data Analysis' },
    ab_testing: { weight: 0.15, name: 'A/B Testing' },
    insights: { weight: 0.15, name: 'Insights' },
    business_impact: { weight: 0.1, name: 'Business Impact' },
  },
  product_improvement: {
    user_research: { weight: 0.25, name: 'User Research' },
    pain_point_identification: { weight: 0.2, name: 'Pain Point Identification' },
    solution_prioritization: { weight: 0.2, name: 'Solution Prioritization' },
    mvp_definition: { weight: 0.15, name: 'MVP Definition' },
    metrics: { weight: 0.1, name: 'Metrics' },
    iteration: { weight: 0.1, name: 'Iteration' },
  },
  product_strategy: {
    market_analysis: { weight: 0.2, name: 'Market Analysis' },
    competitive_positioning: { weight: 0.2, name: 'Competitive Positioning' },
    strategic_framework: { weight: 0.2, name: 'Strategic Framework' },
    resource_allocation: { weight: 0.15, name: 'Resource Allocation' },
    risk_assessment: { weight: 0.15, name: 'Risk Assessment' },
    execution: { weight: 0.1, name: 'Execution' },
  },
  guesstimates: {
    framework_selection: { weight: 0.2, name: 'Framework Selection' },
    assumption_quality: { weight: 0.25, name: 'Assumption Quality' },
    calculation_logic: { weight: 0.25, name: 'Calculation Logic' },
    sanity_check: { weight: 0.15, name: 'Sanity Check' },
    communication: { weight: 0.15, name: 'Communication' },
  },
};

/**
 * Generate category-specific rubric prompt
 */
function generateCategoryRubric(categoryName, categoryKey) {
  const dimensions = CATEGORY_DIMENSIONS[categoryKey];
  const dimensionList = Object.entries(dimensions)
    .map(([key, dim]) => `- **${dim.name}** (${Math.round(dim.weight * 100)}%)`)
    .join('\n');

  return (question, answer) => `
I'm your interviewer today - a Senior PM at a top tech company (Google, Meta, Amazon, Stripe). I've conducted 200+ PM interviews and I'm here to give you honest, actionable feedback on your ${categoryName} answer.

EVALUATION APPROACH:
I'll evaluate your answer across ${
    Object.keys(dimensions).length
  } key dimensions that matter in real PM interviews:

${dimensionList}

**Scoring Calibration:**
Most candidates in practice sessions score 6-7/10. I'll give 8+ only for answers that would genuinely impress in a real interview. Scores of 4-5 indicate significant gaps that need work. Be honest with yourself about where you stand.

---

QUESTION:
${question}

YOUR ANSWER:
${answer}

---

YOUR ANSWER EVALUATION:

Now let me walk through your answer and give you specific feedback on what worked and what didn't.

## DIMENSION SCORES

${Object.entries(dimensions)
  .map(([key, dim]) => `**${dim.name}:** [Score 0-10] - [One sentence rationale]`)
  .join('\n')}

**Overall Score:** [Weighted average]/10

---

## DETAILED ANALYSIS

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

OUTPUT FORMAT (JSON):
{
  "overall_score": 0-10,
  "dimension_scores": {
    ${Object.keys(dimensions)
      .map(key => `"${key}": { "score": 0-10, "rationale": "brief reason" }`)
      .join(',\n    ')}
  },
  "feedback_text": "[Full markdown formatted feedback with ## headings, **bold**, bullets as shown above]",
  "strengths": [
    "Specific strength with concrete example",
    "Another strength with example",
    "Third strength if applicable"
  ],
  "gaps": [
    "Gap 1: Why it matters → What to do instead",
    "Gap 2: Why it matters → What to do instead",
    "Gap 3: Why it matters → What to do instead",
    "Gap 4-6: Continue pattern"
  ],
  "brutal_truth": "One sentence summary of performance"
}

---

TONE GUIDELINES:
- Speak as an interviewer, not an AI ("I noticed..." not "The candidate demonstrated...")
- Be direct and specific with examples from their actual answer
- Quote their exact words when analyzing
- Be encouraging but honest about gaps
- Provide actionable advice, not generic platitudes
- Educational tone: average score 6-7/10, not harsh FAANG standard

STRICT RULES:
- Always output pure JSON only
- No markdown formatting inside JSON strings (use plain text)
- Be specific with dimension rationales (not "good structure" but "used CIRCLES framework effectively")
- Gaps should be actionable (not "lacks depth" but "no success metrics defined - should specify X% increase in Y")
- Overall score = weighted average of dimension scores
- Include 5-8 analysis steps depending on answer depth
- Include 2-4 strengths and 3-6 gaps
`;
}

/**
 * Category-specific prompts
 */
const CATEGORY_SCORING_PROMPTS = {
  product_design: generateCategoryRubric('Product Design', 'product_design'),
  product_strategy: generateCategoryRubric('Product Strategy', 'product_strategy'),
  metrics: generateCategoryRubric('Metrics', 'metrics'),
  root_cause_analysis: generateCategoryRubric('Root Cause Analysis', 'root_cause_analysis'),
  product_improvement: generateCategoryRubric('Product Improvement', 'product_improvement'),
  guesstimates: generateCategoryRubric('Guesstimates', 'guesstimates'),
};

/**
 * Get the appropriate scoring prompt based on question category
 */
function getCategoryScoringPrompt(question, answer, category) {
  const promptFunction = CATEGORY_SCORING_PROMPTS[category];
  return promptFunction ? promptFunction(question, answer) : null;
}

/**
 * Get dimension definitions for a category
 */
function getCategoryDimensions(category) {
  return CATEGORY_DIMENSIONS[category] || null;
}

module.exports = {
  getCategoryScoringPrompt,
  getCategoryDimensions,
  CATEGORY_SCORING_PROMPTS,
  CATEGORY_DIMENSIONS,
};
