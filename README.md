# Batonyx

**Source-verified Sales-to-CS handoff briefs for B2B SaaS teams.**

Sales sells intent. CRMs store facts. Batonyx captures the difference before customers churn from broken onboarding.

Batonyx turns Closed-Won deal context from calls, email, Slack, CRM notes, and docs into a Customer Success handoff brief. CS can see what was promised, what success means to the buyer, who is skeptical, which blockers are unresolved, and which source proves each claim.

## Live Links

- Landing page: [https://company-brain-tawny.vercel.app/](https://company-brain-tawny.vercel.app/)
- MVP demo: [https://company-brain-tawny.vercel.app/admin/handoff](https://company-brain-tawny.vercel.app/admin/handoff)

## Current MVP

The current MVP is the real-input handoff flow:

```text
Paste sales context
        |
Groq extracts handoff brief
        |
Human reviews / approves
        |
Export Markdown or JSON
```

The demo supports two modes:

- **Paste real context:** paste a call transcript, AE notes, email thread, Slack summary, CRM notes, or onboarding doc. The app calls Groq and generates a handoff brief.
- **Sample sources:** use seeded Gmail, Slack, Drive, Notion, and call transcript examples for a quick product demo.

## What The Handoff Brief Extracts

- Promises made during the sales cycle
- Buyer KPIs and 30-day success metric
- Key stakeholders and roles
- Internal skeptic or blocker
- Technical constraints
- Unresolved risks
- Next steps for CS
- Source titles / receipts for review

## Why This Exists

B2B SaaS teams lose the most important customer context at the exact moment a customer moves from sales to customer success.

CRMs usually capture facts like deal size, close date, owner, and stage. They often miss the narrative that determines onboarding quality:

- what the buyer was promised
- why the buyer signed
- what success means in the buyer's own words
- who pushed back internally
- what technical constraints exist
- what could make onboarding stall

Batonyx is not a CRM replacement. It sits on top of existing sales and CS tools and routes missing context into the handoff workflow.

## Product Surfaces

| Route | Purpose |
| :--- | :--- |
| `/` | Batonyx landing page |
| `/admin/handoff` | Current MVP demo with real pasted input + Groq extraction |
| `/api/handoff/extract` | API endpoint that turns raw pre-sale context into a structured handoff brief |

## Handoff API

### `POST /api/handoff/extract`

Payload:

```json
{
  "customer": "Acme Analytics",
  "dealValue": "$48K ARR",
  "ae": "Maya, Account Executive",
  "csm": "Rohan, Customer Success",
  "sourceTitle": "Pasted sales context",
  "sourceText": "Paste call transcript, email thread, Slack notes, CRM notes, or onboarding context here..."
}
```

Response:

```json
{
  "success": true,
  "brief": {
    "customer": "Acme Analytics",
    "stage": "Closed-Won",
    "dealValue": "$48K ARR",
    "ae": "Maya, Account Executive",
    "csm": "Rohan, Customer Success",
    "buyerIntent": "Acme bought to prevent surprise churn before QBRs.",
    "successMetric": "Identify five risky accounts within 30 days.",
    "promisedOutcomes": ["Friday Slack summary during pilot"],
    "stakeholders": ["Jordan, VP Customer Success"],
    "internalSkeptic": "Priya from RevOps is skeptical about CRM data quality.",
    "technicalConstraints": ["Start read-only before CRM writeback"],
    "unresolvedRisks": ["Missing source links would reduce RevOps trust"],
    "nextSteps": ["CSM reviews the brief before kickoff"],
    "sourceLinks": ["Pasted sales context"]
  }
}
```

## Tech Stack

- Next.js App Router
- React + TypeScript
- Groq `llama-3.3-70b-versatile` for extraction
- Vercel deployment

## Environment Variables

Create `.env.local` locally and configure:

```env
GROQ_API_KEY=your_groq_api_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:3000/api/auth/slack/callback

NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For the current MVP, `GROQ_API_KEY` is the critical variable. Without it, real extraction cannot call Groq.

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/admin/handoff
```

## Production Build

```bash
npm run build
```

## Current Status

Working:

- Batonyx landing page
- Real pasted-input handoff extraction using Groq
- Human approval step
- Markdown/JSON export

Not built yet:

- Native HubSpot/Salesforce Closed-Won trigger
- Gong/Zoom transcript import
- Automatic Slack posting
- CRM writeback
- Multi-tenant production auth for external design partners

Next validation step:

```text
Take one real recently Closed-Won deal
        |
Paste the actual sales context
        |
Generate the Batonyx handoff brief
        |
Ask a CS/RevOps operator if this would have improved kickoff
```
