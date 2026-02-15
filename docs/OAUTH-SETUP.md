# OAuth Setup Guide

OAuth is currently **not configured** on production. This guide explains how to set it up.

## Status

- ✅ **Google OAuth**: Code ready, needs configuration
- ✅ **GitHub OAuth**: Code ready, needs configuration
- ✅ **Email/Password**: Working (use this for MVP)
- ✅ **Error messages**: Clear messages when OAuth not configured

## How Users See It

When OAuth is not configured, users see:
```
🔧 Google OAuth not yet configured.
Please use email/password login for now.
Admin: Configure GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in environment variables.
```

## Setup Instructions

### Google OAuth

#### 1. Create Google OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - Local: `http://localhost:3000/oauth/google/callback`
   - Production: `https://mybestagent.io/oauth/google/callback`
7. Copy: **Client ID** and **Client Secret**

#### 2. Add to Render Environment
On Render dashboard:
1. Select your service
2. Go to Environment → Environment Variables
3. Add:
   ```
   GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
   GOOGLE_OAUTH_REDIRECT_URI=https://mybestagent.io/oauth/google/callback
   ```
4. Click Deploy → Manual Deploy

#### 3. Test Locally
```bash
export GOOGLE_OAUTH_CLIENT_ID=your_client_id
export GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
export GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/google/callback
npm run dev
```

### GitHub OAuth

#### 1. Create GitHub OAuth App
1. Go to GitHub Settings → [Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: "My Best Agent"
   - Homepage URL: `https://mybestagent.io`
   - Authorization callback URL: `https://mybestagent.io/oauth/github/callback`
4. Copy: **Client ID** and generate **Client Secret**

#### 2. Add to Render Environment
1. Select your service
2. Go to Environment → Environment Variables
3. Add:
   ```
   GITHUB_OAUTH_CLIENT_ID=your_client_id_here
   GITHUB_OAUTH_CLIENT_SECRET=your_client_secret_here
   GITHUB_OAUTH_REDIRECT_URI=https://mybestagent.io/oauth/github/callback
   ```
4. Click Deploy → Manual Deploy

#### 3. Test Locally
```bash
export GITHUB_OAUTH_CLIENT_ID=your_client_id
export GITHUB_OAUTH_CLIENT_SECRET=your_client_secret
export GITHUB_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/github/callback
npm run dev
```

## Testing OAuth Flow

1. **Start with email/password** (working now)
2. Once OAuth is configured, test:
   - Click "Continue with Google"
   - Sign in with Google account
   - Should redirect back and create account
   - Verify user data (email, name, avatar)

## Troubleshooting

### "Google OAuth not configured"
- Check Render environment variables are set
- Confirm redirect URI matches exactly
- Wait 5 minutes for Render to redeploy

### "OAuth request failed"
- Check OAuth credentials are correct
- Verify internet connection
- Check API is enabled (Google/GitHub)

### "Redirect URI mismatch"
- Ensure Render environment variable matches OAuth app settings
- Common mistake: `http://` vs `https://`
- Check for trailing slashes

## Production Checklist

- [ ] Google OAuth client ID & secret in Render
- [ ] GitHub OAuth client ID & secret in Render
- [ ] Redirect URIs configured in Google Cloud Console
- [ ] Redirect URIs configured in GitHub OAuth app
- [ ] Test Google login flow
- [ ] Test GitHub login flow
- [ ] Verify user email is captured
- [ ] Verify avatar is displayed
- [ ] Test OAuth linking to existing email account

## Code Structure

- **Backend**: `/src/api/routes/oauth.js` (handles auth endpoints)
- **Service**: `/src/api/services/oauth.js` (Google + GitHub API calls)
- **Frontend**: `auth-modal.js` (login buttons)
- **Database**: `db.js` (stores OAuth tokens + user data)

## Next Steps

1. Set up Google OAuth (takes ~10 min)
2. Set up GitHub OAuth (takes ~10 min)
3. Deploy to Render (5 min)
4. Test the flows (10 min)

Total: ~35 minutes to full OAuth support!
