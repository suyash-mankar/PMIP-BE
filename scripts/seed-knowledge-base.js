/**
 * Seed the knowledge base with core PM content:
 * - Rubrics and frameworks
 * - Baselines for guesstimates
 * - PM concepts and checklists
 */

require('dotenv').config();
const { kbInsert } = require('../src/utils/vector');

// Core PM rubrics by category
const rubrics = [
  {
    source: 'curated',
    title: 'Product Design Rubric',
    category: 'Product Design',
    doc_type: 'rubric',
    content: `# Product Design Interview Rubric

## Scoring Dimensions (0-10 each)

### 1. Structure & Clarity (0-10)
- Problem definition and scope
- Clear framework (CIRCLES, etc.)
- Logical flow and organization
- Well-structured sections

**8-10:** Crystal clear framework, perfect flow, comprehensive coverage
**5-7:** Good structure but missing some components
**0-4:** Disorganized, no clear framework

### 2. User Empathy & Research (0-10)
- User segmentation
- Pain points identification
- Jobs-to-be-done clarity
- User personas

**8-10:** Deep user understanding, clear personas, well-researched pain points
**5-7:** Basic user understanding but shallow
**0-4:** Little to no user empathy

### 3. Solution Quality (0-10)
- Feature creativity and feasibility
- MVP definition
- Prioritization rationale
- Trade-offs consideration

**8-10:** Innovative, well-prioritized features with clear MVP
**5-7:** Decent features but weak prioritization
**0-4:** Weak or unfeasible solutions

### 4. Metrics & Success (0-10)
- North Star Metric defined
- Supporting metrics identified
- Guardrail metrics
- Success criteria clarity

**8-10:** Comprehensive metric framework with NSM, supporting, and guardrails
**5-7:** Basic metrics but incomplete
**0-4:** Vague or missing metrics

### 5. Business Impact (0-10)
- Market opportunity sizing
- Competitive analysis
- Go-to-market strategy
- Revenue/growth potential

**8-10:** Strong business case with market analysis and GTM
**5-7:** Basic business thinking
**0-4:** Weak or no business justification`,
  },
  {
    source: 'curated',
    title: 'RCA (Root Cause Analysis) Rubric',
    category: 'RCA',
    doc_type: 'rubric',
    content: `# Root Cause Analysis Rubric

## Scoring Dimensions (0-10 each)

### 1. Problem Definition (0-10)
- Clarified timeline and magnitude
- Defined scope (platform, geography, segments)
- Asked about related metrics
- Established baseline

**8-10:** Comprehensive problem scoping with all key dimensions
**5-7:** Partial scoping, missed some dimensions
**0-4:** Vague problem understanding

### 2. Hypothesis Generation (0-10)
- Systematic approach (internal vs external)
- Multiple hypotheses
- Prioritization logic
- Covered all angles

**8-10:** Structured hypothesis tree with clear prioritization
**5-7:** Some hypotheses but not systematic
**0-4:** Random guessing without structure

### 3. Data-Driven Investigation (0-10)
- Asked for specific data points
- Segmented analysis
- Correlation vs causation awareness
- Eliminated alternatives

**8-10:** Rigorous data requests with clear reasoning
**5-7:** Basic data requests
**0-4:** Weak or no data analysis

### 4. Root Cause Identification (0-10)
- Distinguished symptom from root cause
- Clear causal chain
- Validated with evidence
- Single root cause identified

**8-10:** Clear root cause with strong evidence and reasoning
**5-7:** Identified cause but reasoning weak
**0-4:** Confused symptoms with root cause

### 5. Solution & Prevention (0-10)
- Short-term fix proposed
- Long-term prevention strategy
- Success metrics defined
- Monitoring plan

**8-10:** Comprehensive solution with metrics and prevention
**5-7:** Basic solution but incomplete
**0-4:** Weak or no solution`,
  },
  {
    source: 'curated',
    title: 'Guesstimate Rubric',
    category: 'Guesstimate',
    doc_type: 'rubric',
    content: `# Guesstimate Interview Rubric

## Scoring Dimensions (0-10 each)

### 1. Clarification & Scoping (0-10)
- Defined geography and time period
- Clarified target segment
- Set clear boundaries (inclusions/exclusions)
- Asked for necessary baseline data

**8-10:** Crystal clear scope with all boundaries defined
**5-7:** Some scoping but missed key boundaries
**0-4:** Vague scope, jumped to calculations

### 2. Structured Breakdown (0-10)
- Created clear equation/formula
- Logical decomposition (top-down or bottom-up)
- Systematic component breakdown
- Framework clarity

**8-10:** Clear equation with logical, systematic breakdown
**5-7:** Some structure but incomplete
**0-4:** Random calculations without structure

### 3. Mathematical Logic (0-10)
- Clean, easy-to-follow calculations
- Rounded numbers for simplicity
- Logical flow
- Calculation accuracy

**8-10:** Clean calculations, rounded numbers, easy to follow
**5-7:** Correct but overly complex
**0-4:** Confusing or illogical calculations

### 4. Assumptions & Transparency (0-10)
- All assumptions clearly stated
- Reasonable assumptions
- Calculations shown step-by-step
- Transparency throughout

**8-10:** All assumptions stated and reasonable
**5-7:** Some assumptions unstated or unrealistic
**0-4:** Assumptions unclear or missing

### 5. Sanity Check & Summary (0-10)
- Validated answer with alternate method
- Compared to benchmarks
- Clear summary
- Final answer makes sense

**8-10:** Strong validation with alternate method or benchmark
**5-7:** Quick check but not thorough
**0-4:** No validation or summary`,
  },
  {
    source: 'curated',
    title: 'Metrics Question Rubric',
    category: 'Metrics',
    doc_type: 'rubric',
    content: `# Metrics Interview Rubric

## Scoring Dimensions (0-10 each)

### 1. Goal Alignment (0-10)
- Tied metrics to product/business goals
- North Star Metric identified
- Strategic alignment clear
- User value connection

**8-10:** Clear NSM tied to business goals and user value
**5-7:** Basic goal alignment but not comprehensive
**0-4:** Weak or missing goal connection

### 2. Metric Framework (0-10)
- Primary metric defined
- Supporting metrics identified
- Guardrail metrics included
- Complete metric hierarchy

**8-10:** Comprehensive framework: primary + supporting + guardrails
**5-7:** Basic framework but incomplete
**0-4:** Only primary metric, no framework

### 3. Measurement Clarity (0-10)
- Clear metric definitions
- Measurement methodology
- Data sources identified
- Edge cases considered

**8-10:** Crystal clear definitions with measurement approach
**5-7:** Decent definitions but some ambiguity
**0-4:** Vague or unclear metrics

### 4. Trade-offs & Balance (0-10)
- Acknowledged metric trade-offs
- Balanced short vs long-term
- Gaming concerns addressed
- Holistic view

**8-10:** Thoughtful trade-off analysis with mitigation
**5-7:** Mentioned trade-offs but shallow
**0-4:** No trade-off consideration

### 5. Actionability (0-10)
- Metrics drive decisions
- Thresholds or targets set
- Segmentation for insights
- Action triggers defined

**8-10:** Metrics clearly drive action with thresholds
**5-7:** Somewhat actionable
**0-4:** Metrics don't drive decisions`,
  },
];

// Core PM frameworks
const frameworks = [
  {
    source: 'curated',
    title: 'CIRCLES Framework for Product Design',
    category: 'Product Design',
    doc_type: 'framework',
    content: `# CIRCLES Framework

A systematic approach for product design questions.

## C - Comprehend the Situation
- Clarify the problem/opportunity
- Ask clarifying questions
- Define constraints and assumptions
- Establish success criteria

## I - Identify the Customer
- Define user segments
- Create personas
- Identify target users
- Understand user needs

## R - Report Customer Needs
- Pain points
- Jobs to be done
- User goals
- Current solutions (workarounds)

## C - Cut Through Prioritization
- Prioritize user segments
- Prioritize needs/features
- Use frameworks: RICE, MoSCoW, Value vs Effort
- Define MVP scope

## L - List Solutions
- Brainstorm features
- Consider alternatives
- Think creatively
- Map features to needs

## E - Evaluate Trade-offs
- Technical feasibility
- Time to market
- Resource constraints
- Business viability
- User experience impact

## S - Summarize Recommendation
- Recommended solution
- Key features in MVP
- Success metrics
- Go-to-market approach
- Next steps`,
  },
  {
    source: 'curated',
    title: 'RCA Investigation Framework',
    category: 'RCA',
    doc_type: 'framework',
    content: `# Root Cause Analysis Framework

## Phase 1: Problem Definition
1. **Timeline**: When did the issue start? Duration?
2. **Magnitude**: By how much? Specific numbers?
3. **Scope**: Which platforms, geographies, user segments?
4. **Related Metrics**: What other metrics changed?

## Phase 2: Hypothesis Generation
Organize hypotheses by:

### Internal Factors
- Product changes (features, UI/UX)
- Technical issues (bugs, performance)
- Operational changes (pricing, policies)
- Team/process changes

### External Factors
- Competitor actions
- Market dynamics
- Seasonality
- External events

## Phase 3: Data-Driven Investigation
- Segment analysis (platform, geography, cohort)
- Correlation analysis
- Timeline correlation
- A/B test review
- User feedback analysis

## Phase 4: Root Cause Identification
- Distinguish symptom from root cause
- Build causal chain
- Validate with evidence
- Eliminate alternatives

## Phase 5: Solution & Prevention
- **Short-term fix** (immediate action)
- **Long-term prevention** (systemic fix)
- **Success metrics** (how to measure fix)
- **Monitoring** (early warning system)`,
  },
  {
    source: 'curated',
    title: 'AARM Metrics Framework',
    category: 'Metrics',
    doc_type: 'framework',
    content: `# AARM Framework for Metrics

A systematic approach to define metrics for any product feature.

## A - Acquisition
Metrics tracking how users discover and adopt the feature:
- New users/signups
- Feature discovery rate
- Activation rate
- Onboarding completion

## A - Activation
Metrics showing users experiencing core value:
- First-time use
- Time to first value
- Aha moment achievement
- Setup completion

## R - Retention
Metrics measuring continued engagement:
- Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)
- Return rate (D1, D7, D30)
- Churn rate
- Feature stickiness (DAU/MAU)

## M - Monetization
Metrics tied to revenue (if applicable):
- Conversion rate (free to paid)
- Average revenue per user (ARPU)
- Lifetime value (LTV)
- Attach rate

## Additional Considerations
- **North Star Metric**: Single most important metric
- **Supporting Metrics**: Help achieve NSM
- **Guardrail Metrics**: Prevent negative impacts
- **Counter Metrics**: Balance trade-offs`,
  },
];

