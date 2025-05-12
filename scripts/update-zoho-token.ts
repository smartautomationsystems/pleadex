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

async function updateZohoToken() {
  const { db } = await connectToDatabase();
  await db.collection<ZohoToken>('zoho_tokens').updateOne(
    { _id: 'pleadex-admin' },
    {
      $set: {
        refresh_token: '1000.67ccaa6d9adf9f0f0a7d31a66df4a04f.aa304e4bca905542054f1cad9860b3c8',
        scopes: [
          'ZohoMail.accounts.READ',
          'ZohoMail.messages.READ',
          'ZohoMail.messages.CREATE',
          'ZohoMail.organization.accounts.READ',
          'ZohoMail.organization.accounts.CREATE'
        ],
        updatedAt: new Date(),
      }
    }
  );
  console.log('✅ Zoho refresh token and scopes updated in MongoDB');
  process.exit(0);
}

updateZohoToken(); 