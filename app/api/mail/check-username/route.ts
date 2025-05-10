import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

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
    
    // Check if username is available
    const existingEmail = await db.collection('userEmails').findOne({
      email: `${username}@pleadex.com`,
    });

    return NextResponse.json({
      available: !existingEmail,
      message: existingEmail ? 'Username is already taken' : 'Username is available',
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 