// Guesstimate baselines
const baselines = [
  {
    source: 'curated',
    title: 'Guesstimate Baseline Numbers',
    category: 'Guesstimate',
    doc_type: 'baseline',
    content: `# Key Baseline Numbers for Guesstimates

## Population (India)
- Total population: ~1.4 billion
- Urban population: ~35% (~500 million)
- Rural population: ~65% (~900 million)
- Tier 1 cities (Mumbai, Delhi, Bangalore, etc.): ~50-60 million
- Tier 2 cities: ~100-150 million
- Middle class and above: ~300-400 million

## Population (USA)
- Total population: ~330 million
- Urban population: ~80% (~260 million)
- Major metro areas: ~100 million
- Middle class and above: ~180-200 million

## Households
- India: ~300 million households
- Average household size India: 4-5 people
- USA: ~130 million households
- Average household size USA: 2.5 people

## Internet & Mobile
- India internet users: ~700 million
- India smartphone users: ~600 million
- USA internet users: ~300 million (95%+ penetration)
- USA smartphone users: ~280 million

## Time Units
- Hours per day: 24
- Working hours: ~8-10
- Sleep hours: ~7-8
- Leisure hours: ~4-6
- Days per year: 365
- Working days per year: ~250
- Weekends per year: ~104

## Conversion Factors
- 1 million = 10 lakh
- 1 crore = 10 million
- 1 billion = 100 crore
- 1 km = 0.62 miles
- 1 kg = 2.2 lbs

## Common Assumptions
- Office worker lunch: 1 hour
- Commute time (urban): 1-2 hours/day
- Average age: ~35 years (working population)
- Life expectancy: 70-80 years
- Working age (18-65): ~50% of population`,
  },
];

// Additional rubrics
const moreRubrics = [
  {
    source: 'curated',
    title: 'Product Strategy Rubric',
    category: 'Product Strategy',
    doc_type: 'rubric',
    content: `# Product Strategy Interview Rubric

## Scoring Dimensions (0-10 each)

### 1. Market Understanding (0-10)
- Market size and opportunity
- Competitive landscape analysis
- Market trends and timing
- Target customer segments

**8-10:** Deep market insights with quantitative analysis
**5-7:** Basic market understanding
**0-4:** Vague or missing market analysis

### 2. Strategic Vision (0-10)
- Clear long-term vision
- Strategic positioning
- Differentiation strategy
- Roadmap alignment

**8-10:** Cohesive vision with clear differentiation
**5-7:** Some strategic thinking but incomplete
**0-4:** No clear strategy or vision

### 3. Business Model (0-10)
- Revenue model clarity
- Unit economics understanding
- Growth strategy
- Sustainability

**8-10:** Clear business model with unit economics
**5-7:** Basic business model
**0-4:** Weak or missing business model

### 4. Execution Plan (0-10)
- Phased approach
- Resource requirements
- Timeline and milestones
- Risk mitigation

**8-10:** Detailed execution plan with risk management
**5-7:** Basic plan but gaps
**0-4:** Vague or unrealistic plan`,
  },
  {
    source: 'curated',
    title: 'Product Improvement Rubric',
    category: 'Product Improvement',
    doc_type: 'rubric',
    content: `# Product Improvement Interview Rubric

## Scoring Dimensions (0-10 each)

### 1. Problem Identification (0-10)
- Clear problem statement
- User pain points
- Data-driven insights
- Root cause analysis

**8-10:** Well-defined problem with evidence
**5-7:** Problem identified but shallow
**0-4:** Vague problem or jumping to solutions

### 2. Solution Quality (0-10)
- Creative solutions
- Feasibility assessment
- User-centric design
- Multiple options considered

**8-10:** Innovative, feasible solutions
**5-7:** Decent solutions but limited creativity
**0-4:** Weak or unfeasible solutions

### 3. Impact Assessment (0-10)
- Expected impact on metrics
- User benefit quantification
- Business impact
- Prioritization rationale

**8-10:** Clear impact with metrics
**5-7:** Some impact assessment
**0-4:** No clear impact or metrics`,
  },
];

