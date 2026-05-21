import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skill_id, verified_by_human } = body;

    if (!skill_id) {
      return NextResponse.json({ error: 'skill_id is required parameter' }, { status: 400 });
    }

    // Toggle verification state in the Supabase db
    const { data, error } = await supabase
      .from('brain_skills')
      .update({ verified_by_human: !!verified_by_human })
      .eq('id', skill_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Skill ${verified_by_human ? 'approved' : 'unapproved'} successfully.`,
      skill: data,
    });
  } catch (error: any) {
    console.error('Error toggling skill verification state:', error);
    return NextResponse.json({ error: error.message || 'Internal Database Error' }, { status: 500 });
  }
}
