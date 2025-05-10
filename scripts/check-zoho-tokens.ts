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

async function checkZohoTokens() {
  try {
    const { db } = await connectToDatabase();
    
    const tokens = await db.collection<ZohoToken>('zoho_tokens').findOne({ 
      _id: 'pleadex-admin'
    });

    if (!tokens) {
      console.log('No Zoho tokens found in the database');
      return;
    }

    console.log('Found Zoho tokens:');
    console.log('------------------');
    console.log('Client ID:', tokens.client_id);
    console.log('Client Secret:', tokens.client_secret);
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('Access Token:', tokens.access_token);
    console.log('Access Token Expires At:', tokens.access_token_expires_at);
    console.log('Scopes:', tokens.scopes);
    console.log('Created At:', tokens.createdAt);
    console.log('Updated At:', tokens.updatedAt);
  } catch (error) {
    console.error('Error checking Zoho tokens:', error);
    process.exit(1);
  }
}

// Run the check
checkZohoTokens(); 