// More frameworks
const moreFrameworks = [
  {
    source: 'curated',
    title: 'RICE Prioritization Framework (Detailed)',
    category: 'Product Strategy',
    doc_type: 'framework',
    content: `# RICE Framework - Detailed Guide

## What is RICE?
RICE is a scoring framework for prioritizing features/initiatives.

## Components

### R - Reach
**Question:** How many users will this affect in a given period?

**How to estimate:**
- Count users/transactions per quarter
- Use historical data if available
- Be realistic, not optimistic

**Examples:**
- Feature used by 10% of users monthly = 10% × monthly users
- One-time campaign = total users reached
- Always-on feature = active users per quarter

### I - Impact
**Question:** How much will this impact each user?

**Scale (per user):**
- **3** = Massive (game-changing)
- **2** = High (significant improvement)
- **1** = Medium (noticeable)
- **0.5** = Low (minor)
- **0.25** = Minimal (barely noticeable)

**Tips:**
- Think about user experience, not business metrics
- Consider both direct and indirect impact
- Be conservative - most things are 1 or 2

### C - Confidence
**Question:** How confident are you in your estimates?

**Scale:**
- **100%** = High confidence (data-backed)
- **80%** = Medium confidence (educated guess)
- **50%** = Low confidence (uncertain)

**When confidence is low:**
- Do more research
- Run small experiments
- Talk to users/experts

### E - Effort
**Question:** How much work will this take?

**Unit:** Person-months (or person-weeks)

**Include:**
- Design time
- Development time
- Testing
- Launch/rollout
- Don't include: maintenance, unless significant

**Be realistic:**
- Account for unknown unknowns (add 20-30% buffer)
- Consider team capacity
- Include dependencies

## Calculation

**RICE Score = (Reach × Impact × Confidence) / Effort**

**Example:**
- Reach: 10,000 users/quarter
- Impact: 2 (high)
- Confidence: 80% (0.8)
- Effort: 2 person-months

**Score = (10,000 × 2 × 0.8) / 2 = 8,000**

## Best Practices
1. **Compare relatively** - Don't worry about absolute scores
2. **Revisit estimates** - Update as you learn more
3. **Use data** - Don't guess if you can measure
4. **Involve team** - Get input from engineers, designers
5. **Document assumptions** - Track why you gave each score`,
  },
  {
    source: 'curated',
    title: 'HEART Metrics Framework',
    category: 'Metrics',
    doc_type: 'framework',
    content: `# HEART Metrics Framework

A framework for measuring user experience and product success.

## H - Happiness
**What:** User satisfaction, perceived value, NPS

**How to measure:**
- Surveys (NPS, CSAT)
- App store ratings
- User interviews
- Sentiment analysis

**Examples:**
- NPS score
- % users who rate 4+ stars
- Qualitative feedback themes

## E - Engagement
**What:** How often/how much users interact

**How to measure:**
- Frequency of use
- Depth of interaction
- Session duration
- Feature adoption

**Examples:**
- DAU/WAU/MAU
- Sessions per user per week
- Time spent in app
- Features used per session

## A - Adoption
**What:** % of users who try a new feature

**How to measure:**
- Feature activation rate
- First-time use
- Onboarding completion
- New user adoption

**Examples:**
- % users who used feature within 7 days
- Feature discovery rate
- Setup completion rate

## R - Retention
**What:** Do users come back?

**How to measure:**
- Return rate (D1, D7, D30)
- Churn rate
- Cohort retention
- Lifetime value

**Examples:**
- D7 retention: % users active on day 7
- Monthly retention curve
- Annual retention rate

## T - Task Success
**What:** Can users complete key tasks?

**How to measure:**
- Task completion rate
- Time to complete
- Error rate
- Support tickets

**Examples:**
- % users who complete checkout
- Average time to first value
- Error rate in onboarding
- Support ticket volume

## Applying HEART
1. **Choose 1-2 metrics per dimension** - Don't track everything
2. **Define baselines** - Know your starting point
3. **Set targets** - What success looks like
4. **Track regularly** - Weekly/monthly reviews
5. **Connect to actions** - Link metrics to product decisions`,
  },
  {
    source: 'curated',
    title: 'Jobs-to-be-Done Framework',
    category: 'Product Design',
    doc_type: 'framework',
    content: `# Jobs-to-be-Done (JTBD) Framework

## What is Jobs-to-be-Done?
Users don't buy products - they "hire" them to do a job.

## Core Concept
**"When [situation], I want to [motivation], so I can [expected outcome]"**

Example: "When I'm hungry at work, I want to quickly order food, so I can get back to work without leaving."

## Types of Jobs

### Functional Jobs
**What:** Practical tasks users need to accomplish

**Examples:**
- "Help me track my expenses"
- "Let me find a restaurant nearby"
- "Enable me to share photos with friends"

### Emotional Jobs
**What:** How users want to feel

**Examples:**
- "Make me feel accomplished"
- "Help me feel connected to others"
- "Make me feel smart/productive"

### Social Jobs
**What:** How users want to be perceived

**Examples:**
- "Make me look professional"
- "Show I'm tech-savvy"
- "Demonstrate I care about health"

## How to Identify Jobs

### 1. Observe Behavior
- Watch what users actually do
- Note workarounds and hacks
- Identify pain points

### 2. Ask "Why?"
- Why did you switch products?
- Why do you use this feature?
- Why is this important to you?

### 3. Find the "Bigger Job"
- Users hiring a drill → Job is "make a hole"
- Users hiring a ride → Job is "get from A to B"
- Users hiring social media → Job is "feel connected"

## Using JTBD in Product Design

### Step 1: Define the Job Statement
"When [context], I want to [action], so I can [outcome]"

### Step 2: Identify Job Steps
Break down the job into steps:
1. Discover need
2. Research options
3. Choose solution
4. Use solution
5. Evaluate outcome

### Step 3: Find Pain Points
At each step, identify:
- What's frustrating?
- What takes too long?
- What's confusing?
- What's missing?

### Step 4: Design Solutions
Address pain points at each step with features.

## Examples

### Netflix
**Job:** "When I have free time, I want to be entertained, so I can relax and escape."

**Job steps:**
1. Decide what to watch
2. Start watching
3. Continue watching
4. Share with friends

### Uber
**Job:** "When I need to go somewhere, I want reliable transportation, so I can get there on time."

**Job steps:**
1. Request ride
2. Track arrival
3. Get in car
4. Pay easily

## Benefits of JTBD
- Focuses on user value, not features
- Reveals why users switch products
- Helps prioritize features
- Guides positioning and messaging`,
  },
  {
    source: 'curated',
    title: 'OKR Framework for Product',
    category: 'Product Strategy',
    doc_type: 'framework',
    content: `# OKR Framework (Objectives and Key Results)

## What are OKRs?
A goal-setting framework: **Objectives** (qualitative goals) + **Key Results** (quantitative metrics).

## Structure

### Objective
**What:** A qualitative, inspirational goal

**Characteristics:**
- Memorable and motivating
- Time-bound (usually quarterly)
- Aligned with company mission
- 3-5 objectives per team

**Examples:**
- "Make our product the most trusted in the industry"
- "Deliver best-in-class user experience"
- "Build a sustainable growth engine"

### Key Results
**What:** Measurable outcomes that prove you achieved the objective

**Characteristics:**
- Specific and quantitative
- Measurable with data
- Ambitious but achievable
- 2-4 key results per objective

**Examples:**
- "Increase NPS from 40 to 60"
- "Reduce time-to-value from 14 days to 7 days"
- "Achieve 80% feature adoption rate"

## Writing Good OKRs

### Good Objective
✅ "Make onboarding seamless and delightful"
✅ "Become the #1 choice for small businesses"
✅ "Build a culture of experimentation"

### Bad Objective
❌ "Improve metrics" (too vague)
❌ "Ship 10 features" (activity, not outcome)
❌ "Make users happy" (not measurable)

### Good Key Results
✅ "Reduce onboarding time from 10 min to 5 min"
✅ "Increase small business signups by 50%"
✅ "Run 20 A/B tests this quarter"

### Bad Key Results
❌ "Work hard" (not measurable)
❌ "Make progress" (vague)
❌ "100% customer satisfaction" (unrealistic)

## OKR Best Practices

### 1. Set Ambitious Goals
- Aim for 70% achievement
- If you hit 100%, goals were too easy
- If you hit <40%, goals were too ambitious

### 2. Keep It Simple
- 3-5 objectives max
- 2-4 key results per objective
- Focus on what matters most

### 3. Track Regularly
- Weekly check-ins
- Monthly reviews
- Quarterly planning

### 4. Align Across Teams
- Company OKRs → Team OKRs → Individual OKRs
- Everyone should see connection to mission

### 5. Learn from Results
- Celebrate progress, not just completion
- Analyze what worked/didn't
- Adjust for next quarter`,
  },
];

