# Company Brain — User Flow Guide

## How Employees Connect Gmail, Slack, and Notion

This guide walks through the exact steps a user follows to connect their accounts and trigger a knowledge sweep. The goal is **dead simple**: Add Employee → Connect Accounts → Click "Start Sweep" → See Results.

---

## Quick Summary

| Question | Answer |
|----------|--------|
| **Need to install anything?** | No. Just use the web dashboard. |
| **How to authorize access?** | Click "Connect" buttons → OAuth popup → Approve |
| **Where to start the sweep?** | Click "Start Ingestion Sweep" button on the dashboard |
| **See results in real-time?** | Yes — live terminal logs show extraction progress |
| **Prep needed in Gmail/Slack/Notion?** | None. Just have an active account. |

---

## Step-by-Step User Flow

### Step 1: Add Employee Profile

**What the user sees:**
- Dashboard at `/admin/sweep`
- Left sidebar shows "No employees registered"
- Blue button: `[+ Add Employee]`

**What the user does:**
1. Click `[+ Add Employee]`
2. Fill in form:
   - Employee ID: `alice_001` (or any unique tag)
   - Full Name: `Alice`
   - Email: `alice@company.com`
   - Department: `Support`
   - Role: `Support Lead`
3. Click `[Save Profile]`

**Where the data goes:**
- Saved to Supabase `brain_employees` table

---

### Step 2: Connect Gmail / Google Drive

**What the user sees:**
- Employee card in sidebar shows: `+ GOOGLE` badge (clickable)

**What the user does:**
1. Click `+ GOOGLE` badge

**What happens:**
- Browser redirects to Google OAuth screen
- User sees: "Company Brain wants to access your Google Account"
- Permissions shown:
  - See, download, and manage your emails
  - See, edit, and delete all of your Google Drive files
  - See your personal info (name, email)
- User clicks: `[Allow]` ✅

**Where the data goes:**
- Google returns a code → our server exchanges it for refresh token
- Token saved to `brain_employees.gmail_token` in Supabase

**After connecting:**
- Badge changes to: `GOOGLE` (green, with dot indicator)

---

### Step 3: Connect Slack

**What the user sees:**
- Employee card shows: `+ SLACK` badge (clickable)

**What the user does:**
1. Click `+ SLACK` badge

**What happens:**
- Browser redirects to Slack OAuth screen
- User sees: "Company Brain wants to access your Slack workspace"
- Permissions shown:
  - Read channels, messages, and other content
  - Search content
  - See information about you
- User clicks: `[Allow]` ✅

**Where the data goes:**
- Slack returns access token → saved to `brain_employees.slack_token` in Supabase

**After connecting:**
- Badge changes to: `SLACK` (green)

---

### Step 4: Connect Notion

**What the user sees:**
- Employee card shows: `+ NOTION` badge (clickable)

**What the user does:**
1. Click `+ NOTION` badge

**What happens:**
- Browser redirects to Notion OAuth screen
- User sees: "Company Brain wants to access your Notion"
- User clicks: `[Grant Access]` ✅

**Where the data goes:**
- Notion returns token → saved to `brain_employees.notion_token` in Supabase

**After connecting:**
- Badge changes to: `NOTION` (green)

---

### Step 5: Select Employees & Start Sweep

**What the user sees:**
- Checkboxes next to each employee card
- Button: `[Start Ingestion Sweep (X Target Employees) →]`
- 4 wizard tabs: Connect → Sweep → Dedup → Verify

**What the user does:**
1. Check the box next to each employee to sweep
2. Click `[Start Ingestion Sweep]`

**What happens:**
- Tab switches to "Sweep Ingestion"
- Terminal window shows live logs:
  ```
  [System] Connecting API Clients...
  [Google] Fetching Gmail messages for alice_001...
  [Slack] Fetching channel history for #general...
  [Notion] Parsing workspace pages...
  [Groq] Extracting skill from email thread #1...
  [Groq] Extracting skill from email thread #2...
  [System] Skills extracted: 24
  [System] Sweep Complete ✅
  ```

