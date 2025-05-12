import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function refreshZohoToken() {
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_API_URL } = process.env;

  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN!,
    client_id: ZOHO_CLIENT_ID!,
    client_secret: ZOHO_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  });

  try {
    const response = await axios.post(ZOHO_API_URL!, params);
    console.log('🔍 Full Zoho Response:', response.data);
    console.log('✅ Access Token:', response.data.access_token);
  } catch (error: any) {
    console.error('❌ Refresh Failed:', error.response?.data || error.message);
  }
}

refreshZohoToken(); 