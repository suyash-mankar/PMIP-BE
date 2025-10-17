# Environment Variables Guide

This document lists all required environment variables for the PM Interview Practice backend.

## Required Variables

### Database

```env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

PostgreSQL database connection string. Get this from your database provider (Supabase, Railway, etc.)

### JWT Authentication

```env
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
```

Secret key for signing JWT tokens. Use a long, random string in production.

### OpenAI API

```env
OPENAI_API_KEY=your_openai_api_key_here
```

API key from OpenAI for AI-powered interview feedback.

### Google OAuth (NEW)

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

OAuth credentials from Google Cloud Console. See `GOOGLE_OAUTH_SETUP.md` for setup instructions.

### Frontend URL

```env
FRONTEND_URL=http://localhost:5173
```

URL of your frontend application. Used for OAuth redirects.

- Local development: `http://localhost:5173`
- Production: Your production frontend URL (e.g., `https://pminterviewpractice.com`)

## Optional Variables

### Stripe Payment Processing

```env
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

Only required if you're enabling premium features with Stripe.

### Server Configuration

```env
PORT=4000
NODE_ENV=development
```

- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment mode (`development` or `production`)

## Setting Up Environment Variables

### Local Development

1. Create a `.env` file in the `PMIP-BE` directory
2. Copy all required variables listed above
3. Fill in your actual values
4. **Never commit this file to git** (it's in `.gitignore`)

### Production (Railway/Vercel/etc.)

Add environment variables through your hosting platform's dashboard:

**Railway:**

1. Go to your project
2. Click on "Variables" tab
3. Add each variable

**Vercel:**

1. Go to Project Settings
2. Navigate to "Environment Variables"
3. Add each variable

## Security Best Practices

- ✅ Use strong, random strings for `JWT_SECRET`
- ✅ Never commit `.env` files to version control
- ✅ Use different values for development and production
- ✅ Rotate secrets regularly
- ✅ Use your hosting platform's secret management
- ❌ Never share secrets in chat, email, or public forums
- ❌ Never hardcode secrets in your source code

## Validating Your Setup

After setting up environment variables, you can validate by:

1. Starting the backend server: `npm run dev`
2. Checking the console for connection messages
3. Testing the health endpoint: `http://localhost:4000/api/health`
4. Testing Google OAuth: `http://localhost:4000/api/auth/google` (should redirect to Google)

## Troubleshooting

**Database Connection Issues**

- Verify `DATABASE_URL` is correct
- Check if database server is accessible
- Ensure IP is whitelisted (for cloud databases)

**JWT Issues**

- Make sure `JWT_SECRET` is set
- Use the same secret across all backend instances

**Google OAuth Issues**

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check `FRONTEND_URL` matches your actual frontend URL
- See `GOOGLE_OAUTH_SETUP.md` for detailed troubleshooting
