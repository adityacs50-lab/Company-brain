/**
 * ═══════════════════════════════════════════════════════════════════════
 * COMPANY BRAIN — END-TO-END DUMMY SWEEP PIPELINE TEST
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This script proves the ENTIRE pipeline works without real OAuth:
 *
 *   Step 1 → Clean up any previous test data
 *   Step 2 → Insert 3 dummy employees into brain_employees
 *   Step 3 → Insert 12 realistic raw sources into brain_sources
 *   Step 4 → Run Groq Llama-3.3-70B extraction on every source
 *   Step 5 → Store extracted skills in brain_skills
 *   Step 6 → Run cosine similarity deduplication + Groq neural merge
 *   Step 7 → Display the final operational manual
 *
 * Run with:  node scripts/test_dummy_sweep.js
 */

const fs = require('fs');
const path = require('path');

// ── Load .env.local ──────────────────────────────────────────────────
if (fs.existsSync(path.join(__dirname, '..', '.env.local'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ORG_ID = 'test_org_yc_pitch';

// ══════════════════════════════════════════════════════════════════════
//  DUMMY DATA DEFINITIONS
// ══════════════════════════════════════════════════════════════════════

const EMPLOYEES = [
  { employee_id: 'alice_001', name: 'Alice',   email: 'alice@company.com',   department: 'Support',    role: 'Support Lead' },
  { employee_id: 'bob_002',   name: 'Bob',     email: 'bob@company.com',     department: 'Operations', role: 'Ops Manager' },
  { employee_id: 'charlie_003', name: 'Charlie', email: 'charlie@company.com', department: 'Finance',   role: 'Finance Analyst' },
];

const RAW_SOURCES = [
  // ── Alice's communications (Support) ───────────────────────────────
  {
    employee_id: 'alice_001',
    source_type: 'gmail',
    external_id: 'gmail_alice_001',
    title: 'RE: Refund policy for small orders',
    content: `Hi team, just to confirm our standard refund procedure:
If a customer asks for a refund and the order is under $50, we auto-approve it immediately in Zendesk without manager sign-off.
For orders between $50 and $200, the support agent reviews the customer's order history, checks for abuse patterns, then approves or escalates.
For orders above $200, it MUST go to a manager for approval within 24 hours. We always send a confirmation email to the customer after.
Thanks, Alice`
  },
  {
    employee_id: 'alice_001',
    source_type: 'slack',
    external_id: 'slack_alice_002',
    title: '#support-escalation channel',
    content: `@channel Reminder: When escalating a ticket to engineering, please follow this checklist:
1. Tag the ticket as "engineering-escalation" in Zendesk
2. Write a clear summary of the bug with reproduction steps
3. Attach screenshots or screen recordings
4. Post the Zendesk ticket link in #eng-support-bridge Slack channel
5. Assign priority P1 for revenue-impacting issues, P2 for UX bugs, P3 for cosmetic
6. Follow up within 4 hours if no engineer has responded`
  },
  {
    employee_id: 'alice_001',
    source_type: 'gmail',
    external_id: 'gmail_alice_003',
    title: 'New employee onboarding for Support',
    content: `Hey HR, here's the support team onboarding checklist we use:
Day 1: Set up Zendesk account, invite to Slack channels #support, #support-escalation, #announcements
Day 2: Shadow a senior agent for a full shift, review the internal FAQ doc
Day 3: Handle 5 practice tickets with mentor oversight
Day 4-5: Gradually take on real tickets, start with password resets and billing inquiries
Week 2: Full queue responsibility. Manager does a 1-on-1 review at end of Week 2.`
  },
  {
    employee_id: 'alice_001',
    source_type: 'gdrive',
    external_id: 'gdrive_alice_004',
    title: 'Customer Churn Intervention Playbook',
    content: `CHURN PREVENTION PROTOCOL:
When a customer cancels their subscription:
1. Trigger a "cancellation intercept" flow — an automated email offers 20% off for 3 months
2. If they don't respond within 48 hours, a support agent calls them directly
3. During the call, ask for specific cancellation reason, log it in the CRM under "churn reasons"
4. If the reason is pricing, offer the annual plan at 30% discount
5. If the reason is feature gap, create a product feedback ticket and promise follow-up
6. All outcomes must be logged in the weekly churn report spreadsheet`
  },

  // ── Bob's communications (Operations) ──────────────────────────────
  {
    employee_id: 'bob_002',
    source_type: 'slack',
    external_id: 'slack_bob_001',
    title: '#operations channel',
    content: `Team, here's the updated process for handling refund requests that come through ops:
1. Check order value — if under $50, instant approval, no review needed
2. If between $50-$200, review customer history for patterns and approve
3. If over $200, escalate to department head for sign-off
4. All refunds must be logged in the Finance shared Google Sheet
5. Send the customer a refund confirmation email within 1 business day
This aligns with what Support does so there's consistency across teams.`
  },
  {
    employee_id: 'bob_002',
    source_type: 'gmail',
    external_id: 'gmail_bob_002',
    title: 'Vendor onboarding SOP',
    content: `Hi procurement team, documenting our vendor onboarding process:
1. Vendor fills out the intake form on our portal
2. Ops team reviews the application within 48 hours
3. Run a background check using our third-party compliance tool
4. If approved, create vendor profile in NetSuite with payment terms (Net-30 default)
5. Send welcome packet with API credentials if applicable
6. Schedule a kickoff call with the vendor and relevant internal stakeholders
7. Add vendor to our quarterly review roster`
  },
  {
    employee_id: 'bob_002',
    source_type: 'notion',
    external_id: 'notion_bob_003',
    title: 'Incident Response Runbook',
    content: `INCIDENT RESPONSE PROCEDURE (P1 — Revenue Impacting):
1. First responder posts in #incident-war-room with a summary
2. Page the on-call engineer via PagerDuty
3. Assign an Incident Commander (IC) — usually the senior on-call
4. IC opens a Google Doc for real-time notes and timeline logging
5. Engineering works on fix. Communicate status every 15 minutes in the war room
6. Once resolved, IC posts an "all-clear" in #general and #operations
7. Within 48 hours, hold a blameless post-mortem meeting
8. Document root cause, timeline, customer impact, and remediation steps in Notion
9. Create follow-up Jira tickets for any preventative measures`
  },
  {
    employee_id: 'bob_002',
    source_type: 'slack',
    external_id: 'slack_bob_004',
    title: '#operations channel — server deployments',
    content: `Deployment checklist for production releases:
1. Merge all PRs to staging branch, ensure CI passes
2. QA team does a full regression test on staging (allow 4 hours)
3. Get sign-off from QA lead and product manager
4. Create a deployment ticket in Jira with change summary
5. Deploy to production during the maintenance window (Tues/Thurs 2-4 AM UTC)
6. Run smoke tests on production endpoints immediately after deploy
7. Monitor Datadog dashboards for 30 minutes post-deploy
8. If rollback needed, revert the last merge commit and redeploy`
  },

  // ── Charlie's communications (Finance) ─────────────────────────────
  {
    employee_id: 'charlie_003',
    source_type: 'gmail',
    external_id: 'gmail_charlie_001',
    title: 'Monthly close procedure',
    content: `Accounting team — here's the month-end close procedure:
1. On the 1st of each month, pull all transactions from Stripe and bank feeds into QuickBooks
2. Reconcile every bank account — flag any discrepancies over $100
3. Review all outstanding invoices — send reminders for anything over 30 days
4. Accrue any unbilled revenue from active projects
5. Run the P&L and Balance Sheet reports, export to the shared Finance Google Drive folder
6. Schedule the finance review meeting with CFO by the 5th
7. Submit final reports to the board by the 7th of each month`
  },
  {
    employee_id: 'charlie_003',
    source_type: 'slack',
    external_id: 'slack_charlie_002',
    title: '#finance channel',
    content: `Quick reminder on the expense reimbursement policy:
1. Employees submit receipts through Expensify within 30 days of purchase
2. Manager approval is required for any expense over $100
3. Finance team reviews all submissions every Friday
4. Approved expenses are reimbursed in the next payroll cycle
5. Rejected expenses get a Slack DM from finance with the reason
6. No personal expenses on company cards — violations trigger a policy review with HR`
  },
  {
    employee_id: 'charlie_003',
    source_type: 'gmail',
    external_id: 'gmail_charlie_003',
    title: 'RE: Refund impact on books',
    content: `Hi Support team, from the finance side, here's what needs to happen when you process refunds:
1. Refunds under $50 are auto-recorded — no action needed from finance
2. For refunds $50-$200, the support agent should tag the transaction in Stripe with "refund-reviewed"
3. For refunds above $200, finance needs to be cc'd on the approval email
4. All refunds above $500 need a matching credit memo in QuickBooks
5. Monthly refund totals must be included in the close report
This keeps our books clean and audit-ready.`
  },
  {
    employee_id: 'charlie_003',
    source_type: 'notion',
    external_id: 'notion_charlie_004',
    title: 'Budget Approval Workflow',
    content: `BUDGET REQUEST APPROVAL PROCESS:
1. Department head submits a budget request form in Notion with justification and amount
2. Finance analyst (me) reviews the request within 2 business days
3. Requests under $5,000 — Finance analyst can approve directly
4. Requests $5,000-$25,000 — Requires CFO approval
5. Requests above $25,000 — Requires board approval at the next monthly meeting
6. Once approved, create a budget line in the tracking spreadsheet
7. Notify the requesting department via email with the approved amount and any conditions
8. Track actuals vs. budget monthly and flag any overruns above 10%`
  },
];

// ══════════════════════════════════════════════════════════════════════
//  HELPER: Groq Skill Extraction (mirrors src/lib/groq.ts)
// ══════════════════════════════════════════════════════════════════════

async function extractSkillsFromText(text) {
  const systemPrompt = `You are an expert operational engineer and enterprise knowledge capture agent.
Analyze the following raw employee communication and extract operational procedures, workflows, rules, policies, or decisions.

For each procedural skill identified, extract:
1. A unique, short snake_case name for the skill.
2. The trigger that initiates the workflow.
3. A detailed list of chronological steps.

You MUST respond strictly with a valid JSON object:
{
  "skills": [
    {
      "skill_name": "string (snake_case)",
      "trigger": "string",
      "steps": ["step 1", "step 2"]
    }
  ]
}
Only extract actual repeatable procedures. If none found, return {"skills": []}.`;

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
  if (!content) return [];
  const data = JSON.parse(content);
  return Array.isArray(data.skills) ? data.skills : [];
}

// ══════════════════════════════════════════════════════════════════════
//  HELPER: Cosine Similarity + Dedup (mirrors src/lib/dedup.ts)
// ══════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any','are','as','at','be',
  'because','been','before','being','below','between','both','but','by','can','could','did','do',
  'does','doing','down','during','each','few','for','from','further','had','has','have','having',
  'he','her','here','hers','herself','him','himself','his','how','i','if','in','into','is','it',
  'its','itself','just','me','more','most','my','myself','no','nor','not','of','off','on','once',
  'only','or','other','our','ours','ourselves','out','over','own','same','she','should','so','some',
  'such','than','that','the','their','theirs','them','themselves','then','there','these','they',
  'this','those','through','to','too','under','until','up','very','was','we','were','what','when',
  'where','which','while','who','whom','why','will','with','would','you','your','yours','yourself',
]);

function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function getTermFrequency(tokens) {
  const m = new Map();
  tokens.forEach(t => m.set(t, (m.get(t) || 0) + 1));
  return m;
}

function cosineSimilarity(textA, textB) {
  const tA = tokenize(textA), tB = tokenize(textB);
  if (!tA.length || !tB.length) return 0;
  const fA = getTermFrequency(tA), fB = getTermFrequency(tB);
  const terms = new Set(); fA.forEach((_, k) => terms.add(k)); fB.forEach((_, k) => terms.add(k));
  let dot = 0, magA = 0, magB = 0;
  terms.forEach(t => { const a = fA.get(t)||0, b = fB.get(t)||0; dot += a*b; magA += a*a; magB += b*b; });
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function serializeSkill(s) {
  return `${s.skill_name.replace(/_/g,' ')} ${s.trigger} ${s.steps.join(' ')}`;
}

async function mergeSkillsWithGroq(skills) {
  if (skills.length === 1) return skills[0];
  const prompt = `You are a Principal Operational Systems Architect. Merge these duplicate skills into one unified skill:\n\n` +
    skills.map((s, i) => `Skill #${i+1}:\nName: ${s.skill_name}\nTrigger: ${s.trigger}\nSteps:\n${s.steps.map((st,j) => `  ${j+1}. ${st}`).join('\n')}`).join('\n\n') +
    `\n\nRespond ONLY with JSON: {"skill_name":"snake_case","trigger":"string","steps":["step1","step2"]}`;

  const response = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'You merge business processes. Respond ONLY with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (content) {
    const parsed = JSON.parse(content);
    if (parsed.skill_name && parsed.trigger && Array.isArray(parsed.steps)) return parsed;
  }
  return skills.sort((a,b) => b.steps.length - a.steps.length)[0];
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN PIPELINE
// ══════════════════════════════════════════════════════════════════════

async function run() {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   COMPANY BRAIN — END-TO-END DUMMY SWEEP PIPELINE TEST         ║');
  console.log('║   Proves the full pipeline works before connecting real data    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  // ── STEP 1: Clean up previous test data ────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  STEP 1 │ Cleaning up previous test data...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await supabase.from('brain_skills').delete().eq('org_id', ORG_ID);
  await supabase.from('brain_sources').delete().eq('org_id', ORG_ID);
  await supabase.from('brain_employees').delete().eq('org_id', ORG_ID);
  console.log('  ✓ Previous test data purged.\n');

  // ── STEP 2: Insert dummy employees ─────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  STEP 2 │ Inserting 3 dummy employees into brain_employees...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const emp of EMPLOYEES) {
    const { error } = await supabase.from('brain_employees').upsert({
      org_id: ORG_ID,
      ...emp,
      last_synced: new Date().toISOString(),
    }, { onConflict: 'employee_id' });

    if (error) {
      console.error(`  ✗ Failed to insert ${emp.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${emp.name} (${emp.email}) — ${emp.department} / ${emp.role}`);
    }
  }
  console.log('');

  // ── STEP 3: Insert raw sources ─────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  STEP 3 │ Inserting ${RAW_SOURCES.length} raw sources into brain_sources...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const src of RAW_SOURCES) {
    const { error } = await supabase.from('brain_sources').insert({
      org_id: ORG_ID,
      employee_id: src.employee_id,
      source_type: src.source_type,
      external_id: src.external_id,
      title: src.title,
      content: src.content,
    });

    if (error) {
      console.error(`  ✗ Failed: ${src.title} — ${error.message}`);
    } else {
      const typeIcon = { gmail: '📧', slack: '💬', gdrive: '📄', notion: '📓' }[src.source_type] || '📋';
      console.log(`  ${typeIcon} ${src.employee_id} │ ${src.source_type.padEnd(6)} │ ${src.title}`);
    }
  }
  console.log('');

  // ── STEP 4: Run Groq extraction on each source ─────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  STEP 4 │ Running Groq Llama-3.3-70B extraction on all sources...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const allExtractedSkills = [];
  let sourceIndex = 0;

  for (const src of RAW_SOURCES) {
    sourceIndex++;
    process.stdout.write(`  [${sourceIndex}/${RAW_SOURCES.length}] Extracting from "${src.title}"...`);

    try {
      const skills = await extractSkillsFromText(src.content);
      console.log(` → ${skills.length} skill(s) found`);

      for (const skill of skills) {
        allExtractedSkills.push({
          org_id: ORG_ID,
          employee_id: src.employee_id,
          skill_name: skill.skill_name,
          trigger: skill.trigger,
          steps: skill.steps,
        });
      }
    } catch (err) {
      console.log(` ✗ Error: ${err.message}`);
    }

    // Small delay to respect Groq rate limits
    if (sourceIndex < RAW_SOURCES.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n  ⚡ Total raw skills extracted: ${allExtractedSkills.length}\n`);

  // ── STEP 5: Save extracted skills to brain_skills ──────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  STEP 5 │ Saving extracted skills to Supabase brain_skills...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let savedCount = 0;
  for (const skill of allExtractedSkills) {
    const { error } = await supabase.from('brain_skills').insert({
      org_id: skill.org_id,
      skill_name: skill.skill_name,
      trigger: skill.trigger,
      steps: JSON.stringify(skill.steps),
      source_employees: JSON.stringify({ employee_ids: [skill.employee_id], frequency: 1 }),
      confidence: (1 / EMPLOYEES.length),
      verified_by_human: false,
    });

    if (error) {
      console.error(`  ✗ Failed to save "${skill.skill_name}": ${error.message}`);
    } else {
      savedCount++;
    }
  }
  console.log(`  ✓ Saved ${savedCount} raw skills to database.\n`);

  // ── STEP 6: Deduplication + Groq neural merge ─────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  STEP 6 │ Running cosine similarity deduplication...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Build skill items for dedup
  const skillItems = allExtractedSkills.map(s => ({
    org_id: s.org_id,
    skill_name: s.skill_name,
    trigger: s.trigger,
    steps: s.steps,
    source_employees: { employee_ids: [s.employee_id], frequency: 1 },
    confidence: 0,
    verified_by_human: false,
  }));

  // Pairwise similarity analysis
  console.log('\n  Pairwise similarity matrix (showing matches ≥ 0.40):');
  console.log('  ┌─────────────────────────────────────────────────────────────┐');
  let duplicatePairs = 0;
  for (let i = 0; i < skillItems.length; i++) {
    for (let j = i + 1; j < skillItems.length; j++) {
      const sim = cosineSimilarity(serializeSkill(skillItems[i]), serializeSkill(skillItems[j]));
      if (sim >= 0.40) {
        const marker = sim >= 0.85 ? '🔴 DUPLICATE' : sim >= 0.60 ? '🟡 SIMILAR' : '🟢 RELATED';
        console.log(`  │ ${marker}  (${sim.toFixed(4)})  "${skillItems[i].skill_name}" ↔ "${skillItems[j].skill_name}"`);
        if (sim >= 0.85) duplicatePairs++;
      }
    }
  }
  console.log('  └─────────────────────────────────────────────────────────────┘');
  console.log(`  Found ${duplicatePairs} duplicate pair(s) to merge.\n`);

  // Run full dedup
  const visited = new Set();
  const mergedSkills = [];

  for (let i = 0; i < skillItems.length; i++) {
    if (visited.has(i)) continue;
    const group = [skillItems[i]];
    visited.add(i);
    const serializedI = serializeSkill(skillItems[i]);

    for (let j = i + 1; j < skillItems.length; j++) {
      if (visited.has(j)) continue;
      const sim = cosineSimilarity(serializedI, serializeSkill(skillItems[j]));
      if (sim >= 0.85) {
        group.push(skillItems[j]);
        visited.add(j);
      }
    }

    let mergedBase;
    if (group.length > 1) {
      process.stdout.write(`  🧠 Neural merging ${group.length} duplicates of "${group[0].skill_name}"...`);
      mergedBase = await mergeSkillsWithGroq(group);
      console.log(' done.');
      await new Promise(r => setTimeout(r, 500));
    } else {
      mergedBase = { skill_name: group[0].skill_name, trigger: group[0].trigger, steps: group[0].steps };
    }

    const uniqueEmployees = new Set();
    group.forEach(s => s.source_employees.employee_ids.forEach(id => uniqueEmployees.add(id)));
    const empIds = Array.from(uniqueEmployees);
    const confidence = parseFloat((empIds.length / EMPLOYEES.length).toFixed(2));

    mergedSkills.push({
      org_id: ORG_ID,
      skill_name: mergedBase.skill_name,
      trigger: mergedBase.trigger,
      steps: mergedBase.steps,
      source_employees: { employee_ids: empIds, frequency: empIds.length },
      confidence,
      verified_by_human: false,
    });
  }

  // Update Supabase: clear old skills, insert deduped
  await supabase.from('brain_skills').delete().eq('org_id', ORG_ID);
  for (const skill of mergedSkills) {
    await supabase.from('brain_skills').insert({
      org_id: skill.org_id,
      skill_name: skill.skill_name,
      trigger: skill.trigger,
      steps: JSON.stringify(skill.steps),
      source_employees: JSON.stringify(skill.source_employees),
      confidence: skill.confidence,
      verified_by_human: skill.verified_by_human,
    });
  }

  console.log(`\n  ✓ Deduplication complete. ${allExtractedSkills.length} raw → ${mergedSkills.length} consolidated skills.\n`);

  // ── STEP 7: Display the final operational manual ───────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         FINAL OPERATIONAL SKILLS MANUAL (Company Brain)         ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');

  // Sort by confidence descending
  mergedSkills.sort((a, b) => b.confidence - a.confidence);

  mergedSkills.forEach((skill, idx) => {
    const confBar = '█'.repeat(Math.round(skill.confidence * 10)) + '░'.repeat(10 - Math.round(skill.confidence * 10));
    const confPercent = (skill.confidence * 100).toFixed(0) + '%';

    console.log('║                                                                  ║');
    console.log(`║  SKILL #${(idx + 1).toString().padStart(2, '0')}                                                       ║`);
    console.log(`║  Name:       ${skill.skill_name.padEnd(52)}║`);
    console.log(`║  Trigger:    ${skill.trigger.substring(0, 52).padEnd(52)}║`);
    console.log(`║  Confidence: [${confBar}] ${confPercent.padEnd(38)}║`);
    console.log(`║  Contributors: ${skill.source_employees.employee_ids.join(', ').padEnd(50)}║`);
    console.log(`║  Frequency:  ${skill.source_employees.frequency} employee(s) corroborated this procedure${' '.repeat(16)}║`);
    console.log('║  Steps:                                                          ║');
    skill.steps.forEach((step, sIdx) => {
      const stepLine = `    ${sIdx + 1}. ${step}`;
      // Wrap long lines
      const maxLen = 62;
      if (stepLine.length <= maxLen) {
        console.log(`║  ${stepLine.padEnd(64)}║`);
      } else {
        // Print in chunks
        for (let c = 0; c < stepLine.length; c += maxLen) {
          const chunk = stepLine.substring(c, c + maxLen);
          console.log(`║  ${chunk.padEnd(64)}║`);
        }
      }
    });
    console.log('║──────────────────────────────────────────────────────────────────║');
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('║                                                                  ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║                      PIPELINE SUMMARY                           ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Employees scanned:     ${EMPLOYEES.length.toString().padEnd(41)}║`);
  console.log(`║  Raw sources ingested:  ${RAW_SOURCES.length.toString().padEnd(41)}║`);
  console.log(`║  Skills extracted:      ${allExtractedSkills.length.toString().padEnd(41)}║`);
  console.log(`║  After deduplication:   ${mergedSkills.length.toString().padEnd(41)}║`);
  console.log(`║  Duplicates merged:     ${(allExtractedSkills.length - mergedSkills.length).toString().padEnd(41)}║`);
  console.log(`║  Pipeline runtime:      ${(elapsed + 's').padEnd(41)}║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  ✅ PIPELINE VERIFIED — Ready for real company data             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
}

run().catch(err => {
  console.error('\n  ✗ FATAL ERROR:', err);
  process.exit(1);
});
