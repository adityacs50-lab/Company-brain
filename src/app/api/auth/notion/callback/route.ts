import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { decodeOAuthState, getOAuthRedirectUri, getPostAuthErrorRedirectUrl, getPostAuthRedirectUrl } from '@/lib/oauthRedirects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateBase64 = searchParams.get('state');

    if (!code || !stateBase64) {
      return NextResponse.json({ error: 'OAuth code and state parameters are required' }, { status: 400 });
    }

    const oauthState = decodeOAuthState(stateBase64);
    const { employeeId, orgId } = oauthState;

    const clientId = process.env.NOTION_CLIENT_ID || '';
    const clientSecret = process.env.NOTION_CLIENT_SECRET || '';
    const redirectUri = getOAuthRedirectUri('notion', request);

    // Notion requires standard HTTP Basic Auth header for token exchange
    const authorizationHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authorizationHeader}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error_description || result.error || 'Failed to exchange Notion authorization code');
    }

    const notionToken = result.access_token;
    const workspaceId = result.workspace_id;

    if (!notionToken) {
      throw new Error('No access token returned in Notion response');
    }

    // Upsert Notion token in Supabase
    const { error: dbError } = await supabase.from('brain_employees').upsert(
      {
        org_id: orgId,
        employee_id: employeeId,
        notion_token: notionToken,
        notion_workspace_id: workspaceId,
        last_synced: new Date().toISOString(),
      },
      { onConflict: 'employee_id' }
    );

    if (dbError) {
      console.error('Database Error storing Notion tokens:', dbError);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    const redirectUrl = getPostAuthRedirectUrl(request, oauthState);
    redirectUrl.searchParams.set('connected', 'notion');
    redirectUrl.searchParams.set('employee', employeeId);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Error in Notion OAuth callback:', error);
    const redirectUrl = getPostAuthErrorRedirectUrl(request);
    redirectUrl.searchParams.set('error', 'notion_auth_failed');
    return NextResponse.redirect(redirectUrl);
  }
}
