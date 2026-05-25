import Groq from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.warn(
    'CRITICAL WARNING: GROQ_API_KEY is missing in environment variables. Please check your .env.local file.'
  );
}

export const groq = new Groq({
  apiKey: groqApiKey || 'placeholder-groq-key-for-compilation',
});

export interface ExtractedSkill {
  skill_name: string;
  trigger: string;
  steps: string[];
}

export interface SkillExtractionSource {
  title: string;
  content: string;
}

export interface HandoffExtractionSource {
  title: string;
  content: string;
}

export interface HandoffDealContext {
  customer?: string;
  dealValue?: string;
  ae?: string;
  csm?: string;
}

export interface ExtractedHandoffBrief {
  customer: string;
  stage: string;
  dealValue: string;
  ae: string;
  csm: string;
  buyerIntent: string;
  successMetric: string;
  promisedOutcomes: string[];
  stakeholders: string[];
  internalSkeptic: string;
  technicalConstraints: string[];
  unresolvedRisks: string[];
  nextSteps: string[];
  sourceLinks: string[];
}

function toSkillName(title: string) {
  return title
    .replace(/^(Email Thread|Google Doc|Slack Message|Notion Page):\s*/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'document_workflow';
}

function normalizeLine(line: string) {
  return line
    .replace(/^(\d+[\).\s]|[-*•]\s*|step\s+\d+\s*[—:-]?\s*)/i, '')
    .trim();
}

function isLikelyDemoWorkflowSource(source: SkillExtractionSource) {
  const text = `${source.title}\n${source.content}`.toLowerCase();
  const title = source.title.toLowerCase();

  if (title.startsWith('email thread:')) {
    return false;
  }

  const rejectPatterns = [
    /application deadline/,
    /academic program/,
    /cucet/,
    /adidas/,
    /epic games/,
    /google play/,
    /google maps/,
    /youtube/,
    /avatar/,
    /claude/,
    /startup financial projections/,
    /masterclass/,
    /study guide/,
    /syllabus/,
    /exam/,
    /crash course/,
    /career/,
    /job-ready/,
    /internships?/,
    /newsletter/,
    /altman|musk|openai|anthropic/,
    /mathematics|calculus|linear algebra|probability/,
  ];

  if (rejectPatterns.some(pattern => pattern.test(text))) {
    return false;
  }

  const workflowPatterns = [
    /approve invoice/,
    /invoice/,
    /purchase order/,
    /finance manager/,
    /refund/,
    /return/,
    /cancellation/,
    /pricing exception/,
    /discount/,
    /incident/,
    /runbook/,
    /support lead/,
    /escalat/,
    /company brain demo workflows/,
    /workflow,trigger,step_number,step/,
    /sop/,
    /operating rule/,
  ];

  return workflowPatterns.some(pattern => pattern.test(text));
}

function extractUsefulLines(content: string) {
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(normalizeLine)
    .filter(line => {
      if (line.length < 12 || line.length > 220) return false;
      if (/^(no|your task|requirements?|important points to remember|fundamentals and classification|definition of|dṛṣṭi|paramparā|laukika|ancient and continuous|holistic|experience-based|interdisciplinary)\b/i.test(line)) return false;
      return /^(check|match|if|after|before|approve|send|mark|notify|find|record|confirm|offer|explain|update|escalate|post|write|route|require|review|process|verify|create|close|refund|cancel)/i.test(line);
    })
    .filter(Boolean);
}

function extractFallbackSkills(sources: SkillExtractionSource[]): ExtractedSkill[] {
  return sources.filter(isLikelyDemoWorkflowSource).flatMap(source => {
    const steps = Array.from(new Set(extractUsefulLines(source.content))).slice(0, 8);

    if (steps.length < 2) {
      return [];
    }

    const cleanTitle = source.title.replace(/^(Email Thread|Google Doc|Slack Message|Notion Page):\s*/i, '');

    return [{
      skill_name: toSkillName(source.title),
      trigger: `Someone needs to follow the process for ${cleanTitle}`,
      steps,
    }];
  });
}

