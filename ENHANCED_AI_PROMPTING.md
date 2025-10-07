# Enhanced AI Prompting - Senior PM Interviewer

## 🎯 **Overview**

Transformed the AI scoring system to provide **harsh, realistic, and professional feedback** that mimics a senior Product Manager interviewer at top-tier tech companies (Google, Meta, Amazon). The AI now acts as a seasoned interviewer who has conducted hundreds of PM interviews and provides brutally honest feedback to help candidates improve.

---

## 🚀 **Key Changes**

### 1. **Senior PM Interviewer Persona**

- **Before**: Generic "expert PM interviewer"
- **After**: Senior PM at top-tier tech company (Google, Meta, Amazon)
- Professional, sharp, analytical, and critical
- Speaks like a real hiring panel member

### 2. **Harsh, Honest Feedback**

- **Before**: Friendly, encouraging feedback
- **After**: Brutally honest, direct criticism
- Points out flaws, gaps, and missteps clearly
- No fluff or false encouragement
- Makes candidates "think harder, not feel comfortable"

### 3. **Expanded Evaluation Dimensions**

- **Before**: 5 dimensions

  - Structure
  - Metrics
  - Prioritization
  - User Empathy
  - Communication

- **After**: 6 dimensions + overall score
  - **Product Sense** - Customer understanding and product intuition
  - **Metrics & Data** - Measurable success metrics, north-star KPIs
  - **Prioritization & Tradeoffs** - Decision frameworks (ICE, RICE, impact vs effort)
  - **Analytical Structure** - Logical organization, step-by-step thinking
  - **Communication Clarity** - Articulation, confidence, conciseness
  - **User Empathy** - Customer pain points, user perspective
  - **Overall Score** - AI-calculated average

### 4. **Feedback Format**

- **Before**: Single paragraph string
- **After**: Array of 2-4 bullet points
  - Each bullet is short, punchy, and critical
  - Written in realistic human tone
  - Focuses on weaknesses and improvements

### 5. **Model Answer**

- **Before**: `sample_answer` - generic example
- **After**: `model_answer` - ideal 10/10 PM answer
  - 3-6 sentences
  - Demonstrates advanced PM frameworks
  - Shows structured reasoning and clarity
  - Includes metrics, tradeoffs, and prioritization

---

## 📝 **Prompt Structure**

### **ROLE**

```
You are a senior Product Manager interviewer at a top-tier tech company
(e.g. Google, Meta, Amazon). You have conducted hundreds of PM interviews
across Product Sense, Metrics, Strategy, and Execution. You are professional,
sharp, analytical, and critical. You always assess with fairness but high standards.
```

### **OBJECTIVE**

1. Evaluate candidate's response across 6 PM skill dimensions
2. Give numeric scores (0–10) for each category
3. Provide harsh, honest feedback about weaknesses
4. Provide a model 10/10 answer for reference

### **EVALUATION CRITERIA** (0-10 each)

1. **Product Sense** – Deep customer understanding, product intuition
2. **Metrics & Data** – Measurable success metrics, north-star KPIs
3. **Prioritization & Tradeoffs** – Decision frameworks (ICE, RICE, etc.)
4. **Analytical Structure** – Logical organization, frameworks
5. **Communication Clarity** – Articulation, confidence, conciseness
6. **User Empathy** – Customer pain points, user perspective

### **TONE GUIDELINES**

- Speak as a **seasoned interviewer**, not a friendly coach
- Be direct, professional, and brutally honest
- Don't flatter; if something is weak, say so clearly
- Examples:
  > "Your approach lacks measurable KPIs."  
  > "You didn't clearly define the user problem before proposing features."  
  > "You jumped into solutions without exploring tradeoffs."

### **OUTPUT FORMAT**

```json
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
  "model_answer": "Ideal 10/10 PM answer in 3-6 sentences with frameworks, metrics, tradeoffs."
}
```

---

## 💡 **Example Transformations**

### Example 1: Weak Answer

**User Answer:**

> "I would add more notifications and track engagement to improve retention."

**Old Feedback (Friendly):**

> "Good start! Consider adding more structure to your answer. Think about defining specific metrics and using a framework like CIRCLES to organize your thoughts."

**New Feedback (Harsh):**

```json
{
  "product_sense": 5,
  "metrics": 6,
  "prioritization": 3,
  "structure": 4,
  "communication": 7,
  "user_empathy": 4,
  "overall_score": 5,
  "feedback": [
    "You jumped into a solution without clarifying the user problem or hypothesis.",
    "No framework or structure was used — unclear reasoning path.",
    "Metrics are vague and lack a defined success goal."
  ],
  "model_answer": "First, identify which user segment has the retention issue by analyzing cohort drop-offs. Then, form hypotheses (e.g., low engagement due to feature fatigue). Prioritize by impact vs effort (RICE). Define success via weekly active users and retention after 4 weeks. Propose lightweight re-engagement tactics validated through A/B tests."
}
```

### Example 2: Monetization Question

**User Answer:**