// More PM concepts
const moreConcepts = [
  {
    source: 'curated',
    title: 'MVP (Minimum Viable Product) Definition',
    category: 'Product Design',
    doc_type: 'concept',
    content: `# MVP Definition and Best Practices

## What is an MVP?
Minimum Viable Product = The smallest version of a product that delivers core value to users and validates key assumptions.

## Key Principles

### 1. Minimum
- Smallest feature set possible
- Core functionality only
- No nice-to-haves
- Can be built quickly

### 2. Viable
- Actually solves the problem
- Provides real value
- Users can complete key tasks
- Not a prototype or demo

### 3. Product
- Real, usable product
- Not a landing page or mockup
- Users can interact with it
- Can be improved iteratively

## MVP vs Other Concepts

### MVP vs Prototype
- **Prototype:** Exploratory, not for users
- **MVP:** For real users, validates assumptions

### MVP vs Beta
- **Beta:** Full features, limited users
- **MVP:** Core features, broader testing

### MVP vs First Release
- **First Release:** Often includes too much
- **MVP:** Deliberately minimal

## How to Define Your MVP

### Step 1: Identify Core Value
**Question:** What's the ONE thing your product must do?

**Examples:**
- Uber MVP: Match riders with drivers
- Airbnb MVP: List and book accommodations
- Slack MVP: Send messages to team

### Step 2: List Must-Have Features
**Only features needed for core value**

**Filter criteria:**
- Can users get value without this?
- Can we validate without this?
- Can we build this later?

### Step 3: Define Success Metrics
**How will you know MVP works?**

- User activation rate
- Task completion rate
- Retention (D7, D30)
- User feedback

### Step 4: Set Scope Boundaries
**Explicitly exclude:**
- Nice-to-have features
- Edge cases
- Advanced features
- Polish/optimization

## Common MVP Mistakes

### ❌ Too Feature-Rich
- Including every "must-have"
- Adding features "just in case"
- Trying to match competitors

### ❌ Too Minimal
- Not actually viable
- Missing core functionality
- Can't validate assumptions

### ❌ Wrong Assumptions
- Building features users don't want
- Solving wrong problem
- Targeting wrong users

## MVP Examples

### Dropbox MVP
- Core: File sync
- Excluded: Sharing, versioning, collaboration
- Validated: People want cloud file storage

### Zappos MVP
- Core: Online shoe sales
- Excluded: Inventory (bought from stores)
- Validated: People buy shoes online

### Buffer MVP
- Core: Schedule tweets
- Excluded: Analytics, team features
- Validated: People want social scheduling`,
  },
  {
    source: 'curated',
    title: 'User Research Methods Guide',
    category: 'Product Design',
    doc_type: 'concept',
    content: `# User Research Methods for PMs

## When to Use Which Method

### Discovery Phase (Understanding Users)

#### User Interviews
**When:** Need deep qualitative insights

**How:**
- 1-on-1 conversations (30-60 min)
- Open-ended questions
- Understand motivations, pain points
- 5-10 users typically sufficient

**Best for:**
- Understanding user needs
- Identifying problems
- Exploring new concepts

#### Surveys
**When:** Need quantitative data from many users

**How:**
- Online questionnaires
- Multiple choice + open-ended
- 100+ respondents for statistical significance

**Best for:**
- Validating hypotheses at scale
- Understanding user demographics
- Measuring satisfaction (NPS, CSAT)

#### Field Studies / Ethnography
**When:** Need to observe real behavior

**How:**
- Watch users in their environment
- Observe natural behavior
- Note context and constraints

**Best for:**
- Understanding real-world usage
- Discovering unexpected behaviors
- Context-specific insights

### Validation Phase (Testing Solutions)

#### Usability Testing
**When:** Testing if users can use your product

**How:**
- Give users tasks to complete
- Observe where they struggle
- Ask for feedback
- 5-8 users typically sufficient

**Best for:**
- Finding usability issues
- Testing new features
- Validating design decisions

#### A/B Testing
**When:** Comparing two versions quantitatively

**How:**
- Split users into groups
- Show different versions
- Measure key metrics
- Statistical significance required

**Best for:**
- Optimizing conversion
- Testing design variations
- Validating features

#### Prototype Testing
**When:** Testing concepts before building

**How:**
- Create clickable prototypes
- Test with users
- Gather feedback early

**Best for:**
- Validating ideas quickly
- Saving development time
- Exploring concepts

## Research Methods by Question Type

### "What do users need?"
- User interviews
- Surveys
- Field studies

### "Can users use this?"
- Usability testing
- Prototype testing

### "Which version is better?"
- A/B testing
- Preference testing

### "How do users behave?"
- Analytics
- Field studies
- Session recordings

## Best Practices

### 1. Mix Methods
- Combine qualitative + quantitative
- Use multiple methods for validation
- Don't rely on one data source

### 2. Ask Open-Ended Questions
- "What" and "Why", not "Do you like this?"
- Let users tell their story
- Avoid leading questions

### 3. Sample Size Matters
- Qualitative: 5-10 users often enough
- Quantitative: 100+ for significance
- Statistical tests for A/B tests

### 4. Recruit Right Users
- Target actual users/segment
- Not just anyone
- Representative sample

### 5. Synthesize Findings
- Look for patterns
- Identify themes
- Prioritize insights
- Share with team`,
  },
  {
    source: 'curated',
    title: 'A/B Testing Best Practices',
    category: 'Metrics',
    doc_type: 'concept',
    content: `# A/B Testing Guide for PMs

## What is A/B Testing?
Comparing two versions (A and B) to see which performs better on a specific metric.

## When to A/B Test

### ✅ Good Use Cases
- Testing feature variations
- Optimizing conversion funnels
- Testing design changes
- Validating hypotheses
- Making data-driven decisions

### ❌ Not Good For
- Testing completely new features (use other methods)
- Testing when sample size is too small
- Testing when impact is clearly negative
- Testing when change is mandatory (legal, security)

## Setting Up an A/B Test

### Step 1: Define Hypothesis
**Format:** "If we [change], then [metric] will [increase/decrease] because [reason]"

**Example:** "If we add social proof to checkout, then conversion rate will increase by 10% because users will feel more confident."

### Step 2: Choose Metrics

#### Primary Metric
**What:** Main metric you're optimizing

**Examples:**
- Conversion rate
- Click-through rate
- Engagement rate
- Revenue per user

#### Guardrail Metrics
**What:** Metrics you don't want to hurt

**Examples:**
- User satisfaction (NPS)
- Retention rate
- Support tickets
- Time on site

### Step 3: Determine Sample Size
**Use A/B test calculator:**
- Baseline conversion rate
- Minimum detectable effect (MDE)
- Statistical significance (usually 95%)
- Power (usually 80%)

**Rule of thumb:**
- Need thousands of users per variant
- Run for at least 1-2 weeks (account for weekly patterns)
- Longer for low-traffic features

### Step 4: Random Assignment
- 50/50 split (or appropriate ratio)
- Users stay in same variant
- Random and unbiased
- Account for user segments if needed

### Step 5: Run Test
- Monitor daily
- Check for anomalies
- Don't peek early (except for safety)
- Run for full duration

### Step 6: Analyze Results
- Calculate statistical significance (p-value < 0.05)
- Check guardrail metrics
- Consider secondary metrics
- Document learnings

## Common Mistakes

### ❌ Peeking Early
- Stopping test when results look good
- Leads to false positives
- Wait for full sample size

### ❌ Not Testing Long Enough
- Weekly patterns matter
- Need full cycle
- Account for user learning curve

### ❌ Testing Too Many Things
- Can't isolate what caused change
- Test one thing at a time
- Use multivariate testing for multiple variables

### ❌ Ignoring Guardrail Metrics
- Optimizing primary metric at any cost
- Check for negative impacts
- Holistic view important

### ❌ Not Documenting
- Learnings get lost
- Document what worked/didn't
- Share with team

## Interpreting Results

### Significant Winner
- p-value < 0.05
- Guardrail metrics OK
- → Implement winning variant

### No Significant Difference
- p-value > 0.05
- → Either variant fine, choose based on other factors

### Significant Loser
- Test variant performed worse
- → Keep original or iterate

## Advanced: Multi-Variant Testing
- Testing 3+ variants (A/B/C/D)
- Requires larger sample size
- Use tools like Optimizely, VWO

## Tools
- Google Optimize
- Optimizely
- VWO
- LaunchDarkly
- Custom implementation`,
  },
  {
    source: 'curated',
    title: 'Stakeholder Management Guide',
    category: 'Product Strategy',
    doc_type: 'concept',
    content: `# Stakeholder Management for PMs

## Who Are Stakeholders?
Anyone who has interest in or impact on your product.

## Key Stakeholders

### Internal
- **Engineering:** Builds the product
- **Design:** Creates user experience
- **Sales:** Sells the product
- **Marketing:** Promotes the product
- **Support:** Helps users
- **Leadership:** Sets strategy
- **Legal/Compliance:** Ensures compliance

### External
- **Users:** Use the product
- **Customers:** Pay for the product
- **Partners:** Integrate with product
- **Investors:** Fund the company

## Stakeholder Mapping

### Power-Interest Matrix

#### High Power, High Interest (Manage Closely)
- Keep fully informed
- Engage frequently
- Address concerns proactively
- Examples: CEO, key customers

#### High Power, Low Interest (Keep Satisfied)
- Keep satisfied
- Monitor but don't overwhelm
- Examples: Investors, executives

#### Low Power, High Interest (Keep Informed)
- Keep informed
- Regular updates
- Examples: Power users, advocates

#### Low Power, Low Interest (Monitor)
- Minimal effort
- Monitor for changes
- Examples: General users

## Communication Strategies

### 1. Tailor Message
- **Technical team:** Details, trade-offs, timelines
- **Business team:** Impact, metrics, ROI
- **Leadership:** Strategy, vision, risks
- **Users:** Benefits, value, how to use

### 2. Choose Right Channel
- **Email:** Updates, summaries
- **Slack/Teams:** Quick questions, async
- **Meetings:** Important decisions, alignment
- **Docs:** Detailed specs, plans

### 3. Frequency Matters
- **Daily:** Engineering, Design
- **Weekly:** Leadership, cross-functional
- **Monthly:** Broader stakeholders
- **As needed:** Ad-hoc updates

## Managing Conflicts

### 1. Listen First
- Understand their perspective
- Acknowledge concerns
- Don't be defensive

### 2. Find Common Ground
- Align on shared goals
- Focus on user value
- Reference data/evidence

### 3. Compromise When Possible
- Not everything is zero-sum
- Find win-win solutions
- Prioritize what matters most

### 4. Escalate When Necessary
- If conflicts block progress
- Use leadership support
- Document decisions

## Best Practices

### 1. Build Relationships Early
- Don't wait for problems
- Regular check-ins
- Understand their goals

### 2. Be Transparent
- Share roadmap
- Explain decisions
- Admit mistakes

### 3. Set Expectations
- Clear timelines
- Realistic commitments
- Communicate changes early

### 4. Show Progress
- Regular updates
- Celebrate wins
- Share learnings

### 5. Be Data-Driven
- Use data to support decisions
- Share metrics
- Show impact`,
  },
  {
    source: 'curated',
    title: 'Product Roadmap Best Practices',
    category: 'Product Strategy',
    doc_type: 'concept',
    content: `# Product Roadmap Guide

## What is a Roadmap?
A strategic plan showing what you'll build and why, aligned with business goals.

## Roadmap Levels

### Strategic Roadmap (12-24 months)
- High-level themes
- Business objectives
- Major initiatives
- For leadership, investors

### Tactical Roadmap (3-6 months)
- Specific features
- Detailed timelines
- Resource allocation
- For execution teams

### Release Plan (1-3 months)
- Exact features
- Sprint breakdown
- For engineering/design

## Roadmap Components

### 1. Themes
**What:** High-level focus areas

**Examples:**
- "Improve user onboarding"
- "Increase engagement"
- "Expand to new markets"

### 2. Initiatives
**What:** Major work items

**Examples:**
- "Redesign checkout flow"
- "Build mobile app"
- "Launch AI features"

### 3. Features
**What:** Specific functionality

**Examples:**
- "One-click checkout"
- "Push notifications"
- "Chatbot support"

### 4. Timeline
**What:** When things will ship

**Formats:**
- Quarters (Q1, Q2)
- Months (Jan, Feb)
- Sprints (Sprint 1, 2)

## Roadmap Best Practices

### 1. Focus on Outcomes, Not Features
**Bad:** "Build dark mode"
**Good:** "Improve user experience in low-light environments"

### 2. Prioritize by Impact
- Use frameworks (RICE, Value vs Effort)
- Align with business goals
- Balance short-term and long-term

### 3. Be Flexible
- Roadmaps change
- Update regularly
- Don't overcommit

### 4. Communicate Clearly
- Different views for different audiences
- Explain "why" not just "what"
- Show trade-offs

### 5. Balance Stakeholder Needs
- User needs
- Business goals
- Technical debt
- Strategic initiatives

## Common Roadmap Mistakes

### ❌ Too Detailed Too Far Out
- Details change
- Keep far future high-level
- Add details as you get closer

### ❌ Ignoring Technical Debt
- Allocate 20-30% for debt
- Balance new features with maintenance
- Don't let product rot

### ❌ No Prioritization
- Everything is priority 1
- Use frameworks
- Make tough decisions

### ❌ Not Updating
- Roadmap becomes stale
- Update monthly/quarterly
- Communicate changes

### ❌ Feature-Focused
- Focus on problems solved
- Show user value
- Align with metrics

## Roadmap Templates

### Theme-Based
\`\`\`
Q1: User Onboarding
  - Simplify signup
  - Improve first experience
  - Reduce time to value

Q2: Engagement
  - Push notifications
  - Social features
  - Gamification
\`\`\`

### Timeline-Based
\`\`\`
Now (1-3 months)
  - Feature A
  - Feature B

Next (3-6 months)
  - Feature C
  - Feature D

Later (6+ months)
  - Feature E
  - Feature F
\`\`\`

### OKR-Based
\`\`\`
Objective: Increase user engagement
  - KR1: Daily active users +20%
    → Feature: Push notifications
  - KR2: Session duration +15%
    → Feature: Personalized feed
\`\`\``,
  },
  {
    source: 'curated',
    title: 'Answer Structure Templates',
    category: 'Product Design',
    doc_type: 'template',
    content: `# PM Interview Answer Structure Templates

## Product Design Question Template

### 1. Problem Clarification (2-3 min)
- Ask clarifying questions
- Define scope and constraints
- Establish success criteria
- Confirm assumptions

**Example questions:**
- "Who is the target user?"
- "What's the primary goal?"
- "Are there constraints?"
- "What does success look like?"

### 2. User Research (3-4 min)
- Define user segments
- Identify pain points
- Jobs-to-be-done
- Current solutions

**Structure:**
- Primary user segment
- Secondary segments
- Pain points for each
- Current workarounds

### 3. Solution Design (4-5 min)
- Core features
- MVP definition
- Prioritization
- User flow

**Structure:**
- Main solution concept
- Key features (3-5)
- MVP scope
- Prioritization rationale

### 4. Metrics & Success (2-3 min)
- North Star Metric
- Supporting metrics
- Guardrail metrics
- Success criteria

**Structure:**
- Primary metric + why
- Supporting metrics (3-4)
- Guardrail metrics
- Target thresholds

### 5. Go-to-Market (1-2 min)
- Launch strategy
- Phased rollout
- Key milestones

## RCA Question Template

### 1. Problem Definition (3-4 min)
**Clarifying questions:**
- Timeline: "When did this start?"
- Magnitude: "By how much?"
- Scope: "Which platforms/regions?"
- Related metrics: "What else changed?"

**Document:**
- Baseline numbers
- Current numbers
- Timeline of events

### 2. Hypothesis Generation (3-4 min)
**Organize by:**
- Internal factors (product, tech, ops)
- External factors (competitors, market, events)

**For each hypothesis:**
- What could cause this?
- Is it likely?
- How to test?

### 3. Data Investigation (4-5 min)
**Ask for:**
- Segmented data (platform, geography, cohort)
- Correlation data
- Timeline correlation
- A/B test results

**Analyze:**
- Patterns across segments
- Correlation vs causation
- Timeline alignment

### 4. Root Cause Identification (2-3 min)
**Distinguish:**
- Symptom vs root cause
- Build causal chain
- Validate with evidence

**Structure:**
- Primary hypothesis
- Supporting evidence
- Why this is root cause (not symptom)

### 5. Solution (2-3 min)
- Short-term fix
- Long-term prevention
- Success metrics
- Monitoring plan

## Guesstimate Template

### 1. Clarification (2-3 min)
**Ask:**
- Geography: "Which country/region?"
- Time period: "Per day/week/month?"
- Scope: "What to include/exclude?"
- Definitions: "What exactly counts?"

### 2. Approach Selection (1 min)
- Top-down vs bottom-up
- Choose methodology
- Explain why

### 3. Structured Breakdown (4-5 min)
**Create equation:**
- Total = Component1 × Component2 × ...
- Break down each component
- Show calculations

**Example:**
- Total users = Population × % internet users × % use product × frequency

### 4. Assumptions (2-3 min)
- List all assumptions
- Justify each
- Use reasonable numbers
- Round for simplicity

### 5. Calculation (2-3 min)
- Show step-by-step math
- Keep it simple
- Round numbers
- Show work clearly

### 6. Sanity Check (1-2 min)
- Compare to known benchmarks
- Validate order of magnitude
- Alternative calculation if time
- Summary statement`,
  },
  {
    source: 'curated',
    title: 'Common PM Interview Pitfalls',
    category: 'Product Design',
    doc_type: 'guide',
    content: `# Common PM Interview Mistakes to Avoid

## Pitfall 1: Jumping to Solutions

### ❌ Bad
"Let me design a feature for that..."

### ✅ Good
"Before I propose a solution, can I clarify a few things?"

**Why:** Understanding the problem fully is more important than the solution.

## Pitfall 2: Not Asking Questions

### ❌ Bad
Assumes context and starts answering immediately.

### ✅ Good
Asks 5-10 clarifying questions before starting.

**Why:** Interviewers want to see how you think, not just what you know.

## Pitfall 3: Ignoring Users

### ❌ Bad
Designs features without mentioning users.

### ✅ Good
Starts with user segments and pain points.

**Why:** PM is about solving user problems, not building cool features.

## Pitfall 4: Vague Metrics

### ❌ Bad
"We'll track engagement and see if it goes up."

### ✅ Good
"North Star Metric: Daily active users. Target: 20% increase. Supporting: Session duration, retention. Guardrail: NPS shouldn't drop."

**Why:** Specific, measurable metrics show you understand success.

## Pitfall 5: No Prioritization

### ❌ Bad
Lists 10 features without prioritizing.

### ✅ Good
"Here are 3 features. Feature A is highest priority because it addresses the biggest pain point and has highest impact/effort ratio."

**Why:** PMs make trade-offs constantly. Show you can prioritize.

## Pitfall 6: Unrealistic Assumptions

### ❌ Bad
"Let's assume 100% of users will use this feature."

### ✅ Good
"Based on similar features, I'd estimate 20-30% adoption. We should validate this assumption with a small test."

**Why:** Realistic assumptions show business sense.

## Pitfall 7: Ignoring Trade-offs

### ❌ Bad
"Let's build everything!"

### ✅ Good
"Feature A is high value but requires significant engineering. We could start with a simpler version that delivers 80% of the value with 20% of the effort."

**Why:** Everything has trade-offs. Acknowledge them.

## Pitfall 8: No Framework

### ❌ Bad
Random thoughts, disorganized answer.

### ✅ Good
Uses CIRCLES, AARM, or other frameworks systematically.

**Why:** Frameworks show structured thinking.

## Pitfall 9: Not Validating

### ❌ Bad
"Let's build this and see what happens."

### ✅ Good
"Before building, we should validate with user interviews and a small prototype test."

**Why:** Validate before building saves time and resources.

## Pitfall 10: Weak Communication

### ❌ Bad
Rambles, unclear structure, hard to follow.

### ✅ Good
Clear sections, signposts, summary at end.

**Why:** PMs need to communicate clearly to stakeholders.

## How to Avoid These

### 1. Practice with Frameworks
- Use CIRCLES for design
- Use AARM for metrics
- Use structured approach for RCA

### 2. Always Start with Questions
- Ask 5-10 clarifying questions
- Don't assume anything
- Show curiosity

### 3. Think User-First
- Start with users
- Identify pain points
- Design for users

### 4. Be Specific
- Specific metrics
- Specific features
- Specific timelines

### 5. Show Structure
- Use frameworks
- Organize thoughts
- Clear sections`,
  },
];

