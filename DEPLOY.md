# Company Brain — Deployment Guide

This guide walks through deploying Company Brain to production (Render + Vercel).

---

## Step 1: Push to GitHub

### Option A: Using GitHub CLI (Recommended)

```bash
# Install GitHub CLI
winget install GitHub.GitHubCLI

# Login
gh auth login

# Create repo
gh repo create company-brain --public --source=. --push

# Or if you want to use a specific org
gh repo create company-brain --org YOUR_ORG --public --source=. --push
```

### Option B: Using GitHub Website

1. Go to https://github.com/new
2. Repository name: `company-brain`
3. Public repo
4. Don't initialize with README (we have code)
5. Click "Create repository"
6. Follow "push an existing repository" instructions:

```bash
git remote add origin https://github.com/YOUR_USERNAME/company-brain.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

### Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### Create Web Service
1. Dashboard → New → Web Service
2. Connect your GitHub repo
3. Select `company-brain` repository
4. Configure:

| Setting | Value |
|---------|-------|
| Name | company-brain-api |
| Region | Oregon (or closest) |
| Branch | main |
| Build Command | `npm install` |
| Start Command | `npm start` |

### Add Environment Variables
In Render dashboard, go to "Environment" tab and add:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://company-brain-api.onrender.com/api/auth/google/callback

# Slack OAuth
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_REDIRECT_URI=https://company-brain-api.onrender.com/api/auth/slack/callback

# Notion OAuth
NOTION_CLIENT_ID=xxx
NOTION_CLIENT_SECRET=xxx
NOTION_REDIRECT_URI=https://company-brain-api.onrender.com/api/auth/notion/callback

# Groq
GROQ_API_KEY=gsk_xxx
```

### Deploy
1. Click "Create Web Service"
2. Wait for build (2-5 min)
3. Get your URL: `https://company-brain-api.onrender.com`

---

## Step 3: Deploy Frontend to Vercel

### Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub

### New Project
1. Dashboard → Add New → Project
2. Import `company-brain` repo
3. Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |

### Add Environment Variables

```env
# IMPORTANT: Point to Render backend
NEXT_PUBLIC_API_URL=https://company-brain-api.onrender.com

# Supabase (same as backend)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
```

### Deploy
1. Click "Deploy"
2. Wait for build (~2 min)
3. Get your URL: `https://company-brain.vercel.app`

---

## Step 4: Update OAuth Redirect URLs

After deploying, update your OAuth apps:

### Google Cloud Console
1. https://console.cloud.google.com
2. APIs & Services → Credentials
3. Edit your OAuth client
4. Update Redirect URI:
   ```
   https://company-brain-api.onrender.com/api/auth/google/callback
   ```

### Slack App Settings
1. https://api.slack.com/apps
2. OAuth & Permissions
3. Redirect URLs:
   ```
   https://company-brain-api.onrender.com/api/auth/slack/callback
   ```

### Notion Integration
1. https://www.notion.so/my-integrations
2. Update redirect URIs:
   ```
   https://company-brain-api.onrender.com/api/auth/notion/callback
   ```

---

## Step 5: Test Live

1. Open your Vercel URL (e.g., `https://company-brain.vercel.app`)
2. Go to `/admin/sweep`
3. Add an employee
4. Connect Gmail/Slack/Notion
5. Run a sweep
6. Verify skills appear

---

## Quick Deploy Checklist

- [ ] Push code to GitHub
- [ ] Create Render web service
- [ ] Add all env vars to Render
- [ ] Deploy backend (get Render URL)
- [ ] Create Vercel project
- [ ] Add NEXT_PUBLIC_API_URL to Vercel
- [ ] Deploy frontend (get Vercel URL)
- [ ] Update OAuth redirect URLs
- [ ] Test live dashboard

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build failed on Render | Check node version in package.json |
| OAuth redirect error | Update redirect URIs in OAuth dashboards |
| 404 on API calls | Check NEXT_PUBLIC_API_URL is correct |
| CORS errors | Ensure Render URL is in allowed origins |
| Token expired | Reconnect account in dashboard |
