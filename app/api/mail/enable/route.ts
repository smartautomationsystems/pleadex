import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getZohoAccessToken } from '@/lib/zoho';

// Zoho Mail API configuration
const ZOHO_DOMAIN = 'pleadex.com';
const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID!;

interface ZohoAccountResponse {
  accountId: string;
  primaryEmailAddress: string;
}

async function createZohoEmailUser({ username, firstName, lastName, password }: { username: string, firstName: string, lastName: string, password: string }) {
  const accessToken = await getZohoAccessToken();
  const primaryEmailAddress = `${username}@${ZOHO_DOMAIN}`;
  const payload = {
    primaryEmailAddress,
    password,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    role: 'member',
    country: 'us',
    language: 'en',
    timeZone: 'America/Los_Angeles',
    oneTimePassword: false
    // Add more fields as needed
  };
  const userRes = await fetch(`https://mail.zoho.com/api/organization/${ZOHO_ORG_ID}/accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const userData = await userRes.json();
  if (!userRes.ok) {
    throw new Error(userData.message || JSON.stringify(userData));
  }
  return userData;
}

function generateZohoPassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '!@#$%^&*()_+-=';
  const all = upper + lower + numbers + specials;
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specials[Math.floor(Math.random() * specials.length)];
  for (let i = 4; i < 16; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password;
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

    // Fetch user's firstName and lastName from DB
    const userDoc = await db.collection('users').findOne({ _id: session.user.id ? (typeof session.user.id === 'string' ? new (require('mongodb').ObjectId)(session.user.id) : session.user.id) : undefined });
    if (!userDoc || !userDoc.firstName || !userDoc.lastName) {
      return NextResponse.json(
        { message: 'User profile missing firstName or lastName' },
        { status: 400 }
      );
    }
    const firstName = userDoc.firstName;
    const lastName = userDoc.lastName;

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
      email: `${username}@${ZOHO_DOMAIN}`,
    });
    if (usernameTaken) {
      return NextResponse.json(
        { message: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Generate a strong Zoho-compliant password
    const securePassword = generateZohoPassword();

    // Create Zoho email user
    const zohoResponse = await createZohoEmailUser({ username, firstName, lastName, password: securePassword });

    // Store email in database
    await db.collection('userEmails').insertOne({
      userId: session.user.id,
      email: `${username}@${ZOHO_DOMAIN}`,
      provider: 'zoho',
      providerId: zohoResponse.data?.userId || '',
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      zohoPassword: securePassword, // Store for internal use only
    });

    // TODO: Implement billing/subscription logic here
    // This would typically involve:
    // 1. Creating a subscription in your payment provider
    // 2. Setting up recurring billing
    // 3. Storing subscription details in the database

    return NextResponse.json({
      emailAddress: `${username}@${ZOHO_DOMAIN}`,
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