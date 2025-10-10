/**
 * Category-specific scoring prompts for different PM interview question types
 * Enhanced with detailed strengths/weaknesses breakdown like ChatGPT feedback style
 */

/**
 * Generate enhanced feedback format prompt for any category
 */
function generateEnhancedPrompt(categoryName, categoryFocus, evaluationDimensions, dimensionNames) {
  return (question, answer) => `
ROLE:
You are a senior Product Manager interviewer at a top-tier tech company (Google, Meta, Amazon, Stripe).
You've conducted 500+ PM interviews and specialize in ${categoryFocus}.
Your feedback style is direct, structured, and actionable — like giving real interview debrief notes.

---

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

---

YOUR TASK:
Provide a **brutal interview-style review** for this ${categoryName} question with the following structure:

## ✅ STRENGTHS (2-4 bullets)
- What they did well (be specific, cite examples from their answer)
- Good frameworks or approaches they used
- Areas where they showed strong PM thinking

## ❌ WEAKNESSES (4-6 bullets with detailed explanations)
For each weakness:
1. State the issue clearly
2. Explain WHY it's a problem in a real interview
3. Show what they should have done instead

Examples of good weakness feedback:
- "Persona too broad → '27-year-old professional' is generic. Sharper: 'Busy consultant commuting daily, uses Spotify for music but defaults to YouTube for podcasts.'"
- "NSM is weak → 'Time spent' is vanity metric. Better: '% of sessions with ≥80% listen-through' (shows real engagement)."
- "MVP confused → Exclusive partnerships = business deal, not product experiment. Stick to product-led features."

## 🚀 PASS-LEVEL ANSWER (Reframed)
Provide a complete rewrite showing best practices for ${categoryName}:
${evaluationDimensions}

## ⚡ BRUTAL TRUTH
One sentence summarizing: "Your raw answer = X (reason). Reframed = Y (reason)."
Example: "Your raw answer = borderline pass (good instincts but feature-dumpy + weak metrics). Reframed = solid pass (focused MVP, outcome-driven NSM)."

---

SCORING (0-10 for each):
${dimensionNames.map((dim, i) => `${i + 1}. **${dim}**`).join('\n')}

**Overall Score** = Average of all dimensions (rounded)

---

OUTPUT FORMAT (JSON):
{
  ${dimensionNames.map(dim => `"${dim.toLowerCase().replace(/[^a-z0-9]+/g, '_')}": 0-10`).join(',\n  ')},
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
  "pass_level_answer": "Complete reframed answer with best practices. Should be 4-8 sentences, well-structured.",
  "brutal_truth": "One sentence: 'Your raw answer = X. Reframed = Y.'",
  "model_answer": "Alternative top-tier 10/10 answer (3-5 sentences) showing advanced PM thinking."
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
}

const CATEGORY_SCORING_PROMPTS = {
  product_design: generateEnhancedPrompt(
    'Product Design',
    'product design, user experience, and feature ideation',
    `- **User & Persona**: Specific, concrete user definition with real pain points
- **Innovation & Creativity**: Differentiated solutions that solve real problems
- **Technical Feasibility**: Implementation complexity and scalability
- **User Experience**: Complete journey with edge cases
- **Success Metrics**: Clear, measurable outcomes (not vanity metrics)
- **Iteration Strategy**: Testing, feedback loops, continuous improvement`,
    ['User Centricity', 'Innovation', 'Technical Feasibility', 'User Experience', 'Success Metrics', 'Iteration']
  ),

  root_cause_analysis: (question, answer) => `
ROLE:
You are a senior Product Manager at a top-tier tech company, specializing in data analysis and problem-solving.
You have extensive experience in root cause analysis, metrics investigation, and systematic problem-solving.

OBJECTIVE:
Evaluate this candidate's response to a Root Cause Analysis question. Focus on their systematic approach,
data-driven thinking, and ability to break down complex problems into manageable steps.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Systematic Approach** – Does the candidate use a structured framework (5 Whys, Fishbone, etc.)?
2. **Data-Driven Thinking** – Do they identify relevant metrics, data sources, and analytical methods?
3. **Hypothesis Formation** – Are they generating testable hypotheses about potential causes?
4. **Prioritization** – Do they prioritize investigation steps logically (high-impact, low-effort first)?
5. **Stakeholder Consideration** – Do they consider different user segments and business impact?
6. **Action Planning** – Do they propose concrete next steps and timelines?

Provide:
- **Feedback (2-4 bullets):** Specific gaps in their analytical approach
- **Model Answer:** A 10/10 systematic root cause analysis response
- **Overall Score:** Average of all dimensions

OUTPUT FORMAT (JSON):
Return a clean JSON object with no extra text or commentary. It must follow this exact schema:

{
  "problem_identification": 0-10,
  "analysis_depth": 0-10,
  "data_driven_approach": 0-10,
  "solution_prioritization": 0-10,
  "implementation_planning": 0-10,
  "risk_assessment": 0-10,
  "overall_score": 0-10,
  "feedback": [
    "Short bullet 1 (strength or growth area)",
    "Short bullet 2 (specific improvement advice)",
    "Short bullet 3 (additional feedback)"
  ],
  "model_answer": "Write the ideal 10/10 Product Manager answer. Be comprehensive, structured, and demonstrate advanced PM thinking."
}

All numbers must be integers 0–10. Always include overall_score field.

RESPOND IN VALID JSON FORMAT ONLY.`,

  product_improvement: (question, answer) => `
ROLE:
You are a senior Product Manager with deep expertise in user experience optimization,
feature iteration, and product growth. You've led multiple successful product improvements.

OBJECTIVE:
Evaluate this candidate's approach to product improvement. Focus on user-centric thinking,
measurable impact, and practical implementation strategies.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **User-Centric Approach** – Do they start with user pain points and validate assumptions?
2. **Metrics Definition** – Do they define clear success metrics and measurement methods?
3. **Solution Innovation** – Are their proposed solutions creative yet practical?
4. **Implementation Planning** – Do they consider technical feasibility and resource requirements?
5. **Risk Assessment** – Do they identify potential downsides and mitigation strategies?
6. **Impact Prioritization** – Do they focus on high-impact, achievable improvements?

Provide:
- **Feedback (2-4 bullets):** Areas where their improvement strategy could be stronger
- **Model Answer:** A comprehensive product improvement strategy
- **Overall Score:** Average of all dimensions

OUTPUT FORMAT (JSON):
Return a clean JSON object with no extra text or commentary. It must follow this exact schema:

{
  "user_research_foundation": 0-10,
  "improvement_prioritization": 0-10,
  "solution_innovation": 0-10,
  "implementation_planning": 0-10,
  "metrics_definition": 0-10,
  "iteration_strategy": 0-10,
  "overall_score": 0-10,
  "feedback": [
    "Short bullet 1 (strength or growth area)",
    "Short bullet 2 (specific improvement advice)",
    "Short bullet 3 (additional feedback)"
  ],
  "model_answer": "Write the ideal 10/10 Product Manager answer. Be comprehensive, structured, and demonstrate advanced PM thinking."
}

All numbers must be integers 0–10. Always include overall_score field.

RESPOND IN VALID JSON FORMAT ONLY.`,

  product_design: (question, answer) => `
ROLE:
You are a senior Product Manager at Exponent with expertise in product design, user experience,
and feature ideation. You've designed products used by millions of users and conduct PM interviews
using Exponent's structured rubrics.

OBJECTIVE:
Evaluate this candidate's product design thinking using Exponent's comprehensive evaluation framework.
Focus on user-centricity, innovation, and execution excellence.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EXPONENT-STYLE EVALUATION RUBRIC (Rate 0-10 for each):

**1. User-Centricity & Research (0-10)**
   • 9-10: Demonstrates deep user empathy, identifies specific user personas, validates assumptions with data
   • 7-8: Shows good user understanding, considers user needs throughout the solution
   • 5-6: Basic user consideration but lacks depth in research methodology
   • 3-4: Minimal user focus, assumptions not validated
   • 0-2: No user consideration or completely user-agnostic approach

**2. Innovation & Creativity (0-10)**
   • 9-10: Highly creative, differentiated solutions that solve real problems in novel ways
   • 7-8: Creative approaches with clear differentiation from existing solutions
   • 5-6: Some innovation but solutions are mostly conventional
   • 3-4: Limited creativity, largely derivative solutions
   • 0-2: No innovation, generic or obvious solutions

**3. Technical Feasibility & Implementation (0-10)**
   • 9-10: Considers technical constraints, scalability, and implementation complexity thoroughly
   • 7-8: Good technical awareness with realistic implementation planning
   • 5-6: Basic technical consideration but lacks depth
   • 3-4: Limited technical awareness, unrealistic assumptions
   • 0-2: No technical consideration or completely unrealistic approach

**4. User Experience & Journey Mapping (0-10)**
   • 9-10: Complete user journey consideration with edge cases, accessibility, and seamless flow
   • 7-8: Good UX thinking with most user scenarios covered
   • 5-6: Basic UX consideration but misses important scenarios
   • 3-4: Limited UX thinking, gaps in user experience
   • 0-2: No UX consideration or poor user experience design

**5. Success Metrics & Measurement (0-10)**
   • 9-10: Clear, measurable success metrics with baseline data and tracking methodology
   • 7-8: Good metrics definition with clear measurement approach
   • 5-6: Basic metrics but lacks measurement methodology
   • 3-4: Vague metrics or unclear measurement approach
   • 0-2: No metrics defined or unrealistic measurement

**6. Iteration & Learning Strategy (0-10)**
   • 9-10: Comprehensive testing strategy, feedback loops, and continuous improvement plan
   • 7-8: Good iteration planning with testing and feedback mechanisms
   • 5-6: Basic iteration concept but lacks detailed strategy
   • 3-4: Limited iteration thinking, no clear learning approach
   • 0-2: No iteration strategy or one-time solution mindset

EXPONENT-STYLE FEEDBACK REQUIREMENTS:
- **Strengths (2-3 bullets):** What the candidate did well
- **Growth Areas (2-3 bullets):** Specific areas for improvement with actionable advice
- **Model Answer:** A comprehensive 10/10 response following Exponent's framework
- **Overall Score:** Weighted average (User-Centricity: 25%, Innovation: 20%, Technical: 20%, UX: 15%, Metrics: 10%, Iteration: 10%)

OUTPUT FORMAT (JSON):
Return a clean JSON object with no extra text or commentary. It must follow this exact schema:

{
  "user_centricity": 0-10,
  "innovation": 0-10,
  "technical_feasibility": 0-10,
  "user_experience": 0-10,
  "success_metrics": 0-10,
  "iteration": 0-10,
  "overall_score": 0-10,
  "feedback": [
    "Short bullet 1 (strength or growth area)",
    "Short bullet 2 (specific improvement advice)",
    "Short bullet 3 (additional feedback)"
  ],
  "model_answer": "Write the ideal 10/10 Product Manager answer following Exponent's framework. Be comprehensive, structured, and demonstrate advanced PM thinking."
}

All numbers must be integers 0–10. Always include overall_score field.

RESPOND IN VALID JSON FORMAT ONLY.`,

  metrics: (question, answer) => `
ROLE:
You are a senior Product Manager at Exponent with deep expertise in data analytics, KPI definition,
and measurement frameworks. You've built analytics systems for multiple products and conduct PM interviews
using Exponent's structured rubrics.

OBJECTIVE:
Evaluate this candidate's metrics and measurement thinking using Exponent's comprehensive evaluation framework.
Focus on analytical rigor, business impact, and data-driven decision making.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EXPONENT-STYLE EVALUATION RUBRIC (Rate 0-10 for each):

**1. Metrics Selection & Framework (0-10)**
   • 9-10: Selects highly relevant KPIs with clear hierarchy (North Star → leading → lagging metrics)
   • 7-8: Good metric selection with clear rationale and some framework thinking
   • 5-6: Basic metrics chosen but lacks comprehensive framework
   • 3-4: Limited metric selection, unclear rationale
   • 0-2: Poor or no metric selection, no framework understanding

**2. Data Analysis & Interpretation (0-10)**
   • 9-10: Sophisticated analysis with statistical rigor, trend identification, and segmentation
   • 7-8: Good analytical approach with clear data interpretation
   • 5-6: Basic analysis but lacks depth in interpretation
   • 3-4: Limited analytical thinking, surface-level insights
   • 0-2: No analytical approach or misinterpretation of data

**3. Statistical Understanding (0-10)**
   • 9-10: Demonstrates strong statistical knowledge, understands correlation vs causation, confidence intervals
   • 7-8: Good statistical awareness with proper interpretation of results
   • 5-6: Basic statistical understanding but some misconceptions
   • 3-4: Limited statistical knowledge, potential for misinterpretation
   • 0-2: Poor statistical understanding or incorrect assumptions

**4. A/B Testing & Experimentation (0-10)**
   • 9-10: Comprehensive experiment design with proper controls, sample size, and statistical power
   • 7-8: Good experimental thinking with most design elements considered
   • 5-6: Basic experiment concept but gaps in methodology
   • 3-4: Limited experimentation knowledge, flawed design
   • 0-2: No experimentation understanding or poor experimental design

**5. Actionable Insights & Decision Making (0-10)**
   • 9-10: Clear translation of data into specific, actionable product decisions with clear next steps
   • 7-8: Good connection between insights and actions with some specificity
   • 5-6: Basic insight-to-action connection but lacks specificity
   • 3-4: Limited actionable insights, vague recommendations
   • 0-2: No actionable insights or poor decision-making framework

**6. Business Impact & ROI (0-10)**
   • 9-10: Clear connection between metrics and business outcomes with quantified impact
   • 7-8: Good understanding of business impact with some quantification
   • 5-6: Basic business awareness but lacks quantified impact
   • 3-4: Limited business understanding, unclear impact
   • 0-2: No business impact consideration or poor ROI understanding

EXPONENT-STYLE FEEDBACK REQUIREMENTS:
- **Strengths (2-3 bullets):** What the candidate did well in their analytical approach
- **Growth Areas (2-3 bullets):** Specific areas for improvement with actionable advice
- **Model Answer:** A comprehensive 10/10 response following Exponent's framework
- **Overall Score:** Weighted average (Metrics Selection: 20%, Data Analysis: 25%, Statistical: 15%, A/B Testing: 15%, Insights: 15%, Business Impact: 10%)

OUTPUT FORMAT (JSON):
Return a clean JSON object with no extra text or commentary. It must follow this exact schema:

{
  "metrics_selection": 0-10,
  "data_analysis": 0-10,
  "statistical_understanding": 0-10,
  "ab_testing": 0-10,
  "actionable_insights": 0-10,
  "business_impact": 0-10,
  "overall_score": 0-10,
  "feedback": [
    "Short bullet 1 (strength or growth area)",
    "Short bullet 2 (specific improvement advice)",
    "Short bullet 3 (additional feedback)"
  ],
  "model_answer": "Write the ideal 10/10 Product Manager answer following Exponent's framework. Be comprehensive, structured, and demonstrate advanced PM thinking."
}

All numbers must be integers 0–10. Always include overall_score field.

RESPOND IN VALID JSON FORMAT ONLY.`,

  product_strategy: (question, answer) => `
ROLE:
You are a senior Product Manager with extensive experience in product strategy,
market analysis, and strategic decision-making. You've led product strategy for major tech companies.

OBJECTIVE:
Evaluate this candidate's strategic thinking. Focus on market analysis, competitive positioning,
and long-term vision alignment.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Market Analysis** – Do they demonstrate deep understanding of market dynamics and trends?
2. **Competitive Positioning** – Do they analyze competitors and identify differentiation opportunities?
3. **Strategic Framework** – Do they use structured frameworks (SWOT, Porter's 5 Forces, etc.)?
4. **Risk Assessment** – Do they identify and evaluate strategic risks and mitigation strategies?
5. **Resource Consideration** – Do they factor in company capabilities and resource constraints?
6. **Long-term Vision** – Do they align decisions with long-term company and product vision?

Provide:
- **Feedback (2-4 bullets):** Gaps in their strategic analysis and thinking
- **Model Answer:** A comprehensive strategic analysis and recommendation
- **Overall Score:** Average of all dimensions

OUTPUT FORMAT (JSON):
Return a clean JSON object with no extra text or commentary. It must follow this exact schema:

{
  "market_analysis": 0-10,
  "competitive_positioning": 0-10,
  "strategic_thinking": 0-10,
  "resource_allocation": 0-10,
  "risk_assessment": 0-10,
  "execution_planning": 0-10,
  "overall_score": 0-10,
  "feedback": [
    "Short bullet 1 (strength or growth area)",
    "Short bullet 2 (specific improvement advice)",
    "Short bullet 3 (additional feedback)"
  ],
  "model_answer": "Write the ideal 10/10 Product Manager answer. Be comprehensive, structured, and demonstrate advanced PM thinking."
}

All numbers must be integers 0–10. Always include overall_score field.

RESPOND IN VALID JSON FORMAT ONLY.`,

  guesstimates: (question, answer) => `
ROLE:
You are a senior Product Manager with expertise in market sizing, estimation techniques,
and analytical reasoning. You regularly work with guesstimates for product planning.

OBJECTIVE:
Evaluate this candidate's estimation and analytical reasoning skills. Focus on methodology,
assumptions, and logical breakdown of complex problems.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Structured Approach** – Do they break down the problem into manageable components?
2. **Assumption Clarity** – Are their assumptions explicit, reasonable, and well-justified?
3. **Calculation Methodology** – Is their math logical and calculation process clear?
4. **Sanity Checking** – Do they validate their estimate against known benchmarks?
5. **Confidence Intervals** – Do they acknowledge uncertainty and provide ranges?
6. **Practical Application** – Do they connect the estimate to business decisions?

Provide:
- **Feedback (2-4 bullets):** Areas where their estimation approach could be improved
- **Model Answer:** A structured, well-reasoned estimation with clear methodology
- **Overall Score:** Average of all dimensions

OUTPUT FORMAT (JSON):
Return a clean JSON object with no extra text or commentary. It must follow this exact schema:

{
  "estimation_framework": 0-10,
  "data_reasoning": 0-10,
  "assumption_validation": 0-10,
  "calculation_accuracy": 0-10,
  "sensitivity_analysis": 0-10,
  "business_application": 0-10,
  "overall_score": 0-10,
  "feedback": [
    "Short bullet 1 (strength or growth area)",
    "Short bullet 2 (specific improvement advice)",
    "Short bullet 3 (additional feedback)"
  ],
  "model_answer": "Write the ideal 10/10 Product Manager answer. Be comprehensive, structured, and demonstrate advanced PM thinking."
}

All numbers must be integers 0–10. Always include overall_score field.

RESPOND IN VALID JSON FORMAT ONLY.`,
};

/**
 * Get the appropriate scoring prompt based on question category
 */
function getCategoryScoringPrompt(question, answer, category) {
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');

  if (CATEGORY_SCORING_PROMPTS[normalizedCategory]) {
    return CATEGORY_SCORING_PROMPTS[normalizedCategory](question, answer);
  }

  // Fallback to default scoring prompt for unknown categories
  return `
ROLE:
You are a senior Product Manager interviewer at a top-tier tech company.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATE ON THESE DIMENSIONS (0-10 each):
1. Product Sense
2. Metrics & Data  
3. Prioritization & Tradeoffs
4. Analytical Structure
5. Communication Clarity
6. User Empathy

Provide feedback, model answer, and overall score.
RESPOND IN VALID JSON FORMAT ONLY.`;
}

/**
 * Get category-specific evaluation dimensions
 */
function getCategoryDimensions(category) {
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');

  const dimensionMap = {
    root_cause_analysis: [
      'Systematic Approach',
      'Data-Driven Thinking',
      'Hypothesis Formation',
      'Prioritization',
      'Stakeholder Consideration',
      'Action Planning',
    ],
    product_improvement: [
      'User-Centric Approach',
      'Metrics Definition',
      'Solution Innovation',
      'Implementation Planning',
      'Risk Assessment',
      'Impact Prioritization',
    ],
    product_design: [
      'User Research Foundation',
      'Design Innovation',
      'Technical Feasibility',
      'User Experience Flow',
      'Success Metrics',
      'Iteration Strategy',
    ],
    metrics: [
      'Metric Selection',
      'Measurement Methodology',
      'Leading vs Lagging',
      'Segmentation Strategy',
      'Benchmarking',
      'Actionability',
    ],
    product_strategy: [
      'Market Analysis',
      'Competitive Positioning',
      'Strategic Framework',
      'Risk Assessment',
      'Resource Consideration',
      'Long-term Vision',
    ],
    guesstimates: [
      'Structured Approach',
      'Assumption Clarity',
      'Calculation Methodology',
      'Sanity Checking',
      'Confidence Intervals',
      'Practical Application',
    ],
  };

  return (
    dimensionMap[normalizedCategory] || [
      'Product Sense',
      'Metrics & Data',
      'Prioritization & Tradeoffs',
      'Analytical Structure',
      'Communication Clarity',
      'User Empathy',
    ]
  );
}

// Extend CATEGORY_SCORING_PROMPTS with additional categories
CATEGORY_SCORING_PROMPTS.behavioral = (question, answer) => `
ROLE:
You are a senior Product Manager with expertise in behavioral interviews and leadership assessment.
You've conducted hundreds of PM interviews and understand what makes great product leaders.

OBJECTIVE:
Evaluate this candidate's behavioral response. Focus on leadership, problem-solving, and real-world experience.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **STAR Method Structure** – Do they use Situation, Task, Action, Result framework?
2. **Leadership Impact** – Do they demonstrate leading teams and driving results?
3. **Problem-Solving Skills** – How do they approach complex challenges?
4. **Communication Clarity** – Is their story clear, concise, and compelling?
5. **Quantifiable Results** – Do they provide specific metrics and outcomes?
6. **Self-Awareness** – Do they show reflection and learning from experiences?

SAMPLE STRONG ANSWER:
"At my previous company, we faced a 40% user churn rate in our mobile app. As the PM, I led a cross-functional team to investigate. We discovered the onboarding flow was too complex. I redesigned it with A/B testing, resulting in a 25% reduction in churn and 30% increase in user activation. The key was listening to user feedback and iterating quickly."

RESPOND IN VALID JSON FORMAT ONLY.`;

CATEGORY_SCORING_PROMPTS.technical = (question, answer) => `
ROLE:
You are a senior Product Manager with deep technical background. You've worked closely with engineering teams
and understand system architecture, APIs, and technical trade-offs.

OBJECTIVE:
Evaluate this candidate's technical understanding and ability to work with engineering teams.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Technical Understanding** – Do they demonstrate knowledge of systems and architecture?
2. **Engineering Collaboration** – How well do they work with technical teams?
3. **Trade-off Analysis** – Do they understand technical constraints and alternatives?
4. **Scalability Thinking** – Do they consider performance and growth implications?
5. **API and Integration Knowledge** – Do they understand modern development practices?
6. **Technical Communication** – Can they explain complex concepts clearly?

RESPOND IN VALID JSON FORMAT ONLY.`;

CATEGORY_SCORING_PROMPTS.system_design = (question, answer) => `
ROLE:
You are a senior Product Manager with expertise in system design and architecture.
You've designed scalable products serving millions of users.

OBJECTIVE:
Evaluate this candidate's system design thinking and understanding of scalability.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Architecture Understanding** – Do they think about system components and interactions?
2. **Scalability Planning** – Do they consider growth and performance implications?
3. **Data Flow Design** – Do they understand how data moves through systems?
4. **Failure Handling** – Do they consider edge cases and error scenarios?
5. **Technology Choices** – Do they make informed decisions about tools and platforms?
6. **User Impact Consideration** – Do they connect technical decisions to user experience?

RESPOND IN VALID JSON FORMAT ONLY.`;

CATEGORY_SCORING_PROMPTS.data_analysis = (question, answer) => `
ROLE:
You are a senior Product Manager with expertise in data analysis and metrics.
You've built data-driven products and understand analytics frameworks.

OBJECTIVE:
Evaluate this candidate's data analysis skills and metrics-driven thinking.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Metrics Selection** – Do they choose relevant KPIs and success metrics?
2. **Data Interpretation** – Can they analyze data and draw meaningful insights?
3. **Statistical Understanding** – Do they understand correlation vs causation?
4. **A/B Testing Knowledge** – Do they design proper experiments?
5. **Data Visualization** – Can they present data clearly and effectively?
6. **Actionable Insights** – Do they translate data into product decisions?

RESPOND IN VALID JSON FORMAT ONLY.`;

CATEGORY_SCORING_PROMPTS.project_management = (question, answer) => `
ROLE:
You are a senior Product Manager with expertise in project management and delivery.
You've successfully launched complex products with tight deadlines.

OBJECTIVE:
Evaluate this candidate's project management skills and delivery focus.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Timeline Planning** – Do they create realistic schedules and milestones?
2. **Resource Management** – How do they allocate and manage team resources?
3. **Risk Assessment** – Do they identify and mitigate potential risks?
4. **Stakeholder Communication** – How do they keep teams and leadership informed?
5. **Quality Assurance** – Do they ensure high-quality deliverables?
6. **Delivery Focus** – Do they balance perfection with timely delivery?

RESPOND IN VALID JSON FORMAT ONLY.`;

CATEGORY_SCORING_PROMPTS.customer_interaction = (question, answer) => `
ROLE:
You are a senior Product Manager with expertise in customer research and user engagement.
You've built products that deeply understand and serve customer needs.

OBJECTIVE:
Evaluate this candidate's customer focus and user empathy.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Customer Empathy** – Do they deeply understand user pain points?
2. **Research Methods** – Do they use proper user research techniques?
3. **Feedback Integration** – How do they incorporate customer input?
4. **User Journey Mapping** – Do they understand complete customer experiences?
5. **Support and Success** – Do they consider customer support implications?
6. **Customer Retention** – Do they focus on long-term customer value?

RESPOND IN VALID JSON FORMAT ONLY.`;

CATEGORY_SCORING_PROMPTS.app_critique = (question, answer) => `
ROLE:
You are a senior Product Manager with expertise in app design and user experience.
You've launched successful mobile and web applications.

OBJECTIVE:
Evaluate this candidate's ability to critique and improve existing products.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **Design Analysis** – Do they identify UX/UI strengths and weaknesses?
2. **User Experience Focus** – Do they prioritize user needs and usability?
3. **Competitive Awareness** – Do they understand market positioning?
4. **Improvement Prioritization** – Do they focus on high-impact changes?
5. **Technical Feasibility** – Do they consider implementation complexity?
6. **Business Impact** – Do they connect design changes to business outcomes?

RESPOND IN VALID JSON FORMAT ONLY.`;

CATEGORY_SCORING_PROMPTS.machine_learning = (question, answer) => `
ROLE:
You are a senior Product Manager with expertise in AI/ML products and algorithms.
You've launched ML-powered features that drive significant business value.

OBJECTIVE:
Evaluate this candidate's understanding of machine learning and AI product development.

QUESTION: ${question}
CANDIDATE'S ANSWER: ${answer}

EVALUATION CRITERIA (Rate 0-10 for each):

1. **ML Understanding** – Do they understand basic ML concepts and applications?
2. **Data Requirements** – Do they understand data needs for ML models?
3. **Model Performance** – Do they think about accuracy, precision, and recall?
4. **User Experience Integration** – How do they integrate ML into user workflows?
5. **Ethical Considerations** – Do they consider bias and fairness in ML?
6. **Business Value** – Do they connect ML features to business outcomes?

RESPOND IN VALID JSON FORMAT ONLY.`;

function getCategoryScoringPrompt(question, answer, category) {
  const promptFunction = CATEGORY_SCORING_PROMPTS[category];
  return promptFunction
    ? promptFunction(question, answer)
    : CATEGORY_SCORING_PROMPTS.product_strategy(question, answer);
}

function getCategoryDimensions(category) {
  const dimensions = {
    product_design: [
      'User Research Foundation',
      'Design Innovation',
      'Technical Feasibility',
      'User Experience Flow',
      'Business Alignment',
      'Iterative Approach',
    ],
    product_strategy: [
      'Strategic Thinking',
      'Market Understanding',
      'Competitive Analysis',
      'Business Model',
      'Risk Assessment',
      'Long-term Vision',
    ],
    metrics: [
      'Metrics Selection',
      'Data Analysis',
      'Statistical Understanding',
      'A/B Testing Design',
      'Actionable Insights',
      'Business Impact',
    ],
    product_improvement: [
      'Problem Identification',
      'Root Cause Analysis',
      'Solution Design',
      'Implementation Planning',
      'Success Measurement',
      'Iterative Improvement',
    ],
    root_cause_analysis: [
      'Problem Definition',
      'Data Gathering',
      'Analysis Framework',
      'Root Cause Identification',
      'Solution Development',
      'Prevention Strategy',
    ],
    guesstimates: [
      'Problem Breakdown',
      'Assumption Making',
      'Calculation Method',
      'Reality Checks',
      'Alternative Approaches',
      'Confidence Level',
    ],
    behavioral: [
      'STAR Method Structure',
      'Leadership Impact',
      'Problem-Solving Skills',
      'Communication Clarity',
      'Quantifiable Results',
      'Self-Awareness',
    ],
    technical: [
      'Technical Understanding',
      'Engineering Collaboration',
      'Trade-off Analysis',
      'Scalability Thinking',
      'API and Integration Knowledge',
      'Technical Communication',
    ],
    system_design: [
      'Architecture Understanding',
      'Scalability Planning',
      'Data Flow Design',
      'Failure Handling',
      'Technology Choices',
      'User Impact Consideration',
    ],
    data_analysis: [
      'Metrics Selection',
      'Data Interpretation',
      'Statistical Understanding',
      'A/B Testing Knowledge',
      'Data Visualization',
      'Actionable Insights',
    ],
    project_management: [
      'Timeline Planning',
      'Resource Management',
      'Risk Assessment',
      'Stakeholder Communication',
      'Quality Assurance',
      'Delivery Focus',
    ],
    customer_interaction: [
      'Customer Empathy',
      'Research Methods',
      'Feedback Integration',
      'User Journey Mapping',
      'Support and Success',
      'Customer Retention',
    ],
    app_critique: [
      'Design Analysis',
      'User Experience Focus',
      'Competitive Awareness',
      'Improvement Prioritization',
      'Technical Feasibility',
      'Business Impact',
    ],
    machine_learning: [
      'ML Understanding',
      'Data Requirements',
      'Model Performance',
      'User Experience Integration',
      'Ethical Considerations',
      'Business Value',
    ],
  };

  return dimensions[category] || dimensions.product_strategy;
}

module.exports = {
  getCategoryScoringPrompt,
  getCategoryDimensions,
  CATEGORY_SCORING_PROMPTS,
};
