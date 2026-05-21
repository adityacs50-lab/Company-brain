import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id') || 'org_123';

    const { data: employees, error } = await supabase
      .from('brain_employees')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Format employee list to clean connection indicators for the UI
    const formatted = (employees || []).map(emp => ({
      id: emp.id,
      employee_id: emp.employee_id,
      name: emp.name || 'Pending OAuth',
      email: emp.email || 'No email',
      department: emp.department || 'General',
      role: emp.role || 'Staff',
      gmail_connected: !!emp.gmail_token,
      slack_connected: !!emp.slack_token,
      gdrive_connected: !!emp.gmail_token, // GDrive uses the Google token
      notion_connected: !!emp.notion_token,
      last_synced: emp.last_synced,
    }));

    return NextResponse.json({ employees: formatted });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { org_id, employee_id, name, email, department, role } = body;

    if (!org_id || !employee_id || !email) {
      return NextResponse.json({ error: 'org_id, employee_id, and email are required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('brain_employees')
      .insert({
        org_id,
        employee_id,
        name,
        email,
        department: department || 'General',
        role: role || 'Staff',
      })
      .select()
      .single();

    if (error) {
      // Check if employee_id already exists to provide a friendly message
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Employee ID already exists.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ employee: data, message: 'Employee registered successfully. Complete OAuth connections next.' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
