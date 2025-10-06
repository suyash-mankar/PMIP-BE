# Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] MySQL 8.0+ installed and running (`mysql --version`)
- [ ] OpenAI API key (get from https://platform.openai.com/api-keys)
- [ ] Stripe test account (get from https://dashboard.stripe.com/test/apikeys)

## 5-Minute Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE pmpdb;
EXIT;
```

### 3. Configure Environment

Create `.env` file (copy from the example below):

```env
DATABASE_URL="mysql://root:your_password@localhost:3306/pmpdb"
PORT=4000
NODE_ENV=development
JWT_SECRET=my_super_secret_jwt_key_12345
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
ADMIN_SECRET=admin123
FRONTEND_URL=http://localhost:3000
```

**Replace:**

- `your_password` with your MySQL root password
- `YOUR_KEY_HERE` with your actual API keys

### 4. Run Migrations

```bash
npx prisma migrate dev --name init
```

### 5. Seed Database

```bash
npm run seed
```

This creates:

- 10 PM interview questions (junior, mid, senior levels)
- 1 demo user (email: `demo@pmpractice.com`, password: `Demo123456!`)

### 6. Start Server

```bash
npm run dev
```

Server runs on `http://localhost:4000`

### 7. Test It Works

```bash
# Health check
curl http://localhost:4000/api/health

# Login as demo user
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pmpractice.com","password":"Demo123456!"}'
```

You should get a JWT token back!

## Common Issues & Fixes

### Issue: "Error: P1001: Can't reach database server"

**Fix:** Make sure MySQL is running

```bash
# macOS (Homebrew)
brew services start mysql

# Linux
sudo systemctl start mysql

# Windows
net start MySQL80
```

### Issue: "Access denied for user"

**Fix:** Check your `DATABASE_URL` credentials in `.env`

```bash
# Test MySQL connection
mysql -u root -p -e "SELECT 1;"
```

### Issue: Prisma errors

**Fix:** Regenerate Prisma client

```bash
npx prisma generate
```

### Issue: Port already in use

**Fix:** Change `PORT` in `.env` or kill the process

```bash
# Find process on port 4000
lsof -i :4000

# Kill it
kill -9 <PID>
```

## Next Steps

1. ✅ Server is running
2. 📖 Read [README.md](./README.md) for full API documentation
3. 🧪 Try the [sample cURL commands](./README.md#sample-curl-commands)
4. 🧪 Run tests: `npm test`
5. 🚀 Start building your frontend!

## API Endpoints Quick Reference

| Method | Endpoint                       | Auth Required | Description           |
| ------ | ------------------------------ | ------------- | --------------------- |
| POST   | `/api/auth/register`           | No            | Register new user     |
| POST   | `/api/auth/login`              | No            | Login user            |
| POST   | `/api/start-interview`         | Yes           | Get random question   |
| POST   | `/api/submit-answer`           | Yes           | Submit answer         |
| POST   | `/api/score`                   | Yes           | Get AI scoring        |
| GET    | `/api/sessions`                | Yes           | List all sessions     |
| GET    | `/api/sessions/:id`            | Yes           | Get session details   |
| POST   | `/api/create-checkout-session` | Yes           | Create Stripe payment |
| GET    | `/api/admin/metrics`           | Yes (Admin)   | View metrics          |
| GET    | `/api/health`                  | No            | Health check          |

## Environment Variables Explained

- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
- `OPENAI_API_KEY` - OpenAI API key for scoring (starts with `sk-`)
- `STRIPE_SECRET_KEY` - Stripe secret key (test: `sk_test_...`, live: `sk_live_...`)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe dashboard
- `ADMIN_SECRET` - Simple secret for admin operations (enhance in production)
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - `development` or `production`
- `FRONTEND_URL` - Frontend URL for Stripe redirects

## Testing OpenAI Scoring

Make sure your `OPENAI_API_KEY` is set, then:

1. Get a JWT token (login or register)
2. Start an interview to get a question
3. Submit a detailed answer (100+ words recommended)
4. Request scoring

**Example:**

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pmpractice.com","password":"Demo123456!"}' \
  | jq -r '.token')

# 2. Start interview
QUESTION=$(curl -s -X POST http://localhost:4000/api/start-interview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"level":"mid"}')

echo $QUESTION

# 3. Submit answer (replace questionId with actual ID)
SESSION=$(curl -s -X POST http://localhost:4000/api/submit-answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "questionId": 3,
    "answerText": "Using the CIRCLES framework, I would start by identifying the Customer segment..."
  }')

echo $SESSION

# 4. Score (replace sessionId with actual ID)
curl -X POST http://localhost:4000/api/score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sessionId": 1}' \
  | jq
```

**Note:** Each scoring request uses ~$0.01-0.02 in OpenAI credits.

## Project Structure

```
pm-interview-practice-backend/
├── src/
│   ├── config/          # Database, OpenAI, Stripe config
│   ├── controllers/     # Route handlers
│   ├── middlewares/     # Auth, error handling, rate limiting
│   ├── routes/          # API routes
│   ├── services/        # Business logic (scoring, etc.)
│   ├── utils/           # Validation schemas
│   └── index.js         # Express app entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # SQL migrations
├── scripts/
│   └── seed.js          # Database seeding
├── tests/
│   ├── auth.test.js     # Auth tests
│   └── scoring.test.js  # Scoring tests
├── .env                 # Environment variables (create this)
├── .env.example         # Environment template
├── package.json         # Dependencies and scripts
├── README.md            # Full documentation
└── SETUP_GUIDE.md       # This file
```

## Need Help?

- 📖 Full docs: [README.md](./README.md)
- 🐛 Issues: Check "Troubleshooting" section in README
- 💬 Questions: Open a GitHub issue

**Happy coding! 🚀**
