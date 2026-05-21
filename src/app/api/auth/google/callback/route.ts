import { NextResponse } from 'next/server';
import { google } from 'googleapis';
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

    // Decode employee metadata passed from initiation
    const { employeeId, orgId } = JSON.parse(Buffer.from(stateBase64, 'base64').toString('utf-8'));

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getOAuthRedirectUri('google', request)
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Retrieve user details from Google API profile
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const profile = await oauth2.userinfo.get();

    // Serialize tokens to store securely
    const tokenString = JSON.stringify(tokens);

    // Upsert employee details and tokens in Supabase
    const { error: dbError } = await supabase.from('brain_employees').upsert(
      {
        org_id: orgId,
        employee_id: employeeId,
        name: profile.data.name || employeeId,
        email: profile.data.email || '',
        gmail_token: tokenString,
        last_synced: new Date().toISOString(),
      },
      { onConflict: 'employee_id' }
    );

    if (dbError) {
      console.error('Database Error storing Google tokens:', dbError);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    // Redirect to the Admin sweep dashboard with confirmation parameters
    const redirectUrl = new URL('/admin/sweep', request.url);
    redirectUrl.searchParams.set('connected', 'gmail');
    redirectUrl.searchParams.set('employee', employeeId);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Error in Google OAuth callback:', error);
    const redirectUrl = new URL('/admin/sweep', request.url);
    redirectUrl.searchParams.set('error', 'google_auth_failed');
    return NextResponse.redirect(redirectUrl);
  }
}
