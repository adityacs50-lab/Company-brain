import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const orgId = searchParams.get('org_id') || 'org_123';

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id parameter is required' }, { status: 400 });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.warn('Slack Client ID or Redirect URI is missing.');
    }

    const state = Buffer.from(JSON.stringify({ employeeId, orgId })).toString('base64');
    
    // Slack bot/user scopes required to scan communications and list channels
    const scopes = 'channels:read,users:read,chat:history,search:read';

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId || ''}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri || '')}&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error starting Slack OAuth flow:', error);
    return NextResponse.json({ error: error.message || 'OAuth error' }, { status: 500 });
  }
}
