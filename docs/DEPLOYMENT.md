# Deploying Artisflow to Vercel

## Prerequisites
- Node.js 18+ installed locally
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Supabase project with database configured

## Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

## Step 2: Login to Vercel
```bash
vercel login
```

## Step 3: Configure Environment Variables

### Method A: Via Vercel Dashboard (Recommended)
1. Go to your Vercel dashboard
2. Create a new project or select existing one
3. Go to Settings → Environment Variables
4. Add these variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Method B: Via CLI
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

## Step 4: Deploy
```bash
# From your project directory
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Confirm build settings
# - Deploy!
```

## Step 5: Verify Deployment
1. Check the deployment URL provided by Vercel
2. Test the application loads correctly
3. Verify Supabase connection works
4. Test authentication and data operations

## Configuration Files Created
- `vercel.json` - Vercel deployment configuration
- `.env.example` - Environment variables template

## Build Configuration
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite + React

## Environment Variables Reference
Get these from your Supabase project settings:
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

## Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
vercel --force
```

### Environment Variable Issues
- Ensure variables start with `VITE_` for Vite
- Check Vercel dashboard for correct values
- Redeploy after updating variables

### Supabase Connection Issues
- Verify CORS settings in Supabase
- Check that your Vercel URL is added to Supabase allowed origins
- Ensure environment variables are correctly set

### Service Worker Issues
- The service worker (`sw.js`) is automatically served from `/public/sw.js`
- No additional configuration needed

## Custom Domain (Optional)
1. In Vercel dashboard, go to project settings
2. Add custom domain
3. Configure DNS records as instructed
4. Update Supabase CORS settings with new domain

## Production Optimizations
- Bundle splitting configured for optimal loading
- Service worker caching enabled
- Source maps enabled for debugging
- Lazy loading implemented for routes

## Monitoring
- Vercel provides built-in analytics and monitoring
- Check Vercel dashboard for performance metrics
- Monitor error rates and build times