> "I'd build a premium subscription model to increase revenue."

**Old Feedback (Friendly):**

> "Nice idea! To strengthen your answer, consider discussing which users would pay and what value they'd get. Also, define some metrics."

**New Feedback (Harsh):**

```json
{
  "product_sense": 6,
  "metrics": 5,
  "prioritization": 4,
  "structure": 5,
  "communication": 7,
  "user_empathy": 5,
  "overall_score": 5,
  "feedback": [
    "You focused on monetization without validating user value or pain points.",
    "No tradeoff or prioritization framework used.",
    "Metrics were too high-level; consider measurable success criteria."
  ],
  "model_answer": "Start by defining which users are most likely to pay and what unmet need justifies a premium tier. Explore monetization options (subscription vs add-ons) using value vs cost analysis. Prioritize based on expected impact and implementation cost. Define KPIs such as ARPU, retention among paying users, and conversion from free to paid."
}
```

---

## 🔧 **Technical Implementation**

### **Backend Changes**

#### 1. **Updated Prompt Template**

File: `src/services/openaiService.js`

```javascript
const SCORING_PROMPT_TEMPLATE = (question, answer) => `
ROLE:
You are a senior Product Manager interviewer at a top-tier tech company...

OBJECTIVE:
You are interviewing a candidate for a Product Manager role...

EVALUATION CRITERIA:
Rate the candidate's answer from 0 to 10 in each dimension...

TONE GUIDELINES:
- Speak as a seasoned interviewer, not a friendly coach
- Be direct, professional, and brutally honest
...
`;
```

#### 2. **Updated OpenAI Configuration**

```javascript
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
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
  temperature: 0.3, // Increased from 0.2 for more human-like feedback
  max_tokens: 1500, // Increased from 1000 for detailed responses
  response_format: { type: 'json_object' },
});
```

#### 3. **Updated Validation**

File: `src/services/openaiService.js`

**New Required Fields:**

```javascript
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
```

**Feedback Validation:**

```javascript
// Validate feedback array
if (!Array.isArray(parsed.feedback) || parsed.feedback.length < 2) {
  throw new Error('Invalid feedback: must be an array with at least 2 bullet points');
}

for (const bullet of parsed.feedback) {
  if (typeof bullet !== 'string' || bullet.length < 10) {
    throw new Error('Invalid feedback bullet: each must be a non-empty string');
  }
}
```

**Model Answer Validation:**

```javascript
// Validate model answer
if (typeof parsed.model_answer !== 'string' || parsed.model_answer.length < 50) {
  throw new Error('Invalid model_answer: must be a substantial string');
}
```

#### 4. **Updated Score Service**

File: `src/services/scoreService.js`

**Total Score Calculation:**

```javascript
// Use overall_score from AI if available, otherwise calculate average
const totalScore =
  scoreData.overall_score ||
  Math.round(
    (scoreData.product_sense +
      scoreData.metrics +
      scoreData.prioritization +
      scoreData.structure +
      scoreData.communication +
      scoreData.user_empathy) /
      6
  );
```

**Feedback Array to String:**

```javascript
// Convert feedback array to string with bullet points
const feedbackString = Array.isArray(scoreData.feedback)
  ? scoreData.feedback.map((bullet, index) => `${index + 1}. ${bullet}`).join('\n')
  : scoreData.feedback;
```

**Database Mapping:**

```javascript
const score = await prisma.score.create({
  data: {
    sessionId: session.id,
    structure: scoreData.structure, // Analytical structure
    metrics: scoreData.metrics,
    prioritization: scoreData.prioritization,
    userEmpathy: scoreData.user_empathy,
    communication: scoreData.communication,
    feedback: feedbackString,
    sampleAnswer: scoreData.model_answer,
    totalScore,
    tokensUsed,
    status: 'completed',
  },
});
```

---

## 📊 **Field Mapping**

### AI Response → Database

| AI Field           | Database Field    | Notes                               |
| ------------------ | ----------------- | ----------------------------------- |
| `product_sense`    | -                 | Not stored (used for overall_score) |
| `metrics`          | `metrics`         | Direct mapping                      |
| `prioritization`   | `prioritization`  | Direct mapping                      |
| `structure`        | `structure`       | Analytical structure                |
| `communication`    | `communication`   | Direct mapping                      |
| `user_empathy`     | `userEmpathy`     | Camel case                          |
| `overall_score`    | `totalScore`      | AI-calculated or average            |
| `feedback` (array) | `feedback` (text) | Joined with numbered bullets        |
| `model_answer`     | `sampleAnswer`    | Renamed for clarity                 |

---

## 🎯 **Benefits**

### For Candidates

✅ **Realistic preparation** - Mirrors actual PM interview feedback  
✅ **Identifies weaknesses** - No sugar-coating, clear improvement areas  
✅ **Learns PM frameworks** - Model answers demonstrate best practices  
✅ **Builds resilience** - Gets used to critical feedback before real interviews  
✅ **Higher quality practice** - Pushes candidates to think deeper

### For Product

