import { NextResponse } from 'next/server';
import { getOAuthRedirectUri } from '@/lib/oauthRedirects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const orgId = searchParams.get('org_id') || 'org_123';

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id parameter is required' }, { status: 400 });
    }

    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = getOAuthRedirectUri('notion', request);

    if (!clientId || !redirectUri) {
      console.warn('Notion Client ID or Redirect URI is missing.');
    }

    const state = Buffer.from(JSON.stringify({ employeeId, orgId })).toString('base64');

    const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId || '');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('owner', 'user');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error starting Notion OAuth flow:', error);
    return NextResponse.json({ error: error.message || 'OAuth error' }, { status: 500 });
  }
}
