# 🚀 Getting Started with PM Interview Practice Backend

Welcome! This guide will get you up and running in **5 minutes**.

## ✅ What You Need

- **Node.js 18+** ([download](https://nodejs.org/))
- **Supabase Account** (free - [sign up](https://supabase.com))
- **OpenAI API Key** ([get key](https://platform.openai.com/api-keys))
- **Stripe Test Account** ([sign up](https://dashboard.stripe.com/register))

## 🎯 Quick Start (Automated)

Run the automated setup script:

```bash
chmod +x quickstart.sh
./quickstart.sh
```

This will:

1. ✅ Check prerequisites
2. ✅ Install dependencies
3. ✅ Create .env file
4. ✅ Run database migrations
5. ✅ Seed with sample data

## 📝 Manual Setup (5 Steps)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Setup Supabase

1. Go to **https://supabase.com** and create a free account
2. Create a new project (takes ~2 minutes)
3. Go to **Settings → Database**
4. Copy the **Connection String (URI)**

### Step 3: Create `.env` File

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres.xxxxx:your_password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
PORT=4000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
OPENAI_API_KEY=sk-proj-your-openai-key
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
ADMIN_SECRET=admin_secret
FRONTEND_URL=http://localhost:3000
```

**Paste your Supabase DATABASE_URL!**

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for detailed guide.

### Step 4: Run Migrations & Seed

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database with 10 questions + demo user
npm run seed
```

### Step 5: Start Server

```bash
npm run dev
```

Server runs on `http://localhost:4000` 🎉

## 🧪 Test It Works

### 1. Health Check

```bash
curl http://localhost:4000/api/health
```

Expected: `{"status":"OK","timestamp":"..."}`

### 2. Login as Demo User

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pmpractice.com","password":"Demo123456!"}'
```

You should get back a JWT token!

### 3. Try the Full Flow

```bash
# 1. Login and save token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pmpractice.com","password":"Demo123456!"}' \
  | jq -r '.token')

# 2. Get a question
curl -X POST http://localhost:4000/api/start-interview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"level":"mid"}' | jq

# 3. Submit an answer (replace questionId with actual ID from step 2)
curl -X POST http://localhost:4000/api/submit-answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "questionId": 1,
    "answerText": "Using the CIRCLES framework, I would first identify the Customer segment as remote-first teams of 10-50 people in tech companies..."
  }' | jq

# 4. Score the answer (replace sessionId with actual ID from step 3)
curl -X POST http://localhost:4000/api/score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sessionId": 1}' | jq
```

## 📚 Available Commands

| Command             | Description                               |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start development server with auto-reload |
| `npm start`         | Start production server                   |
| `npm test`          | Run all tests                             |
| `npm run seed`      | Seed database with sample data            |
| `npm run lint`      | Check code quality                        |
| `npx prisma studio` | Open Prisma Studio (database GUI)         |

## 📖 Documentation

- **[README.md](./README.md)** - Complete documentation
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions
- **[API_DOCS.md](./API_DOCS.md)** - API reference with examples
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Codebase overview
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines

## 🐛 Common Issues

### "Can't reach database server"

**Solution:** Make sure MySQL is running

```bash
# macOS (Homebrew)
brew services start mysql

# Linux
sudo systemctl start mysql
```

### "Access denied for user"

**Solution:** Check your `DATABASE_URL` in `.env`

### "Module not found"

**Solution:** Reinstall dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### OpenAI API Errors

**Solution:**

1. Verify your `OPENAI_API_KEY` is correct
2. Check you have credits at https://platform.openai.com/account/billing
3. Review logs for specific error messages

## 🎓 Demo Credentials

A demo admin user is created when you seed:

- **Email:** `demo@pmpractice.com`
- **Password:** `Demo123456!`
- **Role:** `admin` (can access admin endpoints)

## 🔑 API Keys Setup

### OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-...`)
4. Add to `.env`: `OPENAI_API_KEY=sk-proj-...`

**Note:** Scoring costs ~$0.01-0.02 per request with GPT-4 Turbo

### Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy "Secret key" (starts with `sk_test_...`)
3. Add to `.env`: `STRIPE_SECRET_KEY=sk_test_...`

For webhooks:

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `http://localhost:4000/api/webhook/stripe`
4. Events: `checkout.session.completed`, `customer.subscription.deleted`
5. Copy signing secret (starts with `whsec_...`)
6. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

## 🐳 Docker Setup (Alternative)

**Note:** With Supabase, you don't need Docker for the database! But if you want to run a local PostgreSQL:

```bash
# Start both API and PostgreSQL
docker-compose up

# In another terminal, seed the database
docker exec -it pmip_api npm run seed
```

Services:

- API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

**Recommended:** Just use Supabase directly - it's simpler!

## 📊 Database GUI

### Option 1: Prisma Studio (Local)

```bash
npx prisma studio
```

Opens at `http://localhost:5555`

### Option 2: Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Click **Table Editor** in sidebar
3. Browse/edit all tables visually
4. Run SQL queries in **SQL Editor**

## 🧪 Running Tests

```bash
# All tests
npm test

# With coverage report
npm test -- --coverage

# Watch mode (re-run on changes)
npm run test:watch

# Specific test file
npm test -- tests/auth.test.js
```

## 🌐 API Endpoints Quick Reference

### Public Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Protected Endpoints (require JWT)

- `POST /api/start-interview` - Get question
- `POST /api/submit-answer` - Submit answer
- `POST /api/score` - Get AI scoring
- `GET /api/sessions` - List sessions
- `GET /api/sessions/:id` - Session details
- `POST /api/create-checkout-session` - Stripe checkout

### Admin Endpoints (require admin role)

- `GET /api/admin/flagged-sessions` - Sessions needing review
- `GET /api/admin/metrics` - Usage metrics

## 🎯 Next Steps

1. ✅ **Server is running** at http://localhost:4000
2. 📖 **Read** [README.md](./README.md) for full documentation
3. 🔍 **Explore** [API_DOCS.md](./API_DOCS.md) for detailed API reference
4. 🧪 **Test** endpoints using cURL or Postman
5. 🚀 **Build** your frontend and integrate!

## 💡 Pro Tips

- **Use Postman**: Import the API collection for easier testing
- **Check logs**: `npm run dev` shows detailed request/response logs
- **Database GUI**: Use `npx prisma studio` to inspect data
- **Admin access**: Login as `demo@pmpractice.com` for admin features
- **Rate limits**: Test with different IP addresses if hitting limits

## 🆘 Need Help?

- 📖 Full docs: [README.md](./README.md)
- 🔍 Search issues: Check "Troubleshooting" in README
- 🐛 Found a bug?: Open a GitHub issue
- 💬 Questions?: See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Happy coding! 🎉**

Built with ❤️ for aspiring Product Managers
