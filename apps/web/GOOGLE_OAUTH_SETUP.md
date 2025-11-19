# Google OAuth Setup Instructions

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
   - Click "Create"
5. Copy your **Client ID** and **Client Secret**

## Step 2: Add Environment Variables

Add these to your `apps/web/.env.local` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_random_secret_here
```

## Step 3: Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

## Step 4: Run Database Migration

After updating the Prisma schema, run:

```bash
cd /mnt/c/Users/Lance/Documents/LCT
export DATABASE_URL="postgresql://dev:devpw@localhost:5432/leetcode_tracker?schema=public"
npx prisma migrate dev --name add_auth
npx prisma generate
```

## Step 5: Install Dependencies

```bash
cd apps/web
npm install
```

## Step 6: Start the Application

```bash
npm run dev
```

Now you can test Google OAuth login at `http://localhost:3000/login`