**Where the data goes:**
- Gmail/Slack/Notion messages → `brain_sources` table in Supabase
- Extracted skills → `brain_skills` table

---

### Step 6: Run Deduplication

**What the user sees:**
- After sweep completes, automatically moves to Tab 3 "Dedup"
- Button: `[📐 Execute Similarity Deduplication Merge]`
- Shows "Loaded X raw procedural records"

**What the user does:**
1. Click `[Execute Similarity Deduplication Merge]`

**What happens:**
- System finds similar skills (e.g., "auto_approve_refund" and "process_refund")
- Groq Llama 3.3 merges them into one clean skill
- Confidence scores updated
- Tab automatically moves to "Verify"

---

### Step 7: View & Approve Skills

**What the user sees:**
- Tab 4 "Verify" shows all extracted skills as cards
- Each skill shows:
  - Skill name
  - Trigger (what starts the process)
  - Step-by-step instructions
  - Contributor names
  - Confidence score (%)
  - `[Approve Skill]` button

**What the user does:**
1. Browse skills, search/filter as needed
2. Click `[Approve Skill]` on each to verify accuracy

**Where the data goes:**
- Approved skills → saved to `brain_skills.verified_by_human = true`
- These are the company's **Operational Manual**

---

## Visual Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     USER DASHBOARD                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Step 1        Step 2         Step 3        Step 4        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ Connect │ →│  Sweep   │ →│  Dedup   │ →│ Verify  │   │
│ │Employees│ │Ingestion│ │ Vector   │ │  Skills │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│     ↓          ↓           ↑            ↑                   │
│     │    Live terminal   Automatic   Human                │
│     │    logs stream    merge     approval             │
└─────┴──────────┴───────────┴──────────────────────────────┘

Data Flow:
Employee + OAuth tokens ──→ [Gmail/Slack/Notion APIs]
                              ↓
                       Raw messages saved to brain_sources
                              ↓
                       Groq Llama 3.3 extracts skills
                              ↓
                       Skills saved to brain_skills (raw)
                              ↓
                       Cosine Similarity + Groq merge
                              ↓
                       Final skills with confidence scores
                              ↓
                       Dashboard shows operational manual
```

---

## Screenshots to Capture

| # | Screen | Where |
|---|-------|-------|
| 1 | Empty dashboard, "Add Employee" button | Left sidebar |
| 2 | Add Employee modal filled | Popup |
| 3 | Employee added, showing `+ GOOGLE/SLACK/NOTION` badges | Left sidebar |
| 4 | OAuth popup (Google/Slack/Notion) | External browser |
| 5 | Connected badges turned green | Employee card |
| 6 | "Start Ingestion Sweep" button | Tab 1 |
| 7 | Live terminal logs streaming | Tab 2 Sweep |
| 8 | Deduplication button | Tab 3 Dedup |
| 9 | Final skills cards with approve buttons | Tab 4 Verify |

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| OAuth fails ("Error loading") | Check .env.local has correct CLIENT_ID and SECRET |
| 0 skills extracted | Check employee has actual Gmail/Slack/Notion messages |
| Duplicates not merging | Increase similarity threshold, or run Groq merge manually |
| Token expired | Click "Connect" again to refresh |

---

## Tech Requirements for Admin

The admin (you) needs to configure these env variables before employees can connect:

```bash
# .env.local

# Supabase (get from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Slack OAuth (get from Slack App Dashboard)
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_REDIRECT_URI=http://localhost:3000/api/auth/slack/callback

# Notion OAuth (get from Notion Developers)
NOTION_CLIENT_ID=xxx
NOTION_CLIENT_SECRET=xxx
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback

# Groq API (get from groq.com)
GROQ_API_KEY=gsk_xxx
```

---

## Summary: Dead Simple UX

> **"Add employee → Click connect buttons → Click sweep → See skills"**

That's the entire flow. No installs, no configs, no CLI. Just the dashboard.
