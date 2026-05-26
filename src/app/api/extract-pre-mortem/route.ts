import { NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

type RiskLevel = 'High' | 'Medium' | 'Low';

interface PreMortemAlert {
  level: RiskLevel;
  title: string;
  explanation: string;
  action: string;
  receipt: string;
}

interface PreMortemPromise {
  title: string;
  owner: string;
  status: 'Unreviewed';
  receipt: string;
}

interface PreMortemAction {
  day: string;
  action: string;
  description: string;
}

interface PreMortemResult {
  riskLevel: RiskLevel;
  alertsCount: number;
  promisesCount: number;
  actionsCount: number;
  alerts: PreMortemAlert[];
  promises: PreMortemPromise[];
  actionPlan: PreMortemAction[];
}

function asRiskLevel(value: unknown): RiskLevel {
  return value === 'High' || value === 'Medium' || value === 'Low' ? value : 'Medium';
}

function asString(value: unknown, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function cleanReceipt(value: unknown, fallback: string) {
  return asString(value, fallback).slice(0, 180);
}

function extractReceipt(context: string) {
  const timestamp = context.match(/\b(?:Gong|Zoom|Call)\s+\d{1,2}:\d{2}(?::\d{2})?\b/i)?.[0];
  const slack = context.match(/\bSlack\s+#[a-z0-9-_]+/i)?.[0];
  const email = context.match(/\bEmail\s+[A-Za-z]{3,9}\s+\d{1,2}\b/i)?.[0];
  return timestamp || email || slack || 'Source text quote';
}

function parseJsonObject(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('LLM did not return a JSON object.');
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeResult(data: any, context: string): PreMortemResult {
  const fallbackReceipt = extractReceipt(context);
  const alerts = Array.isArray(data?.alerts)
    ? data.alerts.slice(0, 6).map((alert: any): PreMortemAlert => ({
        level: asRiskLevel(alert?.level),
        title: asString(alert?.title, 'Risk needs review'),
        explanation: asString(alert?.explanation, 'Review source context before kickoff.'),
        action: asString(alert?.action, 'Ask AE and CSM to verify this risk before kickoff.'),
        receipt: cleanReceipt(alert?.receipt, fallbackReceipt),
      }))
    : [];

  const promises = Array.isArray(data?.promises)
    ? data.promises.slice(0, 8).map((promise: any): PreMortemPromise => ({
        title: asString(promise?.title, 'Sales promise needs review'),
        owner: asString(promise?.owner, 'AE'),
        status: 'Unreviewed',
        receipt: cleanReceipt(promise?.receipt, fallbackReceipt),
      }))
    : [];

  const actionPlan = Array.isArray(data?.actionPlan)
    ? data.actionPlan.slice(0, 7).map((item: any): PreMortemAction => ({
        day: asString(item?.day, 'Day 1'),
        action: asString(item?.action, 'Review the handoff with AE and CSM.'),
        description: asString(item?.description, 'Confirm source-backed context before the kickoff call.'),
      }))
    : [];

  return {
    riskLevel: asRiskLevel(data?.riskLevel || alerts[0]?.level),
    alertsCount: alerts.length,
    promisesCount: promises.length,
    actionsCount: actionPlan.length,
    alerts,
    promises,
    actionPlan,
  };
}

function fallbackPreMortem(context: string): PreMortemResult {
  const receipt = extractReceipt(context);

  return {
    riskLevel: 'Medium',
    alertsCount: 1,
    promisesCount: 1,
    actionsCount: 3,
    alerts: [
      {
        level: 'Medium',
        title: 'Source context needs human review',
        explanation:
          'The model could not complete extraction, but the provided pre-sale context should be reviewed before kickoff.',
        action: 'Have the CSM and AE verify buyer goals, blockers, and promises before the first customer call.',
        receipt,
      },
    ],
    promises: [
      {
        title: 'Review the source text for explicit commitments made during sales.',
        owner: 'AE',
        status: 'Unreviewed',
        receipt,
      },
    ],
    actionPlan: [
      {
        day: 'Day 1',
        action: 'Review source-backed handoff context',
        description: 'CSM and AE confirm what was promised, who objected, and what must be resolved first.',
      },
      {
        day: 'Day 1-2',
        action: 'Identify buyer success metric',
        description: 'Turn the customer-defined success criteria into the kickoff agenda.',
      },
      {
        day: 'Day 3',
        action: 'Resolve open implementation risks',
        description: 'Document unresolved technical or operational risks before implementation starts.',
      },
    ],
  };
}

export async function POST(request: Request) {
  let fallbackContext = '';

  try {
    const body = await request.json();
    const customerName = asString(body?.customerName, 'Unknown customer');
    const dealValue = asString(body?.dealValue, 'Unknown deal value');
    const ae = asString(body?.ae, 'Unknown AE');
    const csm = asString(body?.csm, 'Unassigned CSM');
    const context = asString(body?.context, '');
    fallbackContext = context;

    if (context.length < 20) {
      return NextResponse.json(
        { error: 'Paste at least 20 characters of Gong, Slack, or Email context.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an elite RevOps & Customer Success AI. Analyze the provided pre-sale conversational context (Gong/Slack/Email). Extract hidden churn risks, unfulfilled sales promises, and create a 7-day kickoff action plan. You MUST output strictly in JSON format. EVERY extracted alert, promise, and action MUST include a receipt (a direct quote or timestamp from the text). Do not hallucinate.

Return a JSON object exactly matching this TypeScript shape:
{
  "riskLevel": "High" | "Medium" | "Low",
  "alertsCount": number,
  "promisesCount": number,
  "actionsCount": number,
  "alerts": [
    {
      "level": "High" | "Medium" | "Low",
      "title": "string",
      "explanation": "string",
      "action": "string",
      "receipt": "string (e.g., Gong 00:18:42)"
    }
  ],
  "promises": [
    {
      "title": "string",
      "owner": "string",
      "status": "Unreviewed",
      "receipt": "string"
    }
  ],
  "actionPlan": [
    {
      "day": "Day 1" | "Day 1-2" | "Day 3" | "Day 7",
      "action": "string",
      "description": "string"
    }
  ]
}

Rules:
- Use only evidence from the provided context.
- If a risk or promise is weak, mark it as Medium or Low and explain what must be verified.
- Receipts must be copied from the source text as timestamps, channel names, email dates, or short direct quotes.
- Counts must equal the array lengths.
- Do not include markdown, commentary, or keys outside the schema.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Deal metadata:
Customer: ${customerName}
Deal value: ${dealValue}
AE: ${ae}
CSM: ${csm}

Pre-sale conversational context:
${context.slice(0, 16000)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(fallbackPreMortem(context));
    }

    const parsed = parseJsonObject(content);
    return NextResponse.json(normalizeResult(parsed, context));
  } catch (error: any) {
    console.error('Pre-mortem extraction failed:', error?.message || error);
    return NextResponse.json(fallbackPreMortem(fallbackContext));
  }
}