// PM concepts and checklists
const concepts = [
  {
    source: 'curated',
    title: 'North Star Metric Guide',
    category: 'Metrics',
    doc_type: 'concept',
    content: `# North Star Metric (NSM)

## Definition
The single metric that best captures the core value delivered to customers.

## Characteristics of a Good NSM
1. **Expresses value**: Captures value delivered to customers
2. **Measures progress**: Indicates business health
3. **Actionable**: Can be influenced by team actions
4. **Understandable**: Easy to explain to anyone
5. **Balanced**: Considers quality and quantity

## Examples by Product Type

### Social Networks
- Facebook: Daily Active Users (DAU)
- LinkedIn: Weekly active users / connections made

### Marketplace
- Airbnb: Nights booked
- Uber: Rides completed

### SaaS/Productivity
- Slack: Messages sent by teams
- Notion: Collaborative workspaces created

### E-commerce
- Amazon: Purchases per customer
- Shopify: GMV (Gross Merchandise Value)

### Media/Content
- Netflix: Hours watched
- Spotify: Time spent listening

## How to Define Your NSM
1. Identify core product value
2. Map user journey to value
3. Find the "aha moment" metric
4. Validate it drives business outcomes
5. Ensure it's measurable and actionable`,
  },
  {
    source: 'curated',
    title: 'Prioritization Frameworks',
    category: 'Product Strategy',
    doc_type: 'concept',
    content: `# Prioritization Frameworks

## RICE Framework
**R**each × **I**mpact × **C**onfidence / **E**ffort

- **Reach**: How many users affected (per quarter)?
- **Impact**: How much value per user? (3=massive, 2=high, 1=medium, 0.5=low, 0.25=minimal)
- **Confidence**: How certain are you? (100%=high, 80%=medium, 50%=low)
- **Effort**: How many person-months?

**Score = (Reach × Impact × Confidence) / Effort**

## Value vs Effort Matrix
Simple 2×2 matrix:
- **Quick Wins**: High value, low effort → Do first
- **Big Bets**: High value, high effort → Plan carefully
- **Fill-ins**: Low value, low effort → Do if capacity
- **Money Pits**: Low value, high effort → Avoid

## MoSCoW Method
- **Must have**: Critical for launch
- **Should have**: Important but not vital
- **Could have**: Nice to have if time/budget
- **Won't have**: Explicitly out of scope

## Kano Model
Classifies features by satisfaction:
- **Basic**: Expected; absence causes dissatisfaction
- **Performance**: More is better; linear satisfaction
- **Delighters**: Unexpected; high satisfaction

## Weighted Scoring
Score features across dimensions:
- User value (weight: 40%)
- Business impact (weight: 30%)
- Technical feasibility (weight: 20%)
- Strategic alignment (weight: 10%)`,
  },
];

