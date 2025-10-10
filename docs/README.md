# PM Interview Practice - Backend API

A comprehensive backend API for practicing Product Manager interviews with AI-powered scoring using OpenAI, Stripe payment integration, and MySQL database.

## 🚀 Features

- **JWT Authentication**: Secure user registration and login with bcrypt password hashing
- **Interview Management**: Start interviews, submit answers, and get AI-powered scores
- **OpenAI Integration**: Automated scoring with detailed feedback and sample answers
- **Stripe Payments**: Subscription management with webhook support
- **Admin Dashboard**: Metrics, flagged sessions, and token usage tracking
- **Rate Limiting**: Protection against abuse with configurable limits
- **Comprehensive Testing**: Jest tests for auth and scoring functionality
- **Production Ready**: Error handling, logging, validation, and security features

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [Sample cURL Commands](#sample-curl-commands)
- [Testing](#testing)
- [Deployment](#deployment)

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM (Supabase)
- **Authentication**: JWT + bcrypt
- **AI**: OpenAI GPT-4 Turbo
- **Payments**: Stripe
- **Testing**: Jest + Supertest
- **Security**: Helmet, Rate Limiting, Input Validation

## 🗄 Database Schema

### PostgreSQL Tables (via Prisma + Supabase)

```sql
-- Users table
CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(191) NOT NULL UNIQUE,
  "password" VARCHAR(191) NOT NULL,
  "role" VARCHAR(191) DEFAULT 'user',
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "User_email_idx" ON "User"("email");

-- Questions table
CREATE TABLE "Question" (
  "id" SERIAL PRIMARY KEY,
  "text" TEXT NOT NULL,
  "category" VARCHAR(191) NOT NULL,
  "level" VARCHAR(191) NOT NULL,
  "difficulty" INTEGER DEFAULT 5,
  "tags" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Question_level_idx" ON "Question"("level");
CREATE INDEX "Question_category_idx" ON "Question"("category");

-- Sessions table
CREATE TABLE "Session" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "questionId" INTEGER NOT NULL,
  "answerText" TEXT NOT NULL,
  "transcript" TEXT,
  "status" VARCHAR(191) DEFAULT 'submitted',
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- Scores table
CREATE TABLE "Score" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" INTEGER NOT NULL UNIQUE,
  "structure" INTEGER NOT NULL,
  "metrics" INTEGER NOT NULL,
  "prioritization" INTEGER NOT NULL,
  "userEmpathy" INTEGER NOT NULL,
  "communication" INTEGER NOT NULL,
  "feedback" TEXT NOT NULL,
  "sampleAnswer" TEXT NOT NULL,
  "totalScore" INTEGER NOT NULL,
  "status" VARCHAR(191) DEFAULT 'completed',
  "tokensUsed" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE
);
CREATE INDEX "Score_sessionId_idx" ON "Score"("sessionId");
CREATE INDEX "Score_status_idx" ON "Score"("status");

-- Payments table
CREATE TABLE "Payment" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "stripeSessionId" VARCHAR(191) NOT NULL UNIQUE,
  "stripeCustomerId" VARCHAR(191),
  "amount" INTEGER NOT NULL,
  "currency" VARCHAR(191) DEFAULT 'usd',
  "status" VARCHAR(191) NOT NULL,
  "subscriptionType" VARCHAR(191),
  "subscriptionEndDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_stripeSessionId_idx" ON "Payment"("stripeSessionId");

-- Events table
CREATE TABLE "Event" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER,
  "sessionId" INTEGER,
  "eventType" VARCHAR(191) NOT NULL,
  "metadata" TEXT,
  "tokensUsed" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL
);
CREATE INDEX "Event_userId_idx" ON "Event"("userId");
CREATE INDEX "Event_sessionId_idx" ON "Event"("sessionId");
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");
```

## 📦 Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free - no credit card required)
- OpenAI API key
- Stripe account (test mode)

### Step 1: Clone and Install

```bash
cd pm-interview-practice-backend
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres.xxxxx:your_password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
PORT=4000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_in_production
OPENAI_API_KEY=sk-proj-your-openai-key-here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
ADMIN_SECRET=admin_secret_key
```

**Get your DATABASE_URL from Supabase:**

1. Go to https://supabase.com (free signup)
2. Create new project
3. Go to Settings → Database → Connection string (URI)
4. Copy and paste into `.env`

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for detailed Supabase setup guide.

### Step 3: Setup Database

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### Step 4: Seed Database

Seed with 10 PM questions and demo user:

```bash
npm run seed
```

**Demo credentials:**

- Email: `demo@pmpractice.com`
- Password: `Demo123456!`
- Role: `admin`

### Step 5: Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:4000`

### Step 6: Verify Setup

```bash
curl http://localhost:4000/api/health
# Expected: {"status":"OK","timestamp":"2024-..."}
```

## 📡 API Endpoints

### Authentication

#### Register User

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: { user, token }
```

#### Login User

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: { user, token }
```

### Interview Flow

#### Start Interview

```
POST /api/start-interview
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "level": "mid"  // junior, mid, or senior
}

Response: { id, text, category, level }
```

#### Submit Answer

```
POST /api/submit-answer
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "questionId": 1,
  "answerText": "I would approach this problem using the CIRCLES framework..."
}

Response: { sessionId, message }
```

#### Score Answer

```
POST /api/score
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "sessionId": 1
}

Response: { score: { structure, metrics, prioritization, userEmpathy, communication, feedback, sampleAnswer, totalScore } }
```

#### Get All Sessions

```
GET /api/sessions
Authorization: Bearer <JWT_TOKEN>

Response: { sessions: [...] }
```

#### Get Session by ID

```
GET /api/sessions/:id
Authorization: Bearer <JWT_TOKEN>

Response: { session: {...} }
```

### Payments

#### Create Checkout Session

```
POST /api/create-checkout-session
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "subscriptionType": "basic"  // basic or premium
}

Response: { sessionId, url }
```

#### Stripe Webhook

```
POST /api/webhook/stripe
Stripe-Signature: <signature>

Handles: checkout.session.completed, customer.subscription.deleted
```

### Admin Routes

#### Get Flagged Sessions

```
GET /api/admin/flagged-sessions
Authorization: Bearer <JWT_TOKEN>  // Must be admin role

Response: { count, sessions: [...] }
```

#### Get Metrics

```
GET /api/admin/metrics?days=7
Authorization: Bearer <JWT_TOKEN>  // Must be admin role

Response: { period, metrics: { totalTokensUsed, totalSessions, scoredSessions, flaggedSessions, newUsers, revenue } }
```

### Health Check

```
GET /api/health

Response: { status: "OK", timestamp: "..." }
```

## 🧪 Sample cURL Commands

### Complete Flow Example

```bash
# 1. Register a new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Save the token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Start an interview
curl -X POST http://localhost:4000/api/start-interview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"level":"mid"}'

# Save questionId from response (e.g., 3)

# 3. Submit your answer
curl -X POST http://localhost:4000/api/submit-answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "questionId": 3,
    "answerText": "To design a product for remote team collaboration, I would use the CIRCLES framework. First, I would identify the Customer segment - remote teams of 5-50 people in tech companies. The problem Report is inefficient async communication and lack of visibility into team progress. The key Use Cases include daily standups, sprint planning, and ad-hoc discussions. I would Prioritize a centralized dashboard showing team availability and current work status, integrated chat, and async video updates. The Solutions would include real-time presence indicators, threaded conversations with rich media support, and automated status reports. My primary Metrics would be Daily Active Users, average response time, and tasks completed per sprint. I would Evaluate success through A/B testing different notification strategies and measuring time-to-resolution for blockers."
  }'

# Save sessionId from response (e.g., 1)

# 4. Get AI scoring
curl -X POST http://localhost:4000/api/score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sessionId": 1}'

# 5. View all your sessions
curl -X GET http://localhost:4000/api/sessions \
  -H "Authorization: Bearer $TOKEN"

# 6. View specific session with full details
curl -X GET http://localhost:4000/api/sessions/1 \
  -H "Authorization: Bearer $TOKEN"

# 7. Create payment checkout (optional)
curl -X POST http://localhost:4000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"subscriptionType":"basic"}'
```

### Admin Commands

```bash
# Login as admin (using demo account)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pmpractice.com","password":"Demo123456!"}'

ADMIN_TOKEN="..."

# Get flagged sessions
curl -X GET http://localhost:4000/api/admin/flagged-sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get metrics for last 30 days
curl -X GET "http://localhost:4000/api/admin/metrics?days=30" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Test Coverage

```bash
npm test -- --coverage
```

### Manual Testing with OpenAI

Set your OpenAI key in `.env`, then:

1. Start the server: `npm run dev`
2. Register/login to get a JWT token
3. Start an interview and get a question
4. Submit a detailed answer
5. Request scoring - the AI will evaluate and return structured feedback

**Note**: Each scoring request uses ~500-1000 tokens (roughly $0.01-0.02 with GPT-4 Turbo)

## 🔒 Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Authentication**: 7-day expiration with secret key
- **Input Validation**: Joi schemas for all endpoints
- **Rate Limiting**: Configurable limits per endpoint
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **Helmet**: Security headers
- **CORS**: Configurable origins
- **Error Sanitization**: No stack traces in production

## 📊 OpenAI Scoring Details

### Scoring Prompt

The system uses a carefully crafted prompt that enforces strict JSON output:

```javascript
{
  "structure": 0-10,      // Framework usage (CIRCLES, HEART, etc.)
  "metrics": 0-10,        // Quality of metrics defined
  "prioritization": 0-10, // Feature/problem prioritization
  "user_empathy": 0-10,   // Understanding of user needs
  "communication": 0-10,  // Clarity and articulation
  "feedback": "2-3 bullet points",
  "sample_answer": "concise sample demonstrating best practices"
}
```

### Features

- **Low Temperature (0.2)**: Consistent, deterministic scoring
- **JSON Mode**: GPT-4 Turbo's native JSON response format
- **Retry Logic**: Up to 2 retries on parsing failures
- **Validation**: Strict schema validation with range checks
- **Fallback**: Sessions flagged for manual review if all retries fail
- **Token Tracking**: Logs usage for cost monitoring

### Cost Estimation

- **Model**: GPT-4 Turbo (gpt-4-turbo-preview)
- **Average tokens per request**: ~800 total (300 input + 500 output)
- **Approximate cost**: $0.01-0.02 per scoring request
- **Rate limit**: 10 scoring requests per hour per user

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL="postgresql://postgres.xxxxx:pass@aws-0-region.pooler.supabase.com:5432/postgres"
JWT_SECRET="use-a-strong-random-secret-here"
OPENAI_API_KEY="sk-proj-your-production-key"
STRIPE_SECRET_KEY="sk_live_your-live-key"
STRIPE_WEBHOOK_SECRET="whsec_your-production-webhook-secret"
PORT=4000
FRONTEND_URL="https://yourdomain.com"
```

**Note:** You can use the same Supabase database for both dev and production (recommended for MVP).

### Database Migration

```bash
npm run migrate
```

### Production Build & Start

```bash
npm start
```

### Recommended Stack

- **Hosting**: Vercel, Railway, Render, or AWS EC2
- **Database**: Supabase (already configured!)
- **Monitoring**: PM2 for process management, DataDog/NewRelic for APM
- **Logging**: Winston + CloudWatch or Logtail

**Pro Tip:** Supabase works seamlessly in production - no changes needed!

### Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhook/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.deleted`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## 📝 Scripts Reference

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run migrate` - Run Prisma migrations (production)
- `npm run migrate:dev` - Run migrations with dev mode prompts
- `npm run seed` - Seed database with questions and demo user
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test Prisma connection
npx prisma db push

# Verify DATABASE_URL format
# postgresql://username:password@host:port/database

# View database in browser
npx prisma studio
```

### Prisma Issues

```bash
# Regenerate Prisma Client
npx prisma generate

# View database schema
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Supabase Connection Issues

See detailed troubleshooting in **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

### OpenAI Errors

- Verify `OPENAI_API_KEY` is set correctly
- Check API quota and billing at platform.openai.com
- Review logs for specific error messages
- Sessions failing validation are auto-flagged for review

### Stripe Webhook Testing

Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:4000/api/webhook/stripe
stripe trigger checkout.session.completed
```

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm test` and `npm run lint`
5. Submit a pull request

---

**Built with ❤️ for aspiring Product Managers**

For questions or support, open an issue on GitHub.
