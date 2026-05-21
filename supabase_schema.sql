-- =========================================================================
-- COMPANY BRAIN: DATABASE SCHEMAS FOR ENTERPRISE KNOWLEDGE CAPTURE
-- Run this in your Supabase SQL Editor to provision the database.
-- =========================================================================

-- 1. Multi-User Employee Registrations
CREATE TABLE IF NOT EXISTS brain_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  department TEXT DEFAULT 'General',
  role TEXT DEFAULT 'Staff',
  gmail_token TEXT,          -- Encrypted refresh token string or full JSON object
  slack_token TEXT,          -- OAuth User/Bot access token
  gdrive_folder_id TEXT,
  notion_workspace_id TEXT,
  notion_token TEXT,         -- Notion integration token
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index employee_id and org_id for rapid ingestion lookups
CREATE INDEX IF NOT EXISTS idx_employees_org ON brain_employees(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_emp_id ON brain_employees(employee_id);

-- 2. Raw Ingested Communications Archive
CREATE TABLE IF NOT EXISTS brain_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  employee_id TEXT REFERENCES brain_employees(employee_id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'gmail' | 'slack' | 'gdrive' | 'notion'
  external_id TEXT NOT NULL, -- Unique external thread ID, Slack ts, Notion page ID
  title TEXT,                -- Email Subject, Slack Channel, Doc Title
  content TEXT NOT NULL,     -- Aggregated text snippet / thread body
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index source lookups
CREATE INDEX IF NOT EXISTS idx_sources_org ON brain_sources(org_id);
CREATE INDEX IF NOT EXISTS idx_sources_employee ON brain_sources(employee_id);
CREATE INDEX IF NOT EXISTS idx_sources_ext_id ON brain_sources(external_id);

-- 3. Consolidated Enterprise Skills Manual
CREATE TABLE IF NOT EXISTS brain_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  steps JSONB NOT NULL,            -- Detailed chronological instructions list: ["Step 1", "Step 2"]
  source_employees JSONB NOT NULL, -- Contributor profiling mapping: {"employee_ids": ["emp_A", "emp_B"], "frequency": 2}
  confidence FLOAT DEFAULT 0.0,    -- Frequency / Total Connected Employees
  verified_by_human BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index skill search
CREATE INDEX IF NOT EXISTS idx_skills_org ON brain_skills(org_id);
CREATE INDEX IF NOT EXISTS idx_skills_confidence ON brain_skills(confidence);

-- Enable RLS & Security Rules
-- By default, server routes utilize Supabase Service Role credentials to bypass RLS for 
-- administrator sweeps, but for other clients, simple policies can be added:
ALTER TABLE brain_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_skills ENABLE ROW LEVEL SECURITY;

-- Add a policy allowing all authenticated users to read skills
CREATE POLICY "Allow read access to skills catalog" ON brain_skills
  FOR SELECT TO authenticated USING (true);