// Company briefs for interview context
const companyBriefs = [
  {
    source: 'curated',
    title: 'Google Product Management Context',
    category: 'Product Strategy',
    doc_type: 'company_brief',
    content: `# Google Product Management Context

## Company Overview
Google (Alphabet) - Search, Ads, Cloud, Android, YouTube, Workspace

## PM Interview Focus Areas
- **Metrics**: Search quality, ad relevance, user engagement
- **Scale**: Billions of users, global infrastructure
- **Data-driven**: Heavy emphasis on experimentation and analytics
- **User experience**: Simplicity, speed, accessibility

## Common Interview Topics
- Search algorithms and ranking
- Ad targeting and relevance
- YouTube recommendations
- Android ecosystem
- Cloud infrastructure
- Privacy and security

## Key Metrics They Care About
- Search quality (CTR, time to result)
- User engagement (sessions, queries per session)
- Ad relevance and revenue
- YouTube watch time and retention
- Android adoption and developer satisfaction

## Product Culture
- Data-driven decision making
- Large-scale thinking (billions of users)
- Focus on user value and simplicity
- Strong engineering culture
- Innovation and moonshot projects`,
  },
  {
    source: 'curated',
    title: 'Meta (Facebook) Product Management Context',
    category: 'Product Strategy',
    doc_type: 'company_brief',
    content: `# Meta Product Management Context

## Company Overview
Meta - Facebook, Instagram, WhatsApp, Messenger, VR/AR

## PM Interview Focus Areas
- **Social networks**: Engagement, connections, content
- **Growth**: User acquisition, retention, virality
- **Monetization**: Ads, commerce, creator economy
- **Privacy**: User data, transparency, safety

## Common Interview Topics
- News Feed ranking
- Stories and Reels
- Groups and communities
- Marketplace
- Messenger and WhatsApp
- VR/AR (Metaverse)
- Creator tools and monetization

## Key Metrics They Care About
- Daily Active Users (DAU)
- Time spent in app
- Engagement rate (likes, comments, shares)
- Network effects (connections, groups)
- Ad revenue and relevance
- Creator earnings

## Product Culture
- Move fast and break things (with discipline)
- Growth mindset
- Social impact focus
- Strong design culture
- Data-driven experimentation`,
  },
  {
    source: 'curated',
    title: 'Amazon Product Management Context',
    category: 'Product Strategy',
    doc_type: 'company_brief',
    content: `# Amazon Product Management Context

## Company Overview
Amazon - E-commerce, AWS, Prime, Alexa, Kindle, Video

## PM Interview Focus Areas
- **Customer obsession**: Customer-first thinking
- **E-commerce**: Marketplace, logistics, discovery
- **AWS**: Cloud services, enterprise products
- **Voice/AI**: Alexa, smart devices
- **Content**: Prime Video, Kindle, Music

## Common Interview Topics
- Product discovery and recommendations
- Supply chain and logistics
- Prime membership benefits
- AWS services and pricing
- Voice interfaces and AI
- Marketplace dynamics (sellers, buyers)

## Key Metrics They Care About
- Customer satisfaction (CSAT, NPS)
- Revenue per customer
- Conversion rate (browse to buy)
- Prime membership growth
- AWS usage and retention
- Delivery speed and reliability

## Product Culture
- Customer-obsessed (not competitor-focused)
- Long-term thinking
- Working backwards from customer needs
- Data-driven but also intuitive
- High ownership and autonomy`,
  },
  {
    source: 'curated',
    title: 'Microsoft Product Management Context',
    category: 'Product Strategy',
    doc_type: 'company_brief',
    content: `# Microsoft Product Management Context

## Company Overview
Microsoft - Office, Azure, Windows, Teams, Xbox, LinkedIn

## PM Interview Focus Areas
- **Enterprise**: B2B products, productivity tools
- **Cloud**: Azure services, infrastructure
- **Collaboration**: Teams, Office suite
- **Gaming**: Xbox, Game Pass
- **Developer tools**: VS Code, GitHub

## Common Interview Topics
- Office 365 and productivity
- Teams collaboration features
- Azure cloud services
- Windows ecosystem
- Enterprise software
- Developer experience

## Key Metrics They Care About
- Monthly Active Users (MAU)
- Subscription revenue (MRR/ARR)
- Enterprise adoption
- Usage and engagement
- Customer satisfaction
- Time to value

## Product Culture
- Enterprise-focused
- Ecosystem thinking (Windows, Office, Azure)
- Developer-friendly
- Inclusive design
- Growth mindset`,
  },
  {
    source: 'curated',
    title: 'Netflix Product Management Context',
    category: 'Product Strategy',
    doc_type: 'company_brief',
    content: `# Netflix Product Management Context

## Company Overview
Netflix - Streaming video, content creation, global platform

## PM Interview Focus Areas
- **Content discovery**: Recommendations, personalization
- **Playback experience**: Streaming quality, UI/UX
- **Content strategy**: Originals, licensing, global content
- **Growth**: Subscriber acquisition and retention
- **International**: Global expansion, localization

## Common Interview Topics
- Recommendation algorithm
- Content discovery and browsing
- Playback experience and quality
- Personalization and profiles
- Content strategy
- International expansion

## Key Metrics They Care About
- Subscriber growth (net adds)
- Churn rate
- Hours watched per subscriber
- Content completion rate
- Recommendation accuracy
- Playback quality (buffering, resolution)

## Product Culture
- Data-driven content decisions
- User experience focus
- Global thinking
- Innovation in content creation
- A/B testing culture`,
  },
  {
    source: 'curated',
    title: 'Uber Product Management Context',
    category: 'Product Strategy',
    doc_type: 'company_brief',
    content: `# Uber Product Management Context

## Company Overview
Uber - Ride-sharing, food delivery (Uber Eats), freight, mobility

## PM Interview Focus Areas
- **Two-sided marketplace**: Riders and drivers
- **Pricing**: Surge pricing, dynamic pricing
- **Matching**: Driver-rider matching algorithm
- **Safety**: Trust and safety features
- **Expansion**: New cities, new services

## Common Interview Topics
- Driver-rider matching
- Surge pricing and economics
- Uber Eats delivery
- Safety features
- Driver incentives
- International expansion

## Key Metrics They Care About
- Trips completed
- Driver utilization rate
- ETA (Estimated Time of Arrival)
- Take rate (revenue per trip)
- Driver and rider retention
- Safety incidents

## Product Culture
- Marketplace dynamics
- Unit economics focus
- Local optimization
- Safety and trust
- Aggressive growth`,
  },
];

