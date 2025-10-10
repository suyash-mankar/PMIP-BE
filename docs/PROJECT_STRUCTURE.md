# Project Structure

Complete overview of the PM Interview Practice Backend codebase.

```
pm-interview-practice-backend/
│
├── 📄 Configuration Files
│   ├── package.json              # Dependencies and scripts
│   ├── .gitignore                # Git ignore rules
│   ├── .nvmrc                    # Node version (18.19.0)
│   ├── .prettierrc               # Code formatting config
│   ├── .eslintrc.js              # Linting rules
│   ├── nodemon.json              # Dev server config
│   ├── jest.config.js            # Test configuration
│   ├── Dockerfile                # Docker container config
│   ├── docker-compose.yml        # Docker services (API + MySQL)
│   └── .dockerignore             # Docker ignore rules
│
├── 📚 Documentation
│   ├── README.md                 # Main documentation (start here!)
│   ├── SETUP_GUIDE.md            # Quick setup instructions
│   ├── API_DOCS.md               # Complete API reference
│   ├── CONTRIBUTING.md           # Contribution guidelines
│   ├── PROJECT_STRUCTURE.md      # This file
│   └── LICENSE                   # MIT License
│
├── 🗄️ prisma/
│   ├── schema.prisma             # Database schema (MySQL)
│   └── migrations/
│       └── init.sql              # Initial migration SQL
│
├── 🔧 scripts/
│   └── seed.js                   # Database seeding (10 questions + demo user)
│
├── 🧪 tests/
│   ├── auth.test.js              # Authentication flow tests
│   └── scoring.test.js           # OpenAI scoring tests
│
└── 💻 src/
    │
    ├── index.js                  # 🚀 Main Express app entry point
    │
    ├── ⚙️ config/
    │   ├── database.js           # Prisma client setup
    │   ├── openai.js             # OpenAI client setup
    │   └── stripe.js             # Stripe client setup
    │
    ├── 🎮 controllers/           # Request handlers (thin layer)
    │   ├── authController.js     # Register, login
    │   ├── interviewController.js # Start, submit, score, sessions
    │   ├── paymentController.js  # Checkout, webhooks
    │   └── adminController.js    # Flagged sessions, metrics
    │
    ├── 🛡️ middlewares/
    │   ├── auth.js               # JWT verification, admin check
    │   ├── errorHandler.js       # Global error handling
    │   └── rateLimiter.js        # Rate limiting (general, auth, scoring)
    │
    ├── 🛣️ routes/
    │   ├── auth.js               # /api/auth/* routes
    │   ├── interview.js          # /api/start-interview, /api/submit-answer, etc.
    │   ├── payment.js            # /api/create-checkout-session, /api/webhook/*
    │   └── admin.js              # /api/admin/* routes
    │
    ├── 🧠 services/              # Business logic
    │   ├── openaiService.js      # OpenAI API calls, prompt template, validation
    │   └── scoreService.js       # Scoring orchestration with retry logic
    │
    └── 🛠️ utils/
        └── validation.js         # Joi validation schemas
```

---

## Key Files Explained

### 🚀 Entry Point

**`src/index.js`**

- Express app initialization
- Middleware setup (helmet, cors, morgan, rate limiting)
- Route mounting
- Error handling
- Server startup

### 🗄️ Database Layer

**`prisma/schema.prisma`**

- Database schema definition
- 6 models: User, Question, Session, Score, Payment, Event
- Relationships and indexes
- MySQL-specific configurations

**`src/config/database.js`**

- Prisma client singleton
- Graceful shutdown handling

### 🔐 Authentication

**`src/controllers/authController.js`**

- `register`: Hash password (bcrypt), create user, return JWT
- `login`: Verify credentials, return JWT

**`src/middlewares/auth.js`**

- `authMiddleware`: Verify JWT token, attach user to request
- `adminMiddleware`: Check for admin role

### 🎯 Core Interview Logic

**`src/controllers/interviewController.js`**

- `startInterview`: Random question selection by level
- `submitAnswer`: Create/update session
- `score`: Orchestrate AI scoring
- `getSessions`: List user sessions
- `getSessionById`: Get detailed session

**`src/services/scoreService.js`**

- Main scoring orchestration
- Retry logic (up to 2 retries)
- Session flagging for failed scoring
- Token usage tracking

**`src/services/openaiService.js`**

- OpenAI API integration
- Scoring prompt template (explicit and detailed)
- JSON parsing and validation
- Schema enforcement (0-10 scores, feedback, sample answer)

