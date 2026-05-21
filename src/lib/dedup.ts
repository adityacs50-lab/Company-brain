import { groq } from './groq';

export interface SkillItem {
  id?: string;
  org_id: string;
  skill_name: string;
  trigger: string;
  steps: string[];
  source_employees: {
    employee_ids: string[];
    frequency: number;
  };
  confidence: number;
  verified_by_human: boolean;
}

// Stop words to clean up text before vectorization
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have',
  'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt',
  'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'shan' ,'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some',
  'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent',
  'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why',
  'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your',
  'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenizes text and produces a clean array of terms.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Strip punctuation
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Creates a term frequency vector.
 */
function getTermFrequency(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) || 0) + 1);
  }
  return map;
}

/**
 * Calculates Cosine Similarity between two strings.
 */
export function calculateCosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0;
  }

  const freqA = getTermFrequency(tokensA);
  const freqB = getTermFrequency(tokensB);

  const uniqueTerms = new Set<string>();
  freqA.forEach((_, key) => uniqueTerms.add(key));
  freqB.forEach((_, key) => uniqueTerms.add(key));

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  uniqueTerms.forEach(term => {
    const valA = freqA.get(term) || 0;
    const valB = freqB.get(term) || 0;

    dotProduct += valA * valB;
    magnitudeA += valA * valA;
    magnitudeB += valB * valB;
  });

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Formats a skill object into a single continuous text string for comparison.
 */
export function serializeSkillForComparison(skill: {
  skill_name: string;
  trigger: string;
  steps: string[];
}): string {
  const normalizedName = skill.skill_name.replace(/_/g, ' ');
  return `${normalizedName} ${skill.trigger} ${skill.steps.join(' ')}`;
}

/**
 * Uses Groq to merge multiple similar skills into one perfect, clean skill.
 */
async function mergeSimilarSkillsWithGroq(
  skillsToMerge: SkillItem[]
): Promise<{ skill_name: string; trigger: string; steps: string[] }> {
  if (skillsToMerge.length === 1) {
    return {
      skill_name: skillsToMerge[0].skill_name,
      trigger: skillsToMerge[0].trigger,
      steps: skillsToMerge[0].steps,
    };
  }

  try {
    const prompt = `You are a Principal Operational Systems Architect. Your job is to merge multiple duplicate or highly similar employee operational skills into a single, unified, premium operational skill representation.

Here are the similar skills extracted from different employees:
${skillsToMerge
  .map(
    (s, idx) => `
Skill #${idx + 1}:
Name: ${s.skill_name}
Trigger: ${s.trigger}
Steps:
${s.steps.map((st, i) => `  ${i + 1}. ${st}`).join('\n')}
`
  )
  .join('\n\n')}

Create a single consolidated skill. Make sure:
- The title is clean, professional snake_case (e.g. "auto_approve_small_refunds").
- The trigger is exact, combining nuances if necessary but remaining concise.
- The steps are consolidated, removing any redundancies while ensuring all unique actionable instructions across both versions are preserved.

You MUST respond strictly with a valid JSON object matching the following structure:
{
  "skill_name": "string (snake_case)",
  "trigger": "string",
  "steps": ["string", "string", ...]
}`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert system merging business processes. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (parsed && parsed.skill_name && parsed.trigger && Array.isArray(parsed.steps)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to merge skills with Groq, falling back to heuristic:', error);
  }

  // Heuristic fallback: Use the skill with the most steps as the base
  const sorted = [...skillsToMerge].sort((a, b) => b.steps.length - a.steps.length);
  return {
    skill_name: sorted[0].skill_name,
    trigger: sorted[0].trigger,
    steps: sorted[0].steps,
  };
}

/**
 * Deduplicates raw skills list using pairwise Cosine Similarity matching.
 * Returns a consolidated, merged skills file with updated contributors and confidence scoring.
 */
export async function deduplicateSkills(
  skills: SkillItem[],
  totalConnectedEmployees: number
): Promise<SkillItem[]> {
  if (skills.length === 0) return [];
  
  const totalEmployeesCount = Math.max(totalConnectedEmployees, 1);
  const visited = new Set<number>();
  const mergedSkills: SkillItem[] = [];

  for (let i = 0; i < skills.length; i++) {
    if (visited.has(i)) continue;

    const currentSkill = skills[i];
    const groupToMerge: SkillItem[] = [currentSkill];
    visited.add(i);

    const serializedCurrent = serializeSkillForComparison(currentSkill);

    // Search for matches
    for (let j = i + 1; j < skills.length; j++) {
      if (visited.has(j)) continue;

      const compareSkill = skills[j];
      const serializedCompare = serializeSkillForComparison(compareSkill);
      const similarity = calculateCosineSimilarity(serializedCurrent, serializedCompare);

      if (similarity >= 0.85) {
        groupToMerge.push(compareSkill);
        visited.add(j);
      }
    }

    // Process the group
    let mergedBase: { skill_name: string; trigger: string; steps: string[] };
    if (groupToMerge.length > 1) {
      mergedBase = await mergeSimilarSkillsWithGroq(groupToMerge);
    } else {
      mergedBase = {
        skill_name: currentSkill.skill_name,
        trigger: currentSkill.trigger,
        steps: currentSkill.steps,
      };
    }

    // Merge employee lists
    const uniqueEmployees = new Set<string>();
    for (const skill of groupToMerge) {
      if (skill.source_employees?.employee_ids) {
        skill.source_employees.employee_ids.forEach(empId => uniqueEmployees.add(empId));
      }
    }

    const employee_ids = Array.from(uniqueEmployees);
    const frequency = employee_ids.length;
    const confidence = parseFloat((frequency / totalEmployeesCount).toFixed(2));

    // Preserve human verification status if any of the components were verified
    const verified_by_human = groupToMerge.some(s => s.verified_by_human);

    mergedSkills.push({
      org_id: currentSkill.org_id,
      skill_name: mergedBase.skill_name,
      trigger: mergedBase.trigger,
      steps: mergedBase.steps,
      source_employees: {
        employee_ids,
        frequency,
      },
      confidence,
      verified_by_human,
    });
  }

  return mergedSkills;
}
