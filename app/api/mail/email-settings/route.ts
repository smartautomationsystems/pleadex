import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userEmail = await db.collection('userEmails').findOne({ userId: session.user.id });

    if (!userEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Get email settings from the database
    const emailSettings = {
      email: userEmail.email,
      displayName: userEmail.displayName || '',
      role: userEmail.role || 'member',
      country: userEmail.country || '',
      language: userEmail.language || 'en',
      timeZone: userEmail.timeZone || 'UTC',
    };

    return NextResponse.json({ emailSettings });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userEmail = await db.collection('userEmails').findOne({ userId: session.user.id });

    if (!userEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const body = await req.json();
    const { displayName, role, country, language, timeZone } = body;

    // Update email settings in the database
    await db.collection('userEmails').updateOne(
      { userId: session.user.id },
      {
        $set: {
          displayName,
          role,
          country,
          language,
          timeZone,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ message: 'Email settings updated successfully' });
  } catch (error) {
    console.error('Error updating email settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 