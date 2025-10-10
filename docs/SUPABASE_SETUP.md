# 🚀 Supabase Setup Guide

This project uses **Supabase** (PostgreSQL) for the database - it's free, fast, and requires zero local setup!

## Why Supabase?

✅ **Free Forever** - 500MB database (plenty for MVP)  
✅ **No Local Setup** - No PostgreSQL installation needed  
✅ **Production Ready** - Use same DB for dev and production  
✅ **Auto Backups** - Built-in  
✅ **No Credit Card** - Required for free tier  
✅ **Better Performance** - PostgreSQL > MySQL  
✅ **Bonus Features** - Auth, Storage, Real-time included

---

## 📋 Quick Setup (5 Minutes)

### Step 1: Create Supabase Account

1. Go to **https://supabase.com**
2. Click **"Start your project"** (free, no credit card)
3. Sign up with GitHub or email
4. Verify your email

### Step 2: Create New Project

1. Click **"New Project"**
2. Fill in:
   - **Name:** `pm-interview-practice` (or any name)
   - **Database Password:** Choose a strong password (save this!)
   - **Region:** Choose closest to you (e.g., US East)
   - **Pricing Plan:** Free
3. Click **"Create new project"**
4. Wait ~2 minutes for provisioning ☕

### Step 3: Get Your DATABASE_URL

Once project is ready:

1. Click **Settings** (gear icon in sidebar)
2. Click **Database** (under Configuration)
3. Scroll to **Connection string** section
4. Select **URI** tab
5. Copy the connection string

It looks like:

```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Important:** For migrations to work, add `?sslmode=require` at the end:

```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### Step 4: Update Your .env File

Replace the `[YOUR-PASSWORD]` placeholder with your actual database password:

```env
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxxx:your_actual_password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

**Example:**

```env
DATABASE_URL="postgresql://postgres.abcdefghijklmno:MySecurePass123@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

### Step 5: Run Migrations

```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# Seed database with sample data
npm run seed
```

### Step 6: Start Your App

```bash
npm run dev
```

**That's it!** Your app is now running with Supabase! 🎉

---

## 🔍 Verifying Your Setup

### Check Database Connection

```bash
# Test Prisma connection
npx prisma db push
```

If successful, you'll see:

```
✔ Generated Prisma Client
The database is already in sync with the Prisma schema.
```

### View Your Data (Prisma Studio)

```bash
npx prisma studio
```

Opens at `http://localhost:5555` - you can browse/edit data visually!

### View in Supabase Dashboard

1. Go to your Supabase project
2. Click **Table Editor** in sidebar
3. You'll see all your tables: User, Question, Session, Score, Payment, Event

---

## 📊 Supabase Dashboard Features

### Table Editor

- Visual table browser
- Add/edit/delete rows
- Run SQL queries

### SQL Editor

Run custom queries:

```sql
SELECT * FROM "User" WHERE role = 'admin';
SELECT * FROM "Question" WHERE level = 'senior';
```

### Database Settings

- View connection pooling
- Enable point-in-time recovery (backups)
- Monitor database size

### API Auto-Generated

Supabase auto-generates REST and GraphQL APIs (though we're using Prisma)

---

## 🆓 Free Tier Limits

| Resource          | Free Tier  | Your MVP Needs        | Status    |
| ----------------- | ---------- | --------------------- | --------- |
| **Database Size** | 500 MB     | ~10 MB (10k sessions) | ✅ Plenty |
| **Bandwidth**     | 2 GB/month | ~1 GB typical         | ✅ Good   |
| **API Requests**  | Unlimited  | N/A (using Prisma)    | ✅ N/A    |
| **Storage**       | 1 GB       | Optional              | ✅ Plenty |

**Bottom line:** Free tier is more than enough for 10,000+ users!

---

## 🔐 Security Best Practices

### 1. Enable Row Level Security (RLS) - Optional

Supabase has RLS built-in if you want extra security:

```sql
-- Enable RLS on tables (optional - Prisma already handles this)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
```

But since we're using Prisma with JWT auth, this is optional.

### 2. Use Connection Pooling

Your connection string already uses Supabase's connection pooler:

- `pooler.supabase.com` - Built-in connection pooling
- Handles high concurrent connections
- No additional setup needed ✅

### 3. Never Commit DATABASE_URL

Already in `.gitignore` ✅

---

## 🚀 Production Deployment

### Same Database for Dev and Prod (Recommended)

Use the **same Supabase database** for both:

- Simple: One database to manage
- Cost-effective: Still free tier
- Easy: No migration between environments

### Separate Databases (Advanced)

If you want separate dev/prod:

1. Create second Supabase project for production
2. Update production `.env` with new DATABASE_URL
3. Run migrations: `npx prisma migrate deploy`

---

## 💰 Upgrading to Pro (When You Grow)

When you outgrow free tier:

**Supabase Pro - $25/month**

- 8 GB database (16x larger)
- 50 GB bandwidth
- Daily backups
- Better support
- Point-in-time recovery

**To upgrade:**

1. Go to Settings → Billing
2. Select Pro plan
3. No code changes needed!

---

## 🔄 Migrating from Local PostgreSQL

If you started with local PostgreSQL:

### Export Data

```bash
# Export from local
pg_dump your_local_db > backup.sql
```

### Import to Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Paste and run your SQL
3. Or use: `psql "your_supabase_url" < backup.sql`

---

## 🛠️ Troubleshooting

### Error: "Can't reach database server"

**Solution:**

- Check your DATABASE_URL is correct
- Verify you replaced `[YOUR-PASSWORD]` with actual password
- Ensure no extra spaces in connection string
- **Add `?sslmode=require` at the end** of your DATABASE_URL (required for Supabase)

### Error: "Password authentication failed"

**Solution:**

- Go to Supabase → Settings → Database
- Click "Reset Database Password"
- Update DATABASE_URL in `.env`

### Error: "too many connections"

**Solution:**

- You're using connection pooling URL (correct!)
- If still seeing this, upgrade to Pro plan or optimize queries

### Connection is slow

**Solution:**

- Choose a Supabase region closer to you
- Free tier has some latency - acceptable for MVP
- Pro tier has better performance

---

## 📚 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **Prisma + Supabase:** https://supabase.com/docs/guides/integrations/prisma
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## ✅ Setup Checklist

- [ ] Created Supabase account
- [ ] Created new project
- [ ] Copied DATABASE_URL
- [ ] Updated `.env` file with connection string
- [ ] Replaced `[YOUR-PASSWORD]` with actual password
- [ ] Ran `npx prisma generate`
- [ ] Ran `npx prisma migrate dev --name init`
- [ ] Ran `npm run seed`
- [ ] Started server with `npm run dev`
- [ ] Tested health endpoint: `curl http://localhost:4000/api/health`
- [ ] Logged in as demo user: `demo@pmpractice.com`

---

## 🎉 You're All Set!

Your PM Interview Practice backend is now powered by Supabase!

**Benefits:**
✅ No local database setup  
✅ Production-ready from day one  
✅ Free forever (for reasonable usage)  
✅ Automatic backups  
✅ Beautiful dashboard

**Next Steps:**

1. Read [README.md](./README.md) for API documentation
2. Test endpoints with [GETTING_STARTED.md](./GETTING_STARTED.md)
3. Start building your frontend!

---

**Need help?** Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for troubleshooting!

Built with ❤️ for Product Managers
