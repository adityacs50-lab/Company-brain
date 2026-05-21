import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

type SourceEmployees = {
  employee_ids?: string[];
  sources?: {
    title?: string;
    url?: string;
  }[];
};

function parseSourceEmployees(value: unknown): SourceEmployees {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value as SourceEmployees;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as SourceEmployees;
    } catch {
      return {};
    }
  }

  return {};
}

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    const orgId = params.orgId;
    const { searchParams } = new URL(request.url);
    const approvedOnly = searchParams.get('approved_only') !== 'false';

    if (!orgId) {
      return NextResponse.json({ error: 'orgId parameter is required' }, { status: 400 });
    }

    let query = supabase
      .from('brain_skills')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (approvedOnly) {
      query = query.eq('verified_by_human', true);
    }

    const { data: skills, error } = await query;

    if (error) {
      throw error;
    }

    const agentSkills = (skills || []).map((skill) => {
      const sourceEmployees = parseSourceEmployees(skill.source_employees);

      return {
        skill: skill.skill_name,
        when_to_use: skill.trigger,
        steps: Array.isArray(skill.steps) ? skill.steps : [],
        safety: {
          human_approved: !!skill.verified_by_human,
          use_without_approval: !!skill.verified_by_human,
        },
        evidence: {
          contributors: sourceEmployees.employee_ids || [],
          source_links: (sourceEmployees.sources || []).map((source) => ({
            title: source.title || 'Source',
            url: source.url || null,
          })),
        },
      };
    });

    return NextResponse.json({
      format: 'company_brain_agent_skills_file',
      org_id: orgId,
      approved_only: approvedOnly,
      generated_at: new Date().toISOString(),
      usage: 'AI agents should match a user/task situation to when_to_use, follow steps in order, and ask a human before using unapproved skills.',
      skills: agentSkills,
    });
  } catch (error: any) {
    console.error('Error building agent skills file:', error);
    return NextResponse.json({ error: error.message || 'Internal Database Error' }, { status: 500 });
  }
}
