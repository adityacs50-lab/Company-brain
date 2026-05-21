import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    const orgId = params.orgId;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId parameter is required' }, { status: 400 });
    }

    // Load skills ordered by confidence score descending
    const { data: skills, error } = await supabase
      .from('brain_skills')
      .select('*')
      .eq('org_id', orgId)
      .order('confidence', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ skills: skills || [] });
  } catch (error: any) {
    console.error('Error fetching unified skills catalog:', error);
    return NextResponse.json({ error: error.message || 'Internal Database Error' }, { status: 500 });
  }
}
