import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { connectToDatabase } from '../lib/mongodb';

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

async function testTokenRefresh() {
  try {
    const { db } = await connectToDatabase();
    
    // Get the stored tokens
    const tokens = await db.collection<ZohoToken>('zoho_tokens').findOne({ 
      _id: 'pleadex-admin'
    });

    if (!tokens) {
      console.log('No Zoho tokens found in the database');
      return;
    }

    console.log('Attempting to refresh token with:');
    console.log('Client ID:', tokens.client_id);
    console.log('Refresh Token:', tokens.refresh_token); // Temporarily showing the actual token

    // Try to refresh the token
    const params = new URLSearchParams({
      refresh_token: tokens.refresh_token,
      client_id: tokens.client_id,
      client_secret: tokens.client_secret,
      grant_type: 'refresh_token',
    });

    console.log('\nMaking refresh request to Zoho...');
    const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await res.json();
    
    // Log response body first to ensure we see it
    console.log('\nResponse body:', JSON.stringify(data, null, 2));
    console.log('\nResponse status:', res.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2));

    if (!res.ok) {
      console.error('\nToken refresh failed with status:', res.status);
      console.error('Error details:', data);
      return;
    }

    if (!data.access_token) {
      console.error('\nNo access token in response');
      return;
    }

    // Update the stored token
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

    console.log('\nToken refresh successful!');
    console.log('New access token expires at:', expiresAt);
  } catch (error) {
    console.error('Error during token refresh:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testTokenRefresh(); 