import { NextResponse } from 'next/server';
import { runOrgSweep } from '@/lib/sweepService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { org_id, employee_ids } = body;

    if (!org_id || !employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json(
        { error: 'org_id and a non-empty array of employee_ids are required to trigger an org-wide sweep.' },
        { status: 400 }
      );
    }

    // Run sweep asynchronously so the HTTP request completes instantly
    runOrgSweep(org_id, employee_ids).catch(err => {
      console.error(`Asynchronous background sweep failure for org ${org_id}:`, err);
    });

    return NextResponse.json(
      {
        status: 'running',
        message: 'Organization sweep initiated successfully in background. Use status endpoint to track progress.',
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Error triggering sweep:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