// Advanced frameworks and models
const advancedFrameworks = [
  {
    source: 'curated',
    title: 'Kano Model - Feature Classification',
    category: 'Product Design',
    doc_type: 'framework',
    content: `# Kano Model for Feature Classification

## What is Kano Model?
Classifies features by how they affect user satisfaction.

## Feature Types

### 1. Basic Features (Must-Haves)
**Characteristics:**
- Expected by default
- Absence causes dissatisfaction
- Presence doesn't increase satisfaction much
- "Table stakes" features

**Examples:**
- App loads without crashing
- Login works
- Data is saved
- Search returns results

**Strategy:**
- Must have these
- Don't get credit for them
- But lose users without them

### 2. Performance Features
**Characteristics:**
- More is better
- Linear satisfaction increase
- Users can articulate these needs
- Directly correlated with satisfaction

**Examples:**
- Faster page load → more satisfaction
- More storage → more satisfaction
- Better battery life → more satisfaction

**Strategy:**
- Continuously improve
- Benchmark against competitors
- Users will pay for improvements

### 3. Delighter Features (Excitement)
**Characteristics:**
- Unexpected and innovative
- High satisfaction when present
- No dissatisfaction when absent (users don't expect them)
- "Wow" moments

**Examples:**
- Face ID (when first introduced)
- Smart replies in email
- Auto-save in Google Docs
- One-tap ordering

**Strategy:**
- Differentiate from competitors
- Create memorable experiences
- Can become Performance features over time

## Using Kano Model

### Step 1: Survey Users
Ask two questions for each feature:
1. **Functional:** "If feature exists, how do you feel?" (like, neutral, dislike)
2. **Dysfunctional:** "If feature doesn't exist, how do you feel?" (like, neutral, dislike)

### Step 2: Classify
- **Basic**: Dislike if absent, neutral if present
- **Performance**: Like if present, dislike if absent
- **Delighter**: Like if present, neutral if absent

### Step 3: Prioritize
1. **Must build**: Basic features (avoid dissatisfaction)
2. **Optimize**: Performance features (compete)
3. **Innovate**: Delighters (differentiate)

## Over Time
- Delighters → Performance → Basic
- What was innovative becomes expected
- Need continuous innovation

## Example: Smartphone
**Basic (2007):**
- Make calls
- Send texts

**Performance:**
- Battery life
- Camera quality
- Screen size

**Delighters (2007):**
- Touch screen
- App store
- Internet browsing

**Now (2024):**
- Touch screen is Basic
- App store is Basic
- Internet is Basic
- New Delighters: AI features, AR, foldable screens`,
  },
  {
    source: 'curated',
    title: 'Value Proposition Canvas',
    category: 'Product Design',
    doc_type: 'framework',
    content: `# Value Proposition Canvas

## What is it?
A tool to design products that customers actually want.

## Canvas Structure

### Customer Profile (Right Side)

#### 1. Customer Jobs
**What:** Tasks customers are trying to accomplish

**Types:**
- **Functional jobs**: Practical tasks (e.g., "get from A to B")
- **Emotional jobs**: How they want to feel (e.g., "feel safe")
- **Social jobs**: How they want to be perceived (e.g., "look professional")

#### 2. Pains
**What:** Bad outcomes, risks, obstacles customers experience

**Types:**
- **Undesired outcomes**: Things that go wrong
- **Risks**: What could go wrong
- **Obstacles**: What prevents them from getting job done

#### 3. Gains
**What:** Benefits customers want, expect, or would be surprised by

**Types:**
- **Required gains**: Must have
- **Expected gains**: Nice to have
- **Desired gains**: Want
- **Unexpected gains**: Delighters

### Value Map (Left Side)

#### 1. Products & Services
**What:** What you offer

**Include:**
- Features
- Services
- Experiences

#### 2. Pain Relievers
**What:** How you address customer pains

**Map to:**
- Which pains you address
- How you eliminate or reduce them

#### 3. Gain Creators
**What:** How you create customer gains

**Map to:**
- Which gains you create
- How you deliver them

## Using the Canvas

### Step 1: Fill Customer Profile
- Research your customer
- List jobs, pains, gains
- Prioritize (most important first)

### Step 2: Design Value Map
- List your products/services
- Map pain relievers to customer pains
- Map gain creators to customer gains

### Step 3: Check Fit
- Does your value map address important jobs?
- Do you relieve significant pains?
- Do you create desired gains?
- If not, iterate!

### Step 4: Test
- Validate with real customers
- Update based on feedback
- Refine fit

## Example: Uber

### Customer Profile
**Jobs:**
- Get from A to B (functional)
- Feel safe (emotional)
- Look tech-savvy (social)

**Pains:**
- Waiting for taxis
- Not knowing arrival time
- Carrying cash
- Unsafe drivers

**Gains:**
- Fast arrival
- Predictable pricing
- Easy payment
- Safe experience

### Value Map
**Products & Services:**
- Mobile app
- Driver network
- Payment system

**Pain Relievers:**
- No waiting (real-time matching)
- Know arrival time (tracking)
- No cash (in-app payment)
- Background checks (safety)

**Gain Creators:**
- Fast pickup (matching algorithm)
- Transparent pricing (upfront)
- Seamless payment (automatic)
- Safe drivers (screening)`,
  },
  {
    source: 'curated',
    title: 'ICE Prioritization Framework',
    category: 'Product Strategy',
    doc_type: 'framework',
    content: `# ICE Framework

## What is ICE?
**I**mpact × **C**onfidence / **E**ffort

Simpler alternative to RICE (without Reach).

## Components

### I - Impact (1-10)
**Scale:**
- **9-10**: Massive impact (game-changing)
- **7-8**: High impact (significant improvement)
- **5-6**: Medium impact (noticeable)
- **3-4**: Low impact (minor)
- **1-2**: Minimal impact (barely noticeable)

**Consider:**
- User value
- Business impact
- Strategic importance

### C - Confidence (0-100%)
**Scale:**
- **80-100%**: High confidence (data-backed)
- **50-79%**: Medium confidence (educated guess)
- **0-49%**: Low confidence (uncertain)

**Consider:**
- Do you have data?
- Have you validated?
- How certain are you?

### E - Effort (1-10)
**Scale:**
- **1-2**: Low effort (days)
- **3-4**: Medium effort (weeks)
- **5-7**: High effort (months)
- **8-10**: Very high effort (quarters+)

**Consider:**
- Engineering effort
- Design effort
- Time to market
- Resource requirements

## Calculation

**ICE Score = (Impact × Confidence) / Effort**

**Example:**
- Impact: 8
- Confidence: 80% (0.8)
- Effort: 3

**Score = (8 × 0.8) / 3 = 2.13**

## When to Use ICE vs RICE

### Use ICE when:
- Reach is roughly the same for all features
- Focus is on impact per user
- Simpler scoring needed

### Use RICE when:
- Features affect different numbers of users
- Reach varies significantly
- Need more granular prioritization

## Best Practices
1. Score relatively (compare features)
2. Be consistent with scales
3. Revisit as you learn more
4. Document assumptions
5. Use team input`,
  },
];

// More templates and checklists
const templates = [
  {
    source: 'curated',
    title: 'PRD (Product Requirements Document) Template',
    category: 'Product Design',
    doc_type: 'template',
    content: `# PRD Template

## 1. Overview
- **Product name**
- **Date**
- **Author**
- **Status** (draft, review, approved)

## 2. Problem Statement
- What problem are we solving?
- Who has this problem?
- Why is it important?
- Current state vs desired state

## 3. Goals & Success Metrics
- **Primary goal**: What we're trying to achieve
- **Success metrics**:
  - Primary metric (target)
  - Supporting metrics
  - Guardrail metrics
- **Success criteria**: How we'll know we succeeded

## 4. User Personas
- **Primary persona**: Target user
  - Demographics
  - Goals
  - Pain points
  - Behaviors
- **Secondary personas** (if applicable)

## 5. User Stories
- As a [user], I want [goal] so that [benefit]
- Prioritized list
- Acceptance criteria for each

## 6. Features & Requirements

### Must-Have (MVP)
- Feature 1
  - Description
  - User flow
  - Acceptance criteria

### Should-Have
- Feature 2
  - ...

### Nice-to-Have
- Feature 3
  - ...

## 7. User Flows
- Main user journey
- Edge cases
- Error states

## 8. Design Requirements
- UI/UX guidelines
- Accessibility requirements
- Responsive design needs
- Design system alignment

## 9. Technical Requirements
- Platforms (web, mobile, etc.)
- Integrations needed
- Performance requirements
- Scalability considerations
- Security requirements

## 10. Dependencies
- What needs to be built first?
- External dependencies?
- Blockers?

## 11. Risks & Mitigation
- **Technical risks**: How to mitigate
- **Business risks**: How to mitigate
- **User risks**: How to mitigate

## 12. Timeline & Milestones
- **Phase 1** (MVP): Features, timeline, success criteria
- **Phase 2**: Features, timeline
- **Phase 3**: Features, timeline

## 13. Open Questions
- Unanswered questions
- Assumptions to validate
- Research needed

## 14. Appendix
- User research findings
- Competitive analysis
- Technical specifications
- Design mockups`,
  },
  {
    source: 'curated',
    title: 'Launch Checklist Template',
    category: 'Product Strategy',
    doc_type: 'template',
    content: `# Product Launch Checklist

## Pre-Launch (4 weeks before)

### Product Readiness
- [ ] All features tested and working
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Accessibility requirements met
- [ ] Legal/compliance review done

### Documentation
- [ ] User documentation complete
- [ ] Help center articles written
- [ ] FAQ prepared
- [ ] Release notes drafted
- [ ] Internal training materials ready

### Marketing & Communication
- [ ] Marketing campaign planned
- [ ] Press release drafted
- [ ] Blog post written
- [ ] Social media content prepared
- [ ] Email announcement drafted

## Launch Week

### Monday-Tuesday
- [ ] Final QA testing
- [ ] Stakeholder approval
- [ ] Go/no-go decision
- [ ] Launch plan communicated to team

### Wednesday (Launch Day)
- [ ] Deploy to production
- [ ] Smoke tests passed
- [ ] Monitoring dashboards active
- [ ] Support team briefed
- [ ] Launch announcement sent

### Thursday-Friday
- [ ] Monitor metrics closely
- [ ] Watch for issues
- [ ] Gather initial feedback
- [ ] Celebrate with team!

## Post-Launch (Week 1)

### Monitoring
- [ ] Daily metrics review
- [ ] Error rate monitoring
- [ ] User feedback collection
- [ ] Support ticket review

### Optimization
- [ ] Quick wins identified
- [ ] Hotfixes deployed if needed
- [ ] User interviews scheduled

### Communication
- [ ] Update stakeholders
- [ ] Share learnings
- [ ] Plan next iteration`,
  },
  {
    source: 'curated',
    title: 'Retrospective Framework',
    category: 'Product Strategy',
    doc_type: 'template',
    content: `# Product Retrospective Framework

## What Went Well?
- Successful features
- Good decisions
- Effective processes
- Team wins

## What Could Be Improved?
- Missed deadlines
- Poor decisions
- Process issues
- Team challenges

## Action Items
- **What**: Specific action
- **Who**: Owner
- **When**: Timeline
- **How**: Approach

## Retrospective Formats

### Start-Stop-Continue
- **Start**: New things to try
- **Stop**: Things to stop doing
- **Continue**: Things working well

### 4Ls (Liked, Learned, Lacked, Longed For)
- **Liked**: What went well
- **Learned**: New insights
- **Lacked**: What was missing
- **Longed For**: What you wanted

### Sailboat
- **Wind** (what helps): Processes, tools, people
- **Rocks** (risks): Potential problems
- **Anchor** (what slows): Blockers, dependencies
- **Island** (goal): Where we want to be`,
  },
];

