import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { supabase } from '@/lib/db';
import { getOAuthRedirectUri } from '@/lib/oauthRedirects';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateBase64 = searchParams.get('state');

    if (!code || !stateBase64) {
      return NextResponse.json({ error: 'OAuth code and state parameters are required' }, { status: 400 });
    }

    const { employeeId, orgId } = JSON.parse(Buffer.from(stateBase64, 'base64').toString('utf-8'));

    const slackClient = new WebClient();
    const result = await slackClient.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID || '',
      client_secret: process.env.SLACK_CLIENT_SECRET || '',
      code: code,
      redirect_uri: getOAuthRedirectUri('slack', request),
    });

    if (!result.ok) {
      throw new Error(result.error || 'Failed to exchange Slack authorization code');
    }

    // Access token is at top-level for bot flows, or nested in authed_user for user flows
    const slackToken = result.access_token || result.authed_user?.access_token;
    if (!slackToken) {
      throw new Error('No access token was returned by Slack');
    }

    // Upsert the Slack token in Supabase
    const { error: dbError } = await supabase.from('brain_employees').upsert(
      {
        org_id: orgId,
        employee_id: employeeId,
        slack_token: slackToken,
        last_synced: new Date().toISOString(),
      },
      { onConflict: 'employee_id' }
    );

    if (dbError) {
      console.error('Database Error storing Slack tokens:', dbError);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    const redirectUrl = new URL('/admin/sweep', request.url);
    redirectUrl.searchParams.set('connected', 'slack');
    redirectUrl.searchParams.set('employee', employeeId);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Error in Slack OAuth callback:', error);
    const redirectUrl = new URL('/admin/sweep', request.url);
    redirectUrl.searchParams.set('error', 'slack_auth_failed');
    return NextResponse.redirect(redirectUrl);
  }
}
