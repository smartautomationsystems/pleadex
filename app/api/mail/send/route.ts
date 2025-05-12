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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const to = formData.get('to') as string;
    const cc = formData.get('cc') as string;
    const bcc = formData.get('bcc') as string;
    const subject = formData.get('subject') as string;
    const content = formData.get('content') as string;
    const attachments = formData.getAll('attachments') as File[];

    // Get Zoho access token
    const accessToken = await getZohoAccessToken();

    // Prepare attachments
    const attachmentPromises = attachments.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      return {
        filename: file.name,
        content: buffer.toString('base64'),
        contentType: file.type
      };
    });

    const processedAttachments = await Promise.all(attachmentPromises);

    // Send email through Zoho
    const response = await axios.post(
      `${process.env.ZOHO_API_URL}/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages`,
      {
        toAddress: to,
        ccAddress: cc || undefined,
        bccAddress: bcc || undefined,
        subject,
        content,
        attachments: processedAttachments
      },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Zoho API Response:', response.data);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending email:', error.response?.data || error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 