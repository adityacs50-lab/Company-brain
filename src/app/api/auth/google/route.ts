import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const orgId = searchParams.get('org_id') || 'org_123';

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id parameter is required' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Save metadata in OAuth state to process in the callback
    const state = Buffer.from(JSON.stringify({ employeeId, orgId })).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent screen to guarantee refresh token is returned
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state: state,
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error starting Google OAuth flow:', error);
    return NextResponse.json({ error: error.message || 'OAuth error' }, { status: 500 });
  }
}
