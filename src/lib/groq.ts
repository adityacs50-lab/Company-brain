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

  const rejectPatterns = [
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
    /faq/,
    /tasks? in detail/,
    /process/,
    /steps?/,
    /requirements?/,
    /must submit/,
    /how to/,
    /support/,
    /approval/,
    /policy/,
    /form/,
    /certificate/,
    /screenshot/,
    /participants?/,
    /presentation/,
    /proposal/,
    /problem statement/,
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
      return /^(q\d+|answer:|important|requirement|must|submit|complete|check|review|share|post|send|open|visit|use|wait|fill|upload|approve|confirm|take|join|contact|access|provide|record|invite|schedule|certificate|support|session|minimum|each|after|before|where|when|how|can|will|what|if)/i.test(line);
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
Analyze the following raw work material (emails, Slack messages, Google Docs, FAQs, checklists, task lists, syllabi, guides, or Notion pages) and extract useful repeatable workflows, instructions, rules, policies, decisions, checklists, or support procedures.

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
- Extract actual repeatable procedures, checklist steps, admin processes, FAQ answer flows, event instructions, support instructions, assignment processes, or operating rules.
- Exclude casual chit-chat, scheduling questions, or non-actionable remarks.
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
