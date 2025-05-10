import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { makeZohoRequest } from '@/lib/zoho';

// Zoho Mail API configuration
const ZOHO_DOMAIN = 'pleadex.com';

interface ZohoAccountResponse {
  id: string;
  email: string;
  status: string;
}

async function createZohoEmailAccount(username: string, userId: string): Promise<ZohoAccountResponse> {
  try {
    // Generate a secure random password that won't be used for direct login
    const securePassword = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create the email account in Zoho using the admin OAuth token
    return makeZohoRequest<ZohoAccountResponse>('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        email: `${username}@${ZOHO_DOMAIN}`,
        password: securePassword,
        displayName: username,
        domain: ZOHO_DOMAIN,
        // Disable direct login
        loginEnabled: false,
        // Set up forwarding to the user's primary email
        forwardingEnabled: true,
        forwardingAddress: userId, // This will be updated with the actual email
      }),
    });
  } catch (error) {
    console.error('Error creating Zoho email account:', error);
    throw new Error('Failed to create email account');
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { username } = await req.json();
    
    if (!username) {
      return NextResponse.json(
        { message: 'Username is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if user already has an email
    const existingEmail = await db.collection('userEmails').findOne({
      userId: session.user.id,
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: 'User already has an email account' },
        { status: 400 }
      );
    }

    // Check if username is available
    const usernameTaken = await db.collection('userEmails').findOne({
      email: `${username}@pleadex.com`,
    });

    if (usernameTaken) {
      return NextResponse.json(
        { message: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Create Zoho email account
    const zohoResponse = await createZohoEmailAccount(username, session.user.id);

    // Store email in database
    await db.collection('userEmails').insertOne({
      userId: session.user.id,
      email: `${username}@pleadex.com`,
      provider: 'zoho',
      providerId: zohoResponse.id,
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // TODO: Implement billing/subscription logic here
    // This would typically involve:
    // 1. Creating a subscription in your payment provider
    // 2. Setting up recurring billing
    // 3. Storing subscription details in the database

    return NextResponse.json({
      emailAddress: `${username}@pleadex.com`,
      message: 'Email account created successfully',
    });
  } catch (error) {
    console.error('Error enabling email:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 