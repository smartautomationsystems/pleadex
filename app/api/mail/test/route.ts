import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get user's email account
    const userEmail = await db.collection('userEmails').findOne({ 
      userId: session.user.id 
    });

    if (!userEmail) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Create a test email
    const testEmail = {
      from: 'test@pleadex.com',
      to: userEmail.email,
      subject: 'Test Email',
      content: 'This is a test email to verify the email system is working.',
      date: new Date(),
      folder: 'inbox',
      read: false
    };

    await db.collection('emails').insertOne(testEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating test email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 