✅ **Differentiation** - More valuable than generic "good job" feedback  
✅ **Better outcomes** - Users improve faster with harsh honesty  
✅ **Credibility** - Sounds like real tech company interviewers  
✅ **Premium positioning** - Justifies higher pricing  
✅ **Word of mouth** - "This tool doesn't hold back" attracts serious candidates

---

## 🧪 **Testing**

### Test Cases

#### 1. **Weak Answer**

```javascript
// Input
question: "How would you improve Instagram's Stories feature?"
answer: "I'd add more filters and make it easier to share."

// Expected Output
{
  product_sense: 4,
  metrics: 3,
  prioritization: 2,
  structure: 3,
  communication: 6,
  user_empathy: 4,
  overall_score: 4,
  feedback: [
    "You jumped to features without identifying user problems or business goals.",
    "No metrics defined — how would you measure success?",
    "Missing any prioritization framework or tradeoff analysis."
  ],
  model_answer: "..."
}
```

#### 2. **Strong Answer**

```javascript
// Input
question: "Design a payment feature for WhatsApp."
answer: "First, I'd identify the primary use case — peer-to-peer payments in emerging markets where WhatsApp is dominant. Define success via transaction volume, adoption rate, and trust metrics. Use CIRCLES framework: focus on Context (regulatory landscape), User segments (remittance senders), Pain points (high fees, complexity). Prioritize by impact vs effort. Start with MVP in one country, validate, iterate."

// Expected Output
{
  product_sense: 9,
  metrics: 9,
  prioritization: 8,
  structure: 9,
  communication: 8,
  user_empathy: 8,
  overall_score: 9,
  feedback: [
    "Strong use of frameworks and structured thinking.",
    "Could strengthen by discussing competitive landscape and regulatory risks.",
    "Consider adding specific metric targets (e.g., 10% adoption in 6 months)."
  ],
  model_answer: "..."
}
```

---

## 💰 **Cost Implications**

### Token Usage

- **Before**: ~500-700 tokens per scoring
- **After**: ~800-1200 tokens per scoring (due to longer prompt and responses)

### OpenAI Costs (GPT-4 Turbo)

- **Before**: ~$0.010-0.015 per scoring
- **After**: ~$0.015-0.025 per scoring
- **Increase**: ~50-75% higher cost per scoring

### Justification

- **Higher value feedback** - Worth the extra cost
- **Better user outcomes** - Users improve faster
- **Premium positioning** - Can charge more
- **Competitive moat** - Unique value proposition

---

## 🚀 **Future Enhancements**

### Phase 2

1. **Difficulty-based harshness** - Adjust tone based on user level
2. **Follow-up questions** - AI asks probing questions like real interviewer
3. **Rubric customization** - Users can weight dimensions differently
4. **Company-specific feedback** - Tailor to Google, Meta, Amazon styles
5. **Feedback history** - Track improvement over time

### Phase 3

1. **Voice feedback** - AI delivers feedback verbally
2. **Live interview mode** - Real-time feedback during conversation
3. **Peer comparison** - "You scored lower than 75% of candidates"
4. **Interviewer personas** - Choose interviewer style (harsh, balanced, encouraging)

---

## 📚 **Documentation Updates**

### API Response Format

```json
{
  "message": "Answer scored successfully",
  "score": {
    "id": 123,
    "sessionId": 456,
    "structure": 7,
    "metrics": 6,
    "prioritization": 8,
    "userEmpathy": 7,
    "communication": 8,
    "feedback": "1. Your approach lacks measurable KPIs.\n2. You didn't clearly define the user problem.\n3. Consider using frameworks like CIRCLES or HEART.",
    "sampleAnswer": "First, identify which user segment has the retention issue...",
    "totalScore": 7,
    "tokensUsed": 1050,
    "status": "completed",
    "createdAt": "2025-10-06T...",
    "updatedAt": "2025-10-06T..."
  }
}
```

---

## 🎉 **Summary**

### What Changed

✅ **Senior PM interviewer persona** - Mimics real tech company interviewers  
✅ **Harsh, honest feedback** - No sugar-coating, direct criticism  
✅ **6 evaluation dimensions** - Added product_sense, split structure  
✅ **Bullet point feedback** - Array of 2-4 critical points  
✅ **Model 10/10 answer** - Shows ideal PM response  
✅ **Overall score** - AI-calculated or average  
✅ **Higher token budget** - 1500 max_tokens for detailed feedback  
✅ **Increased temperature** - 0.3 for human-like responses

### Impact

- **More realistic** PM interview preparation
- **Faster improvement** through harsh honesty
- **Better credibility** sounds like real interviewers
- **Premium positioning** justifies higher pricing
- **Competitive advantage** unique value proposition

---

**The AI now provides feedback that makes candidates think harder, not feel comfortable!** 🎯💪

**Deployed**:

- Backend: https://github.com/suyash-mankar/PMIP-BE (commit `f6bd7d7`)

**Last Updated**: October 6, 2025  
**Status**: ✅ Completed & Deployed
