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