### 💳 Payment Integration

**`src/controllers/paymentController.js`**

- `createCheckoutSession`: Create Stripe checkout
- `handleWebhook`: Process webhook events (checkout.session.completed, etc.)

**`src/config/stripe.js`**

- Stripe client initialization

### 📊 Admin Features

**`src/controllers/adminController.js`**

- `getFlaggedSessions`: List sessions needing review
- `getMetrics`: Token usage, revenue, session stats

### 🛡️ Security & Validation

**`src/middlewares/rateLimiter.js`**

- General API: 100 requests / 15 minutes
- Auth: 5 requests / 15 minutes
- Scoring: 10 requests / hour

**`src/utils/validation.js`**

- Joi schemas for all endpoints
- Email validation
- Password requirements (min 8 chars)
- Level validation (junior/mid/senior)

**`src/middlewares/errorHandler.js`**

- Prisma error handling
- Validation error formatting
- JWT error handling
- Production-safe error responses

### 🧪 Testing

**`tests/auth.test.js`**

- Registration flow (success, duplicate email, validation)
- Login flow (success, invalid credentials)
- JWT token verification

**`tests/scoring.test.js`**

- JSON parsing and validation
- Schema enforcement
- Edge cases (0 and 10 scores)
- Markdown stripping
- Error handling

**`jest.config.js`**

- Test environment: Node.js
- Coverage collection
- Test file patterns

### 📦 Database Seeding

**`scripts/seed.js`**

- Creates demo user: `demo@pmpractice.com` (admin)
- Inserts 10 PM questions across categories:
  - Product Design (5 questions)
  - Strategy (2 questions)
  - Execution (1 question)
  - Behavioral (1 question)
  - Various levels (junior, mid, senior)

---

## Data Flow

### 1️⃣ Authentication Flow

```
Client → POST /api/auth/register
  ↓
authController.register
  ↓
Validate input (Joi)
  ↓
Check if user exists (Prisma)
  ↓
Hash password (bcrypt)
  ↓
Create user (Prisma)
  ↓
Generate JWT token
  ↓
Return { user, token }
```

### 2️⃣ Interview Flow

```
Client → POST /api/start-interview
  ↓
authMiddleware (verify JWT)
  ↓
interviewController.startInterview
  ↓
Get random question from DB (Prisma)
  ↓
Log event
  ↓
Return question
```

```
Client → POST /api/submit-answer
  ↓
authMiddleware
  ↓
Validate input (Joi)
  ↓
interviewController.submitAnswer
  ↓
Create session (Prisma)
  ↓
Log event
  ↓
Return sessionId
```

### 3️⃣ Scoring Flow

```
Client → POST /api/score
  ↓
authMiddleware + scoringLimiter
  ↓
Validate input (Joi)
  ↓
interviewController.score
  ↓
scoreService.scoreSession
  ↓
Retry loop (up to 3 attempts):
  │
  ├─→ openaiService.callOpenAIForScoring
  │     ↓
  │   Call GPT-4 Turbo with prompt
  │     ↓
  │   Get JSON response
  │     ↓
  │   openaiService.parseAndValidateScore
  │     ↓
  │   Validate schema and ranges
  │     ↓
  │   [SUCCESS] → Save score to DB (Prisma)
  │     ↓
  │   Update session status to "scored"
  │     ↓
  │   Log event
  │     ↓
  │   Return score
  │
  └─→ [FAILURE] → Exponential backoff → Retry
        ↓
      [All attempts failed]
        ↓
      Flag session as "needs_review"
        ↓
      Create placeholder score
        ↓
      Return error
```

### 4️⃣ Payment Flow

```
Client → POST /api/create-checkout-session
  ↓
authMiddleware
  ↓
paymentController.createCheckoutSession
  ↓
Create Stripe session
  ↓
Create pending payment record (Prisma)
  ↓
Return { sessionId, url }
  ↓
Client redirects user to Stripe
  ↓
[User completes payment on Stripe]
  ↓
Stripe → POST /api/webhook/stripe
  ↓
Verify webhook signature
  ↓
paymentController.handleWebhook
  ↓
Update payment status to "completed" (Prisma)
  ↓
Log event
```

---

## Technology Stack