/**
 * Uses Llama 3.3 70B Versatile on Groq to extract structured, operational
 * workflows from raw employee communications.
 */
export async function extractSkillsFromSources(sources: SkillExtractionSource[]): Promise<ExtractedSkill[]> {
  const usableSources = sources
    .map((source) => ({
      title: source.title || 'Untitled source',
      content: (source.content || '').trim(),
    }))
    .filter((source) => source.content.length >= 10);

  const workflowSources = usableSources.filter(isLikelyDemoWorkflowSource);

  if (workflowSources.length === 0) {
    return [];
  }

  try {
    const systemPrompt = `You are an expert workflow extraction agent.
Analyze the following raw company operating material and extract only repeatable workflows that an AI agent could safely follow.

For each procedural skill identified, extract:
1. A unique, short snake_case name for the skill (e.g. "auto_approve_small_refunds").
2. The trigger that initiates the workflow (e.g. "Customer requests a refund for an order under $50").
3. A detailed list of chronological steps required to execute the skill.

You MUST respond strictly with a valid JSON object matching the following structure:
{
  "skills": [
    {
      "skill_name": "string (snake_case)",
      "trigger": "string (clear operational trigger)",
      "steps": ["string (step 1)", "string (step 2)", "etc..."]
    }
  ]
}

Important Guidelines:
- Extract only business operating procedures such as invoice approval, refunds, cancellations, pricing exceptions, support escalation, incident response, or internal SOPs.
- Exclude newsletters, hiring alerts, school/application deadlines, course material, personal subscriptions, product ads, generic FAQs, and non-company workflows.
- Make the steps explicit, practical, and easy for a person or AI agent to follow.
- If the communication contains no procedures or workflows, return an empty "skills" array: {"skills": []}.
- Respond ONLY with valid JSON. Do not include markdown code block formatting or preambles outside the JSON.`;

    const sourceText = workflowSources
      .map((source, index) => {
        const trimmedContent = source.content.slice(0, 4000);
        return `SOURCE ${index + 1}: ${source.title}\n${trimmedContent}`;
      })
      .join('\n\n---\n\n');

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here are raw employee communications to analyze together:\n\n${sourceText}` },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    const data = JSON.parse(content);
    if (data && Array.isArray(data.skills) && data.skills.length > 0) {
      return data.skills as ExtractedSkill[];
    }
    return extractFallbackSkills(workflowSources);
  } catch (error: any) {
    console.error('Error in Groq skill extraction:', error?.message || error);
    return extractFallbackSkills(workflowSources);
  }
}

export async function extractSkillsFromText(text: string): Promise<ExtractedSkill[]> {
  return extractSkillsFromSources([{ title: 'Raw communication', content: text }]);
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8);

  return cleaned.length > 0 ? cleaned : fallback;
}

function fallbackHandoffBrief(
  sources: HandoffExtractionSource[],
  dealContext: HandoffDealContext = {}
): ExtractedHandoffBrief {
  const joinedText = sources.map((source) => source.content).join('\n').trim();
  const firstUsefulLine =
    joinedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 40) || 'Customer context was provided, but the exact buying intent needs review.';

  return {
    customer: dealContext.customer || 'Unknown customer',
    stage: 'Closed-Won',
    dealValue: dealContext.dealValue || 'Unknown',
    ae: dealContext.ae || 'Unknown AE',
    csm: dealContext.csm || 'Unassigned CSM',
    buyerIntent: firstUsefulLine.slice(0, 260),
    successMetric: 'Needs human review. Look for the customer-defined 30-day onboarding success metric in the source text.',
    promisedOutcomes: [
      'Review the source text for promises made during sales.',
      'Confirm expected onboarding outcome with the AE before kickoff.',
    ],
    stakeholders: ['Economic buyer or champion not confidently extracted. Review source text.'],
    internalSkeptic: 'No clear internal skeptic extracted. Ask AE/RevOps before kickoff.',
    technicalConstraints: ['No clear technical constraints extracted. Review implementation notes before kickoff.'],
    unresolvedRisks: ['Handoff brief was generated from weak or incomplete context and needs human review.'],
    nextSteps: [
      'CSM reviews the source-backed handoff brief before kickoff.',
      'AE confirms promises, buyer intent, and success metric.',
      'CSM sends kickoff agenda based on confirmed context.',
    ],
    sourceLinks: sources.map((source) => source.title || 'Pasted source'),
  };
}

export async function extractHandoffBriefFromSources(
  sources: HandoffExtractionSource[],
  dealContext: HandoffDealContext = {}
): Promise<ExtractedHandoffBrief> {
  const usableSources = sources
    .map((source) => ({
      title: source.title || 'Pasted source',
      content: (source.content || '').trim(),
    }))
    .filter((source) => source.content.length >= 20);

  if (usableSources.length === 0) {
    return fallbackHandoffBrief([{ title: 'Empty source', content: '' }], dealContext);
  }

  try {
    const systemPrompt = `You generate Sales-to-CS handoff briefs for B2B SaaS teams.
The user will provide scattered pre-sale context such as call transcripts, email threads, Slack notes, CRM notes, Google Docs, or Notion notes.

Extract only information that a Customer Success Manager needs before onboarding:
- why the customer bought
- the 30-day success metric
- promises made by sales
- stakeholders and roles
- internal skeptic or blocker
- technical constraints
- unresolved risks
- next steps for CS
- source titles that support the brief

Return ONLY valid JSON matching this exact schema:
{
  "customer": "string",
  "stage": "Closed-Won",
  "dealValue": "string",
  "ae": "string",
  "csm": "string",
  "buyerIntent": "string",
  "successMetric": "string",
  "promisedOutcomes": ["string"],
  "stakeholders": ["string"],
  "internalSkeptic": "string",
  "technicalConstraints": ["string"],
  "unresolvedRisks": ["string"],
  "nextSteps": ["string"],
  "sourceLinks": ["string"]
}

Rules:
- Be concrete. Do not use startup buzzwords.
- If a field is missing, say what needs human review instead of hallucinating.
- Keep each bullet short and useful for a real CSM.
- Use the supplied customer, AE, CSM, and deal value if present.
- The sourceLinks array should contain source titles, not invented URLs.`;

    const sourceText = usableSources
      .map((source, index) => `SOURCE ${index + 1}: ${source.title}\n${source.content.slice(0, 6000)}`)
      .join('\n\n---\n\n');

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Deal context:
Customer: ${dealContext.customer || 'Unknown'}
Deal value: ${dealContext.dealValue || 'Unknown'}
AE: ${dealContext.ae || 'Unknown'}
CSM: ${dealContext.csm || 'Unassigned'}

Raw pre-sale sources:
${sourceText}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fallbackHandoffBrief(usableSources, dealContext);
    }

    const data = JSON.parse(content);
    const fallback = fallbackHandoffBrief(usableSources, dealContext);

    return {
      customer: String(data.customer || dealContext.customer || fallback.customer),
      stage: 'Closed-Won',
      dealValue: String(data.dealValue || dealContext.dealValue || fallback.dealValue),
      ae: String(data.ae || dealContext.ae || fallback.ae),
      csm: String(data.csm || dealContext.csm || fallback.csm),
      buyerIntent: String(data.buyerIntent || fallback.buyerIntent),
      successMetric: String(data.successMetric || fallback.successMetric),
      promisedOutcomes: asStringArray(data.promisedOutcomes, fallback.promisedOutcomes),
      stakeholders: asStringArray(data.stakeholders, fallback.stakeholders),
      internalSkeptic: String(data.internalSkeptic || fallback.internalSkeptic),
      technicalConstraints: asStringArray(data.technicalConstraints, fallback.technicalConstraints),
      unresolvedRisks: asStringArray(data.unresolvedRisks, fallback.unresolvedRisks),
      nextSteps: asStringArray(data.nextSteps, fallback.nextSteps),
      sourceLinks: asStringArray(data.sourceLinks, usableSources.map((source) => source.title)),
    };
  } catch (error: any) {
    console.error('Error in Groq handoff extraction:', error?.message || error);
    return fallbackHandoffBrief(usableSources, dealContext);
  }
}
