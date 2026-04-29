# Supabase Setup Guide

## Finding Your Credentials

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your existing project
   - Or create a new project if needed

3. **Navigate to API Settings**
   - Click "Settings" (⚙️) in the left sidebar
   - Click "API" under Settings

4. **Copy These Values:**

   ```
   📍 Project URL
   https://your-project-id.supabase.co

   🔑 API Keys
   anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## What to Copy:

1. **Project URL**: 
   ```
   https://abcdefgh1234.supabase.co
   ```

2. **anon public key**: 
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInR5cGUiOiJzZXJ2aWNlIiwiYXVkIjoic3VwYWJhc2UiLCJhdXRoIjoiMC42Mzc0MjE5OTk5OTk5OTk5In0.example
   ```

## Important Notes:

- ✅ The **anon public** key is safe to use in frontend code
- ❌ Never share the **service_role** key (it has admin access)
- 🔒 Keep your keys secure and don't commit them to git

## After Deployment:

Once you have your Vercel URL, you'll need to:
1. Go back to Supabase Settings → API
2. Add your Vercel URL to "Additional Redirect URLs"
3. Example: `https://your-app.vercel.app/**`

## Need Help?

If you don't have a Supabase project:
1. Click "New Project" in Supabase dashboard
2. Choose your organization
3. Enter project name and database password
4. Wait for setup (2-3 minutes)
5. Then follow the steps above
