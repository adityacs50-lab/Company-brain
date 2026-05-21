import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { deduplicateSkills, SkillItem } from '@/lib/dedup';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { org_id } = body;

    if (!org_id) {
      return NextResponse.json({ error: 'org_id parameter is required' }, { status: 400 });
    }

    // 1. Fetch all currently extracted raw skills for the org
    const { data: rawSkills, error: fetchErr } = await supabase
      .from('brain_skills')
      .select('*')
      .eq('org_id', org_id);

    if (fetchErr) {
      throw fetchErr;
    }

    // 2. Fetch total connected employees count for accurate confidence scoring
    const { data: employees, error: empErr } = await supabase
      .from('brain_employees')
      .select('employee_id')
      .eq('org_id', org_id);

    if (empErr) {
      throw empErr;
    }

    const totalEmployeesCount = employees ? employees.length : 1;

    // 3. Structure into clean SkillItem objects for the deduplicator
    const skillsToDedupe: SkillItem[] = (rawSkills || []).map(s => {
      let parsedSteps: string[] = [];
      if (Array.isArray(s.steps)) {
        parsedSteps = s.steps;
      } else if (typeof s.steps === 'string') {
        try {
          parsedSteps = JSON.parse(s.steps);
        } catch {
          parsedSteps = [];
        }
      }

      let parsedSource: any = { employee_ids: [], frequency: 0 };
      if (s.source_employees) {
        if (typeof s.source_employees === 'object') {
          parsedSource = s.source_employees;
        } else if (typeof s.source_employees === 'string') {
          try {
            parsedSource = JSON.parse(s.source_employees);
          } catch {}
        }
      }

      return {
        id: s.id,
        org_id: s.org_id,
        skill_name: s.skill_name,
        trigger: s.trigger,
        steps: parsedSteps,
        source_employees: parsedSource,
        confidence: s.confidence || 0,
        verified_by_human: !!s.verified_by_human,
      };
    });

    // 4. Run cosine similarity deduplication and Groq merging
    const dedupedSkills = await deduplicateSkills(skillsToDedupe, totalEmployeesCount);

    const originalCount = rawSkills?.length || 0;
    const dedupedCount = dedupedSkills.length;
    const duplicatesFound = originalCount - dedupedCount;

    if (originalCount > 0 && dedupedCount === 0) {
      throw new Error('Deduplication produced zero skills from non-empty input. Existing skills were preserved.');
    }

    const oldSkillIds = (rawSkills || [])
      .map((skill) => skill.id)
      .filter(Boolean);

    // 5. Insert consolidated skills first. Only delete old rows after this succeeds.
    let insertedCount = 0;
    if (dedupedSkills.length > 0) {
      const dbInsertions = dedupedSkills.map(s => ({
        org_id: s.org_id,
        skill_name: s.skill_name,
        trigger: s.trigger,
        steps: s.steps, // Supabase client handles arrays natively
        source_employees: s.source_employees,
        confidence: s.confidence,
        verified_by_human: s.verified_by_human,
      }));

      const { data: insertedSkills, error: insertErr } = await supabase
        .from('brain_skills')
        .insert(dbInsertions)
        .select('id');

      if (insertErr) {
        throw insertErr;
      }

      insertedCount = insertedSkills?.length || 0;

      if (insertedCount !== dedupedSkills.length) {
        throw new Error(`Expected to insert ${dedupedSkills.length} deduped skills, but inserted ${insertedCount}. Existing skills were preserved.`);
      }
    }

    // 6. Delete only the pre-deduplication rows now that replacement rows exist.
    if (oldSkillIds.length > 0) {
      const { error: deleteErr } = await supabase
        .from('brain_skills')
        .delete()
        .in('id', oldSkillIds);

      if (deleteErr) {
        throw deleteErr;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Skills deduplication completed successfully.',
      originalCount,
      dedupedCount,
      insertedCount,
      duplicatesFound: duplicatesFound >= 0 ? duplicatesFound : 0,
    });
  } catch (error: any) {
    console.error('Error in skills deduplication handler:', error);
    return NextResponse.json({ error: error.message || 'Internal Deduplication Failure' }, { status: 500 });
  }
}
