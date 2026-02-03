# Railway Deployment - Simple Steps

## Step 1: Create New Project on Railway

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `rstil2/datasnap`
5. Railway will detect the monorepo structure

## Step 2: Set Up Backend Service

1. Railway will create a service automatically
2. Click on the service
3. Go to "Settings" tab
4. Set these configurations:
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Start Command**: Leave empty (uses Dockerfile CMD)

## Step 3: Add PostgreSQL Database

1. In your project, click "+ New"
2. Select "Database" > "Add PostgreSQL"
3. Railway will automatically create a `DATABASE_URL` environment variable
4. The backend service will automatically have access to this

## Step 4: Configure Backend Environment Variables

Click on your backend service, go to "Variables" tab, and add:

```
SECRET_KEY=<generate-a-random-32-character-string>
ENVIRONMENT=production
CORS_ORIGINS=https://datasnap-production.up.railway.app
```

To generate SECRET_KEY, run this command locally:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Optional (if you want AI features):
```
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
```

## Step 5: Deploy Backend

1. Click "Deploy" or it will auto-deploy
2. Wait for build to complete (~2-3 minutes)
3. Once deployed, note the URL (will be like `backend-production-xxxx.up.railway.app`)

## Step 6: Set Up Frontend Service

1. Click "+ New" in your project
2. Select "GitHub Repo" and choose `rstil2/datasnap` again
3. After it's added:
   - Go to "Settings" tab
   - **Root Directory**: `frontend`
   - **Dockerfile Path**: `frontend/Dockerfile`
   - **Start Command**: Leave empty

4. Go to "Variables" tab and add:
```
NODE_ENV=production
API_BASE_URL=/api
VITE_API_URL=/api
```

## Step 7: Generate Domain

1. Click on your frontend service
2. Go to "Settings" tab
3. Click "Generate Domain" under "Public Networking"
4. Your app will be available at: `https://datasnap-production.up.railway.app` (or similar)

## Step 8: Update CORS

1. Go back to backend service
2. Update the `CORS_ORIGINS` variable with your frontend domain
3. Example: `CORS_ORIGINS=https://datasnap-production.up.railway.app`

## Step 9: Run Database Migrations

1. Click on backend service
2. Go to "Settings" tab
3. Under "Deploy", add this as "Custom Start Command" (temporarily):
```
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
4. Redeploy the service

## That's It!

Your app should now be live at your Railway domain!

### Costs

- **Free Tier**: $5 credit/month (enough for hobby projects)
- **Pro Plan**: $20/month if you need more resources

### Troubleshooting

If something doesn't work:
1. Check "Deployments" tab for build logs
2. Check "Metrics" for runtime errors
3. Verify all environment variables are set correctly

---

**Your app will be deployed and accessible within 5-10 minutes!**
