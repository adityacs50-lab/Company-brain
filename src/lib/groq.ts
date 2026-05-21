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

/**
 * Uses Llama 3.3 70B Versatile on Groq to extract structured, operational
 * workflows from raw employee communications.
 */
export async function extractSkillsFromText(text: string): Promise<ExtractedSkill[]> {
  if (!text || text.trim().length < 10) {
    return [];
  }

  try {
    const systemPrompt = `You are an expert operational engineer and enterprise knowledge capture agent.
Analyze the following raw employee communication (which could be an email, slack message, chat thread, google doc, or notion block) and extract operational procedures, workflows, rules, policies, or decisions.

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
- Only extract actual, repeatable procedures and workflows.
- Exclude casual chit-chat, scheduling questions, or non-actionable remarks.
- Make the steps explicit, highly detailed, and descriptive.
- If the communication contains no procedures or workflows, return an empty "skills" array: {"skills": []}.
- Respond ONLY with valid JSON. Do not include markdown code block formatting or preambles outside the JSON.`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the raw employee communication:\n\n${text}` },
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
    if (data && Array.isArray(data.skills)) {
      return data.skills as ExtractedSkill[];
    }
    return [];
  } catch (error) {
    console.error('Error in Groq skill extraction:', error);
    return [];
  }
}
