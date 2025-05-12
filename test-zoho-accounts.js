const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config({ path: '.env.local' });

async function getAccessToken() {
  const {
    ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN,
    ZOHO_TOKEN_URL
  } = process.env;
  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  const res = await axios.post(ZOHO_TOKEN_URL, params);
  return res.data.access_token;
}

async function testZohoAccounts() {
  try {
    const accessToken = await getAccessToken();
    const res = await axios.get('https://mail.zoho.com/api/accounts', {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    console.log('Zoho /accounts response:', res.data);
    if (res.data.data && res.data.data[0] && res.data.data[0].accountId) {
      await testCreateUser(accessToken, res.data.data[0].accountId);
    }
  } catch (error) {
    if (error.response) {
      console.error('Zoho /accounts error:', error.response.data);
    } else {
      console.error('Request error:', error.message);
    }
  }
}

async function testCreateUser(accessToken, accountId) {
  try {
    const payload = {
      firstName: 'Brian',
      lastName: 'Colombana',
      emailId: 'bcolombana',
      password: 'TestPassword123!',
      role: 'User',
    };
    const res = await axios.post(`https://mail.zoho.com/api/accounts/${accountId}/users`, payload, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('User creation response:', res.data);
  } catch (error) {
    if (error.response) {
      console.error('User creation error:', error.response.data);
    } else {
      console.error('Request error:', error.message);
    }
  }
}

async function testZohoOrganization() {
  try {
    const accessToken = await getAccessToken();
    const res = await axios.get('https://mail.zoho.com/api/organization', {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    console.log('Zoho /organization response:', res.data);
  } catch (error) {
    if (error.response) {
      console.error('Zoho /organization error:', error.response.data);
    } else {
      console.error('Request error:', error.message);
    }
  }
}

testZohoAccounts();
testZohoOrganization(); 