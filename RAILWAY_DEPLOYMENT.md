# Railway Deployment Guide

## ✅ What Was Fixed

The Prisma OpenSSL error has been resolved by:

1. ✅ Switched from Alpine to Debian-based Node image (`node:18-slim`)
2. ✅ Explicitly installed OpenSSL and CA certificates
3. ✅ Updated Prisma schema with correct binary targets
4. ✅ Added multi-stage Docker build for optimization
5. ✅ Added non-root user for security
6. ✅ Updated server to bind to `0.0.0.0` for Railway
7. ✅ Added proper error handling for uncaught exceptions

## 🚀 Deployment Steps

### 1. Push Changes to Git

```bash
cd PMIP-BE
git add Dockerfile prisma/schema.prisma src/index.js .dockerignore railway.json
git commit -m "Fix Railway deployment: Update Dockerfile for Prisma OpenSSL compatibility"
git push origin main
```

### 2. Railway Environment Variables

Make sure these are set in Railway dashboard:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=your-supabase-or-railway-postgres-url
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_SECRET=your-admin-secret
FRONTEND_URL=https://pminterviewpractice.com
```

### 3. Database URL Format

For **Supabase** (with connection pooling):

```
postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

For **Railway PostgreSQL**:

```
postgresql://postgres:[password]@[host]:[port]/railway
```

### 4. Railway Auto-Deploy

Once you push to GitHub:

- Railway will automatically detect the changes
- Build using your new Dockerfile
- Deploy the container
- Run health checks

### 5. Verify Deployment

Check Railway logs for:

```
🚀 PM Interview Practice API running on port 4000
📊 Environment: production
🔗 Health check available at: http://0.0.0.0:4000/api/health
```

### 6. Test Your API

```bash
# Health check
curl https://your-app.railway.app/api/health

# Should return:
# {"status":"OK","timestamp":"..."}
```

## 🔧 Troubleshooting

### If migrations fail:

1. **Check Railway logs** for migration errors
2. **Run migrations manually** in Railway shell:
   ```bash
   npx prisma migrate deploy
   ```

### If database connection fails:

1. **Verify DATABASE_URL** is correct
2. **Check if database allows connections** from Railway IPs
3. **Test connection** in Railway shell:
   ```bash
   npx prisma db pull
   ```

### If port binding fails:

- Railway automatically sets the PORT environment variable
- Your app should use `process.env.PORT` (already configured)

## 📊 Expected Build Time

- First build: ~2-3 minutes
- Subsequent builds: ~1-2 minutes (Docker layer caching)

## 🎯 Performance Optimizations

Your new Dockerfile includes:

- ✅ Multi-stage build (smaller image size)
- ✅ Layer caching optimization
- ✅ Production-only dependencies
- ✅ Non-root user (security)
- ✅ Health check configuration

## 🔗 Next Steps

1. **Deploy backend to Railway** (will work now with fixed Dockerfile)
2. **Deploy frontend to Vercel**
3. **Configure DNS on Hostinger** to point to Vercel and Railway
4. **Update CORS** in backend to allow your domain
5. **Test end-to-end** with your custom domain

## 💡 Custom Domain Setup

To use `api.pminterviewpractice.com`:

1. **In Railway:**

   - Go to Settings → Networking
   - Click "Custom Domain"
   - Add: `api.pminterviewpractice.com`

2. **In Hostinger DNS:**

   - Add CNAME record:
     ```
     Type: CNAME
     Name: api
     Value: your-app.railway.app
     TTL: 14400
     ```

3. **Wait for DNS propagation** (5-60 minutes)

## ✅ Checklist

- [ ] Push updated Dockerfile to GitHub
- [ ] Verify Railway auto-deploys successfully
- [ ] Check health endpoint returns 200 OK
- [ ] Test API endpoints work correctly
- [ ] Configure custom domain (optional)
- [ ] Update frontend VITE_API_URL to point to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure Hostinger DNS
- [ ] Test full application end-to-end

---

**Need help?** Check Railway logs or contact support with these files.
