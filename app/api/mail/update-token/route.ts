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

    const { refreshToken } = await request.json();
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Update the refresh token in the userEmails collection
    const result = await db.collection('userEmails').updateOne(
      { userId: session.user.id },
      { 
        $set: { 
          refreshToken,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('Token update result:', result);

    return NextResponse.json({ 
      success: true, 
      message: 'Refresh token updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating refresh token:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 