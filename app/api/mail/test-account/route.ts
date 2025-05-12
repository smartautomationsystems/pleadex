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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Zoho access token
    const accessToken = await getZohoAccessToken();

    // Fetch accounts from Zoho
    const response = await axios.get(
      'https://mail.zoho.com/api/accounts',
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Zoho Accounts Response:', response.data);

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching accounts:', error.response?.data || error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 