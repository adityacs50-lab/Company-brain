import { NextResponse } from 'next/server';
import { encodeOAuthState, getOAuthRedirectUri, getOAuthReturnTo } from '@/lib/oauthRedirects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const orgId = searchParams.get('org_id') || 'org_123';

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id parameter is required' }, { status: 400 });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = getOAuthRedirectUri('slack', request);

    if (!clientId || !redirectUri) {
      console.warn('Slack Client ID or Redirect URI is missing.');
    }

    const state = encodeOAuthState({ employeeId, orgId, returnTo: getOAuthReturnTo(request) });
    
    // Slack bot/user scopes required to scan communications and list channels
    const scopes = 'channels:read,users:read,channels:history';

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.set('client_id', clientId || '');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error starting Slack OAuth flow:', error);
    return NextResponse.json({ error: error.message || 'OAuth error' }, { status: 500 });
  }
}