| Layer              | Technology                | Purpose                        |
| ------------------ | ------------------------- | ------------------------------ |
| **Runtime**        | Node.js 18+               | JavaScript runtime             |
| **Framework**      | Express.js                | Web framework                  |
| **Database**       | PostgreSQL (Supabase)     | Relational database            |
| **ORM**            | Prisma                    | Type-safe database client      |
| **Authentication** | JWT + bcrypt              | Secure auth & password hashing |
| **AI**             | OpenAI GPT-4 Turbo        | Answer scoring                 |
| **Payments**       | Stripe                    | Subscription management        |
| **Validation**     | Joi                       | Input validation               |
| **Testing**        | Jest + Supertest          | Unit & integration tests       |
| **Security**       | Helmet                    | Security headers               |
| **Rate Limiting**  | express-rate-limit        | API throttling                 |
| **Logging**        | Morgan                    | HTTP request logging           |
| **Dev Tools**      | Nodemon, ESLint, Prettier | Development experience         |
| **Deployment**     | Docker                    | Containerization               |

---

## Environment Variables

| Variable                  | Description             | Example                                  |
| ------------------------- | ----------------------- | ---------------------------------------- |
| `DATABASE_URL`            | MySQL connection string | `mysql://user:pass@localhost:3306/pmpdb` |
| `PORT`                    | Server port             | `4000`                                   |
| `NODE_ENV`                | Environment             | `development` or `production`            |
| `JWT_SECRET`              | JWT signing key         | `your_secret_key`                        |
| `OPENAI_API_KEY`          | OpenAI API key          | `sk-proj-...`                            |
| `STRIPE_SECRET_KEY`       | Stripe secret key       | `sk_test_...`                            |
| `STRIPE_WEBHOOK_SECRET`   | Stripe webhook secret   | `whsec_...`                              |
| `ADMIN_SECRET`            | Admin operations secret | `admin123`                               |
| `FRONTEND_URL`            | Frontend URL            | `http://localhost:3000`                  |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window       | `900000` (15 min)                        |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100`                                    |

---

## NPM Scripts

| Script        | Command                 | Description                       |
| ------------- | ----------------------- | --------------------------------- |
| `dev`         | `nodemon src/index.js`  | Start dev server with auto-reload |
| `start`       | `node src/index.js`     | Start production server           |
| `migrate`     | `prisma migrate deploy` | Run migrations (production)       |
| `migrate:dev` | `prisma migrate dev`    | Run migrations (development)      |
| `seed`        | `node scripts/seed.js`  | Seed database                     |
| `lint`        | `eslint src/**/*.js`    | Run linter                        |
| `test`        | `jest --coverage`       | Run tests with coverage           |
| `test:watch`  | `jest --watch`          | Run tests in watch mode           |

---

## API Endpoints Summary

### Authentication

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Interview

- `POST /api/start-interview` - Get question
- `POST /api/submit-answer` - Submit answer
- `POST /api/score` - Get AI scoring
- `GET /api/sessions` - List sessions
- `GET /api/sessions/:id` - Get session details

### Payments

- `POST /api/create-checkout-session` - Create Stripe checkout
- `POST /api/webhook/stripe` - Stripe webhook handler

### Admin

- `GET /api/admin/flagged-sessions` - List flagged sessions
- `GET /api/admin/metrics` - View metrics

### System

- `GET /api/health` - Health check

---

## Database Schema Summary

### User

- Primary authentication entity
- Stores email, hashed password, role
- Relations: sessions, payments, events

### Question

- PM interview questions
- Categories: product_design, strategy, execution, behavioral
- Levels: junior, mid, senior
- Relations: sessions

### Session

- User's answer submission
- Links user to question
- Stores answer text, status
- Relations: user, question, scores, events

### Score

- AI-generated scorecard
- 5 dimensions (0-10 each)
- Feedback and sample answer
- Relations: session

### Payment

- Stripe payment records
- Subscription tracking
- Relations: user

### Event

- Audit log / telemetry
- Tracks API calls, OpenAI usage, errors
- Relations: user (optional), session (optional)

---

## Security Features

✅ Password hashing (bcrypt, 10 rounds)  
✅ JWT authentication (7-day expiration)  
✅ Input validation (Joi schemas)  
✅ Rate limiting (configurable per endpoint)  
✅ SQL injection protection (Prisma ORM)  
✅ Security headers (Helmet)  
✅ CORS configuration  
✅ Error sanitization (no stack traces in production)  
✅ Webhook signature verification (Stripe)

---

## Next Steps

1. **Read** [SETUP_GUIDE.md](./SETUP_GUIDE.md) for quick setup
2. **Explore** [API_DOCS.md](./API_DOCS.md) for endpoint details
3. **Review** [README.md](./README.md) for comprehensive overview
4. **Contribute** using [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Built with ❤️ for Product Managers**
