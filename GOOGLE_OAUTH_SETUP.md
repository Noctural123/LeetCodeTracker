# Google OAuth Setup Guide

Follow these steps to set up Google OAuth for your LeetCode Tracker app.

## Step 1: Go to Google Cloud Console

1. Open your browser and go to: https://console.cloud.google.com/
2. Sign in with your Google account

## Step 2: Create a New Project (or Select Existing)

1. Click on the project dropdown at the top of the page
2. Click **"New Project"**
3. Enter a project name (e.g., "LeetCode Tracker")
4. Click **"Create"**
5. Wait for the project to be created, then select it from the dropdown

## Step 3: Enable Google+ API

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"** or **"Google Identity"**
3. Click on **"Google Identity"** or **"Google+ API"**
4. Click the **"Enable"** button

## Step 4: Configure OAuth Consent Screen

1. In the left sidebar, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have a Google Workspace account, then choose "Internal")
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: LeetCode Tracker (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the "Scopes" page, click **"Save and Continue"** (you can add scopes later if needed)
7. On the "Test users" page, you can add test users or skip for now
8. Click **"Save and Continue"**
9. Review and click **"Back to Dashboard"**

## Step 5: Create OAuth 2.0 Credentials

1. In the left sidebar, go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, choose **"Web application"** as the application type
5. Fill in the form:
   - **Name**: LeetCode Tracker Web Client (or any name you prefer)
   - **Authorized JavaScript origins**:
     - Add: `http://localhost:3000`
     - If deploying, also add your production URL (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - Add: `http://localhost:3000/api/auth/callback/google`
     - If deploying, also add: `https://yourdomain.com/api/auth/callback/google`
6. Click **"Create"**

## Step 6: Copy Your Credentials

1. A popup will appear with your **Client ID** and **Client Secret**
2. **IMPORTANT**: Copy both values now - you won't be able to see the Client Secret again!
3. If you lose the Client Secret, you'll need to create new credentials

## Step 7: Add Credentials to Your App

1. Open your `.env.local` file in `apps/web/` directory
2. Add the following lines (replace with your actual values):

```env
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

3. Save the file

## Step 8: Restart Your Development Server

1. Stop your Next.js dev server (Ctrl+C)
2. Restart it with `npm run dev`
3. The Google OAuth button should now appear and work!

## Troubleshooting

### "redirect_uri_mismatch" Error
- Make sure the redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check for typos, trailing slashes, or http vs https

### "Access blocked" Error
- Your app might be in testing mode
- Go to OAuth consent screen → "Publish app" (or add test users)
- For production, you'll need to verify your app with Google

### Button Not Showing
- Make sure both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.local`
- Restart your dev server after adding the credentials
- Check the browser console for any errors

## Production Deployment

When deploying to production:
1. Add your production URL to "Authorized JavaScript origins"
2. Add your production callback URL to "Authorized redirect URIs"
3. Update your production environment variables with the same credentials
4. Consider creating separate OAuth credentials for production

## Security Notes

- **Never commit** your `.env.local` file to git (it should already be in `.gitignore`)
- Keep your Client Secret secure
- Rotate credentials if they're ever exposed
- Use environment variables in production, never hardcode credentials

