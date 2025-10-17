# Google OAuth Setup Guide

This guide will help you set up Google OAuth for the PM Interview Practice application.

## Prerequisites

- Google Cloud Console account
- Access to backend `.env` file

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name (e.g., "PM Interview Practice")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (unless you have a Google Workspace)
3. Click "Create"
4. Fill in the required information:
   - **App name**: PM Interview Practice
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
8. Click "Save and Continue"
9. Add test users (your email addresses for testing)
10. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Configure the following:

### Application Name

- Name: PM Interview Practice Web App

### Authorized JavaScript Origins

Add these URLs:

- **Local Development**: `http://localhost:5173`
- **Local Backend**: `http://localhost:4000`
- **Production Frontend**: Your production frontend URL (e.g., `https://pminterviewpractice.com`)
- **Production Backend**: Your production backend URL (e.g., `https://api.pminterviewpractice.com`)

### Authorized Redirect URIs

Add these URLs:

- **Local Development**: `http://localhost:4000/api/auth/google/callback`
- **Production**: Your production backend URL + `/api/auth/google/callback`
  - Example: `https://pmip-be-production.up.railway.app/api/auth/google/callback`

5. Click "Create"
6. **Important**: Copy the Client ID and Client Secret immediately

## Step 5: Update Backend Environment Variables

Add these variables to your `.env` file in the `PMIP-BE` directory:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
FRONTEND_URL=http://localhost:5173
```

For production, update `FRONTEND_URL` to your production frontend URL.

## Step 6: Update CORS Settings (If Needed)

Make sure your backend CORS configuration allows your frontend domain. In `PMIP-BE/src/index.js`, the CORS is currently set to allow all origins. For production, you should restrict it:

```javascript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
```

## Step 7: Test the Integration

### Local Testing

1. Start your backend server:

   ```bash
   cd PMIP-BE
   npm run dev
   ```

2. Start your frontend server:

   ```bash
   cd PMIP-FE
   npm run dev
   ```

3. Navigate to `http://localhost:5173/auth/login`
4. Click "Continue with Google"
5. You should be redirected to Google sign-in
6. After successful authentication, you should be redirected back to the app

## Troubleshooting

### Common Issues

**Error: "redirect_uri_mismatch"**

- Solution: Make sure the redirect URI in Google Console exactly matches your backend URL + `/api/auth/google/callback`
- Check for trailing slashes, http vs https

**Error: "Access blocked: This app's request is invalid"**

- Solution: Make sure you've added your email as a test user in the OAuth consent screen

**Error: "Error 400: invalid_request"**

- Solution: Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correctly set in `.env`

**Users not being redirected after authentication**

- Solution: Check that `FRONTEND_URL` in `.env` matches your actual frontend URL

### Checking OAuth Flow

You can test the OAuth endpoints directly:

1. Backend health check: `http://localhost:4000/api/health`
2. Google OAuth initiation: `http://localhost:4000/api/auth/google` (should redirect to Google)

## Production Deployment

When deploying to production:

1. **Update Google Cloud Console**:

   - Add production frontend URL to "Authorized JavaScript origins"
   - Add production backend callback URL to "Authorized redirect URIs"

2. **Update Environment Variables**:

   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your hosting platform
   - Set `FRONTEND_URL` to your production frontend URL
   - Set `NODE_ENV=production`

3. **Publish OAuth App** (Optional):
   - In Google Cloud Console, go to "OAuth consent screen"
   - Click "Publish App" to remove the "This app isn't verified" warning
   - Note: This requires Google verification for apps with >100 users

## Security Notes

- Never commit `.env` file to version control
- Keep your `GOOGLE_CLIENT_SECRET` secure
- Use HTTPS in production
- Regularly rotate your client secrets
- Monitor OAuth usage in Google Cloud Console

## Account Linking Behavior

The implementation supports automatic account linking:

- If a user signs up with email/password first, they can later sign in with Google using the same email
- The accounts will be automatically linked
- Users who sign up with Google cannot use email/password login (they'll see an error message directing them to use Google)

## Support

For more information, see:

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google OAuth Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
