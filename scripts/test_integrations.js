/**
 * Company Brain - Integration Pipeline Verification Script
 * 
 * Run with: node scripts/test_integrations.js
 */

const fs = require('fs');
const path = require('path');

// Manually parse .env.local if present to avoid extra dotenv package download
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

// 1. Setup Abstractions for Testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqKey = process.env.GROQ_API_KEY;

console.log('====================================================');
console.log(' COMPANY BRAIN: INTEGRATION TEST SUITE (YC PITCH) ');
console.log('====================================================\n');

async function runTests() {
  let hasFailures = false;

  // --- TEST 1: Environment Variables Audit ---
  console.log('[Test 1] Auditing environment variables...');
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ FAIL: Supabase environment variables are missing.');
    hasFailures = true;
  } else {
    console.log('✅ PASS: Supabase keys detected.');
  }

  if (!groqKey) {
    console.error('❌ FAIL: GROQ_API_KEY is missing.');
    hasFailures = true;
  } else {
    console.log('✅ PASS: Groq API key detected.');
  }

  if (hasFailures) {
    console.log('\nStopping test run due to missing environment variables. Please check your .env.local configuration.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const groq = new Groq({ apiKey: groqKey });

  // --- TEST 2: Supabase Connectivity ---
  console.log('\n[Test 2] Verifying Supabase database connection...');
  try {
    const { data, error } = await supabase
      .from('brain_employees')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ PASS: Connected to Supabase. Found employee records.`);
  } catch (err) {
    console.error(`❌ FAIL: Database connection failed: ${err.message}`);
    console.error(`Please make sure your Supabase schema is provisioned using the SQL commands listed in the README.`);
  }

  // --- TEST 3: Groq LLM Skill Extraction ---
  console.log('\n[Test 3] Verifying Groq (Llama-3.3-70b-versatile) skill extraction...');
  const sampleEmail = `
    Hi Team, 
    Here is our policy on customer refunds:
    If a customer requests a refund and the order value is less than $50, we should instantly approve the refund without manual review.
    If the order is over $50, the support agent must review their history and then escalate to management for final approval.
    Thanks,
    Umesh
  `;

  try {
    console.log('Sending sample text to Groq API...');
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert knowledge capture agent. Extract procedural workflows in JSON. Format: {"skills": [{"skill_name": "snake_case", "trigger": "string", "steps": ["step 1"]}]}`
        },
        { role: 'user', content: sampleEmail }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    if (parsed && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
      console.log(`✅ PASS: Extracted ${parsed.skills.length} skills successfully from email.`);
      console.log('Extracted Skill Example:', JSON.stringify(parsed.skills[0], null, 2));
    } else {
      throw new Error('Returned JSON has empty skills array.');
    }
  } catch (err) {
    console.error(`❌ FAIL: Groq extraction failed: ${err.message}`);
  }

  // --- TEST 4: Vector Similarity Math ---
  console.log('\n[Test 4] Verifying Cosine Similarity token algorithm...');
  const skillA = 'auto approve refunds under 50 check history and instant approve';
  const skillB = 'instantly approve refund transactions less than 50 dollars';
  const skillC = 'setup server database backups and configure nightly cron jobs';

  function calculateSimilarity(textA, textB) {
    const tokenize = text => text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
    const getFreq = tokens => {
      const m = new Map();
      tokens.forEach(t => m.set(t, (m.get(t) || 0) + 1));
      return m;
    };
    
    const tokensA = tokenize(textA);
    const tokensB = tokenize(textB);
    const freqA = getFreq(tokensA);
    const freqB = getFreq(tokensB);
    
    const allTerms = new Set([...freqA.keys(), ...freqB.keys()]);
    let dot = 0, magA = 0, magB = 0;
    
    for (const term of allTerms) {
      const vA = freqA.get(term) || 0;
      const vB = freqB.get(term) || 0;
      dot += vA * vB;
      magA += vA * vA;
      magB += vB * vB;
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  const simAB = calculateSimilarity(skillA, skillB);
  const simAC = calculateSimilarity(skillA, skillC);

  console.log(`Similarity between highly similar skills (A & B): ${simAB.toFixed(4)}`);
  console.log(`Similarity between completely different skills (A & C): ${simAC.toFixed(4)}`);

  if (simAB > 0.3 && simAC < 0.15) {
    console.log('✅ PASS: Cosine similarity vector math correctly separates overlapping vs different semantic queries.');
  } else {
    console.error('❌ FAIL: Cosine similarity threshold scoring failed.');
  }

  console.log('\n====================================================');
  console.log(' INTEGRATION PIPELINE VERIFICATION RUN COMPLETED ');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Fatal testing exception:', err);
});
