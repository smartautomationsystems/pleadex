import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import axios from 'axios';

interface ZohoTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface ZohoToken {
  _id: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  access_token?: string;
  access_token_expires_at?: Date;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export async function getZohoAccessToken(): Promise<string> {
  const { db } = await connectToDatabase();
  const tokens = await db.collection<ZohoToken>('zoho_tokens').findOne({ 
    _id: 'pleadex-admin'
  });

  if (!tokens) {
    throw new Error('Zoho tokens not configured');
  }

  const now = new Date();

  if (tokens.access_token && tokens.access_token_expires_at && tokens.access_token_expires_at > now) {
    console.log('🔐 Access Token Used:', tokens.access_token);
    try {
      const tokenInfo = await axios.get('https://accounts.zoho.com/oauth/v2/token/info', {
        headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` }
      });
      console.log('🔍 Token Info:', tokenInfo.data);
    } catch (err) {
      console.error('Failed to fetch token info:', err?.response?.data || err);
    }
    return tokens.access_token;
  }

  // Token expired — refresh it
  const params = new URLSearchParams({
    refresh_token: tokens.refresh_token,
    client_id: tokens.client_id,
    client_secret: tokens.client_secret,
    grant_type: 'refresh_token',
  });

  const res = await fetch(process.env.ZOHO_TOKEN_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const data = await res.json();

  if (!data.access_token) {
    throw new Error('Failed to refresh Zoho access token');
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await db.collection<ZohoToken>('zoho_tokens').updateOne(
    { _id: 'pleadex-admin' },
    {
      $set: {
        access_token: data.access_token,
        access_token_expires_at: expiresAt,
        updatedAt: new Date()
      }
    }
  );

  console.log('🔐 Access Token Used:', data.access_token);
  try {
    const tokenInfo = await axios.get('https://accounts.zoho.com/oauth/v2/token/info', {
      headers: { Authorization: `Zoho-oauthtoken ${data.access_token}` }
    });
    console.log('🔍 Token Info:', tokenInfo.data);
  } catch (err) {
    console.error('Failed to fetch token info:', err?.response?.data || err);
  }

  return data.access_token;
}

export async function makeZohoRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getZohoAccessToken();

  const response = await fetch(`${process.env.ZOHO_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Zoho API error:', error);
    throw new Error(error.message || JSON.stringify(error) || 'Zoho API request failed');
  }

  return response.json();
}

// Example usage:
// const emails = await makeZohoRequest('/messages');
// const folders = await makeZohoRequest('/folders');
// const sendEmail = await makeZohoRequest('/messages', {
//   method: 'POST',
//   body: JSON.stringify({ /* email data */ }),
// }); 