# Company Brain

**Sales-to-CS Handoff Router for B2B SaaS teams.**

Sales sells intent. CRMs store facts. Company Brain captures the difference.

Company Brain turns scattered pre-sale context from emails, Slack notes, documents, call transcripts, and CRM notes into a source-backed Customer Success handoff brief. The goal is simple: when a deal closes, CS should know why the customer bought, what was promised, who matters, what could break onboarding, and what to do next.

## Live Links

- Landing page: [https://company-brain-tawny.vercel.app/](https://company-brain-tawny.vercel.app/)
- MVP demo: [https://company-brain-tawny.vercel.app/admin/handoff](https://company-brain-tawny.vercel.app/admin/handoff)
- Legacy integration demo: [https://company-brain-tawny.vercel.app/admin/sweep](https://company-brain-tawny.vercel.app/admin/sweep)

## Current MVP

The current MVP is the Sales-to-CS handoff flow:

```text
Paste sales context
        ↓
Groq extracts handoff brief
        ↓
Human reviews / approves
        ↓
Export Markdown or JSON
```

The demo supports two modes:

- **Paste real context:** paste a sales call transcript, AE notes, email thread, Slack summary, CRM notes, or onboarding doc. The app calls Groq and generates a real handoff brief.
- **Sample sources:** use seeded Gmail/Slack/Drive/Notion/call transcript examples for a fast product demo recording.

## What The Handoff Brief Extracts

- Why the customer bought
- 30-day onboarding success metric
- Promises made by sales
- Key stakeholders and roles
- Internal skeptic or blocker
- Technical constraints
- Unresolved risks
- Next steps for CS
- Source titles / source links for review

## Why This Exists

B2B SaaS teams lose context at the exact moment customers move from sales to customer success.

CRMs usually capture facts like deal size, close date, owner, and stage. They often miss the narrative that matters during onboarding:

- why the buyer signed
- what sales promised verbally
- who is skeptical internally
- what technical constraints exist
- what the customer expects in the first 30 days

Company Brain is not trying to replace the CRM. It sits on top of existing tools and routes missing context into the CS workflow.

## Product Surfaces

| Route | Purpose |
| :--- | :--- |
| `/` | Landing page for the Sales-to-CS handoff wedge |
| `/admin/handoff` | Current MVP demo with real pasted input + Groq extraction |
| `/api/handoff/extract` | API endpoint that turns raw pre-sale context into a structured handoff brief |
| `/admin/sweep` | Legacy prototype showing Gmail/Slack/Drive/Notion connection and org sweep flow |

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
- Supabase/Postgres for the legacy sweep prototype
- Groq `llama-3.3-70b-versatile` for extraction
- Google OAuth, Slack OAuth, Notion OAuth in the legacy integration flow
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

For the current handoff MVP, `GROQ_API_KEY` is the critical variable. Without it, real extraction cannot call Groq.

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

## Technical Report

The earlier technical report is still available here:

[Company Brain: Human-Approved Operational Memory for Enterprise AI Agents](papers/company-brain-operational-memory.pdf)

That report describes the broader operational-memory thesis. The current product wedge is narrower: Sales-to-CS handoff failure in B2B SaaS.

## Current Status

Working:

- Landing page focused on Sales-to-CS handoffs
- Real pasted-input handoff extraction using Groq
- Human approval step
- Markdown/JSON export
- Legacy Gmail/Slack/Drive/Notion sweep prototype remains available

Not built yet:

- Native HubSpot/Salesforce closed-won trigger
- Gong/Zoom transcript import
- Automatic Slack posting
- CRM writeback
- Multi-tenant production auth for external design partners

Next validation step:

```text
Take one real recently closed-won deal
        ↓
Paste the actual sales context
        ↓
Generate handoff brief
        ↓
Ask a CS/RevOps operator if this would have improved kickoff
```