// Best practices and patterns
const bestPractices = [
  {
    source: 'curated',
    title: 'PM Interview Best Practices',
    category: 'Product Design',
    doc_type: 'best_practice',
    content: `# PM Interview Best Practices

## Before the Interview

### Research
- Understand the company's products
- Read recent news/announcements
- Understand their business model
- Know their competitors

### Prepare Stories
- STAR format (Situation, Task, Action, Result)
- Different stories for different competencies
- Quantify impact with metrics
- Practice telling them concisely

### Study Frameworks
- CIRCLES for design
- AARM for metrics
- RCA framework
- Prioritization frameworks

## During the Interview

### Ask Questions First
- Never jump to solutions
- Ask 5-10 clarifying questions
- Show curiosity and thinking process
- Don't assume anything

### Structure Your Answer
- Use frameworks (CIRCLES, AARM, etc.)
- Clear sections with headings
- Logical flow
- Summary at end

### Be User-Focused
- Start with users
- Identify pain points
- Design for users, not for features
- Show empathy

### Be Specific
- Specific metrics (not "engagement")
- Specific features (not "improve UX")
- Specific timelines
- Specific assumptions

### Show Trade-offs
- Acknowledge constraints
- Discuss alternatives considered
- Explain why you chose this approach
- Show business thinking

### Communicate Clearly
- Speak clearly and at good pace
- Use signposts ("First, let me clarify...")
- Check for understanding
- Ask if interviewer has questions

## Common Mistakes to Avoid

### ❌ Jumping to Solutions
- Always clarify problem first

### ❌ Ignoring Users
- Always start with user needs

### ❌ Vague Metrics
- Always be specific

### ❌ No Prioritization
- Always prioritize features

### ❌ Unrealistic Assumptions
- Always be realistic

### ❌ No Framework
- Always use structured approach

### ❌ Weak Communication
- Always be clear and organized`,
  },
  {
    source: 'curated',
    title: 'Experiment Design Best Practices',
    category: 'Metrics',
    doc_type: 'best_practice',
    content: `# Experiment Design Best Practices

## 1. Clear Hypothesis
**Format:** "If we [change], then [metric] will [increase/decrease] because [reason]"

**Example:** "If we add social proof to checkout, then conversion rate will increase by 10% because users will feel more confident."

## 2. Choose Right Metrics

### Primary Metric
- Directly measures what you're testing
- Actionable and measurable
- Can be influenced by change

### Guardrail Metrics
- Metrics you don't want to hurt
- User satisfaction, retention, etc.
- Monitor closely

## 3. Sample Size Calculation
- Use A/B test calculator
- Account for:
  - Baseline conversion rate
  - Minimum detectable effect (MDE)
  - Statistical significance (95%)
  - Power (80%)

**Rule of thumb:** Need thousands of users per variant

## 4. Random Assignment
- 50/50 split (or appropriate ratio)
- Users stay in same variant
- Truly random
- Account for segments if needed

## 5. Run Full Duration
- At least 1-2 weeks
- Account for weekly patterns
- Don't peek early
- Wait for statistical significance

## 6. Analyze Properly
- Calculate p-value (< 0.05 = significant)
- Check guardrail metrics
- Consider secondary metrics
- Document learnings

## Common Pitfalls

### ❌ Peeking Early
- Stopping when results look good
- Leads to false positives

### ❌ Too Small Sample
- Not enough statistical power
- Unreliable results

### ❌ Testing Too Many Things
- Can't isolate what caused change
- Test one thing at a time

### ❌ Ignoring Guardrails
- Optimizing primary metric at any cost
- Check for negative impacts

### ❌ Not Documenting
- Learnings get lost
- Document what worked/didn't`,
  },
];

async function seedKnowledgeBase() {
  console.log('🌱 Starting knowledge base seeding...\n');

  try {
    // Seed rubrics (core + additional)
    console.log('📋 Seeding rubrics...');
    const allRubrics = [...rubrics, ...moreRubrics];
    for (const rubric of allRubrics) {
      const id = await kbInsert({
        source: rubric.source,
        title: rubric.title,
        content: rubric.content,
        metadata: {
          category: rubric.category,
          doc_type: rubric.doc_type,
          tags: ['rubric', 'scoring', 'evaluation'],
          curation_score: 10,
        },
      });
      console.log(`  ✓ Added: ${rubric.title} (ID: ${id})`);
    }

    // Seed frameworks (core + additional)
    console.log('\n🏗️  Seeding frameworks...');
    const allFrameworks = [...frameworks, ...moreFrameworks];
    for (const framework of allFrameworks) {
      const id = await kbInsert({
        source: framework.source,
        title: framework.title,
        content: framework.content,
        metadata: {
          category: framework.category,
          doc_type: framework.doc_type,
          tags: ['framework', 'approach', 'methodology'],
          curation_score: 10,
        },
      });
      console.log(`  ✓ Added: ${framework.title} (ID: ${id})`);
    }

    // Seed baselines
    console.log('\n📊 Seeding baselines...');
    for (const baseline of baselines) {
      const id = await kbInsert({
        source: baseline.source,
        title: baseline.title,
        content: baseline.content,
        metadata: {
          category: baseline.category,
          doc_type: baseline.doc_type,
          tags: ['baseline', 'numbers', 'assumptions'],
          curation_score: 10,
        },
      });
      console.log(`  ✓ Added: ${baseline.title} (ID: ${id})`);
    }

    // Seed concepts (core + additional)
    console.log('\n💡 Seeding PM concepts...');
    const allConcepts = [...concepts, ...moreConcepts];
    for (const concept of allConcepts) {
      const id = await kbInsert({
        source: concept.source,
        title: concept.title,
        content: concept.content,
        metadata: {
          category: concept.category,
          doc_type: concept.doc_type,
          tags: ['concept', 'guide', 'reference'],
          curation_score: 10,
        },
      });
      console.log(`  ✓ Added: ${concept.title} (ID: ${id})`);
    }

    // Seed company briefs
    console.log('\n🏢 Seeding company briefs...');
    for (const brief of companyBriefs) {
      const id = await kbInsert({
        source: brief.source,
        title: brief.title,
        content: brief.content,
        metadata: {
          category: brief.category,
          doc_type: brief.doc_type,
          tags: ['company', 'interview', 'context'],
          curation_score: 10,
        },
      });
      console.log(`  ✓ Added: ${brief.title} (ID: ${id})`);
    }

    // Seed advanced frameworks
    console.log('\n🔬 Seeding advanced frameworks...');
    for (const framework of advancedFrameworks) {
      const id = await kbInsert({
        source: framework.source,
        title: framework.title,
        content: framework.content,
        metadata: {
          category: framework.category,
          doc_type: framework.doc_type,
          tags: ['framework', 'advanced', 'methodology'],
          curation_score: 10,
        },
      });
      console.log(`  ✓ Added: ${framework.title} (ID: ${id})`);
    }

    // Seed templates
    console.log('\n📝 Seeding templates...');
    for (const template of templates) {
      const id = await kbInsert({
        source: template.source,
        title: template.title,
        content: template.content,
        metadata: {
          category: template.category,
          doc_type: template.doc_type,
          tags: ['template', 'checklist', 'guide'],
          curation_score: 10,
        },
      });
      console.log(`  ✓ Added: ${template.title} (ID: ${id})`);
    }

    // Seed best practices
    console.log('\n⭐ Seeding best practices...');
    for (const practice of bestPractices) {
      const id = await kbInsert({
        source: practice.source,
        title: practice.title,
        content: practice.content,
        metadata: {
          category: practice.category,
          doc_type: practice.doc_type,
          tags: ['best_practice', 'guide', 'reference'],
          curation_score: 10,
        },
      });
      console.log(`  ✓ Added: ${practice.title} (ID: ${id})`);
    }

    const totalDocs =
      allRubrics.length +
      allFrameworks.length +
      baselines.length +
      allConcepts.length +
      companyBriefs.length +
      advancedFrameworks.length +
      templates.length +
      bestPractices.length;
    console.log('\n✅ Knowledge base seeding completed successfully!');
    console.log(`📚 Total documents added: ${totalDocs}`);
    console.log(`   - Rubrics: ${allRubrics.length}`);
    console.log(`   - Frameworks: ${allFrameworks.length}`);
    console.log(`   - Baselines: ${baselines.length}`);
    console.log(`   - Concepts/Guides: ${allConcepts.length}`);
    console.log(`   - Company Briefs: ${companyBriefs.length}`);
    console.log(`   - Advanced Frameworks: ${advancedFrameworks.length}`);
    console.log(`   - Templates: ${templates.length}`);
    console.log(`   - Best Practices: ${bestPractices.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding knowledge base:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedKnowledgeBase();
}

module.exports = { seedKnowledgeBase };
