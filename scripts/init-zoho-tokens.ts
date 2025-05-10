import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { connectToDatabase } from '../lib/mongodb';

interface ZohoToken {
  _id: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

async function initZohoTokens() {
  try {
    const { db } = await connectToDatabase();

    // Check if tokens already exist
    const existingTokens = await db.collection<ZohoToken>('zoho_tokens').findOne({ 
      _id: 'pleadex-admin'
    });
    
    if (existingTokens) {
      console.log('Zoho tokens already exist in the database');
      return;
    }

    // Insert initial token document
    await db.collection<ZohoToken>('zoho_tokens').insertOne({
      _id: 'pleadex-admin',
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
      scopes: [
        'ZohoMail.organization.accounts.CREATE',
        'ZohoMail.organization.accounts.READ',
        'ZohoMail.organization.accounts.UPDATE',
        'ZohoMail.organization.accounts.DELETE'
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Successfully initialized Zoho tokens in MongoDB');
  } catch (error) {
    console.error('Error initializing Zoho tokens:', error);
    process.exit(1);
  }
}

// Run the initialization
initZohoTokens(); 