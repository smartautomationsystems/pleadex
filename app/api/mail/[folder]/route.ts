import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

async function getZohoAccessToken() {
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = process.env;

  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN!,
    client_id: ZOHO_CLIENT_ID!,
    client_secret: ZOHO_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  });

  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', params);
    return response.data.access_token;
  } catch (error) {
    console.error('Error refreshing Zoho token:', error);
    throw error;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { folder: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folder = params.folder;
    if (!['inbox', 'sent', 'drafts', 'trash'].includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    // Get Zoho access token
    const accessToken = await getZohoAccessToken();

    // Map our folder names to Zoho's folder IDs
    const folderMap: { [key: string]: string } = {
      inbox: 'INBOX',
      sent: 'SENT',
      drafts: 'DRAFTS',
      trash: 'TRASH'
    };

    const accountId = '4589235000000008002'; // Your Zoho account ID
    const apiUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderMap[folder]}/messages`;

    console.log('Fetching emails from:', apiUrl);

    // Fetch emails from Zoho
    const response = await axios.get(
      apiUrl,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 50,
          sort: 'date:desc'
        }
      }
    );

    console.log('Zoho API Response:', response.data);

    // Transform Zoho's response to match our email format
    const emails = response.data.data.map((email: any) => ({
      id: email.id,
      from: email.from.address,
      subject: email.subject,
      preview: email.preview,
      date: email.date,
      read: !email.unread,
      attachments: email.attachments?.length > 0
    }));

    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error('Error fetching emails:', error.response?.data || error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.response?.data },
      { status: 500 }
    );
  }
} 