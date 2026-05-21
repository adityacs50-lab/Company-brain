import { NextResponse } from 'next/server';
import { activeSweeps } from '@/lib/sweepService';
import { supabase } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  const orgId = params.orgId;

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const activeSweep = activeSweeps.get(orgId);

  // Return the live in-memory sweep process if active
  if (activeSweep) {
    return NextResponse.json(activeSweep);
  }

  // Compile database summary if system is currently idle
  try {
    const { count: employeesCount } = await supabase
      .from('brain_employees')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    const { count: skillsCount } = await supabase
      .from('brain_skills')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    const { count: sourcesCount } = await supabase
      .from('brain_sources')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    return NextResponse.json({
      orgId,
      status: 'idle',
      totalEmployees: employeesCount || 0,
      employeesProcessed: employeesCount || 0,
      emailsProcessed: sourcesCount || 0,
      slackMessagesAnalyzed: 0,
      driveFilesParsed: 0,
      notionPagesScanned: 0,
      rawSkillsExtracted: skillsCount || 0,
      duplicatesFound: 0,
      logs: ['[System Idle] Ready to trigger next enterprise knowledge capture.'],
      startedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error fetching baseline status stats:', err);
    return NextResponse.json({
      orgId,
      status: 'idle',
      logs: ['[System Idle] Standby for org-wide sweep.'],
    });
  }
}
