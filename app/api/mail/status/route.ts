import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ enabled: false }, { status: 401 });
    }
    const { db } = await connectToDatabase();
    const userEmail = await db.collection('userEmails').findOne({ userId: session.user.id });
    if (userEmail && userEmail.email) {
      return NextResponse.json({ enabled: true, emailAddress: userEmail.email });
    }
    return NextResponse.json({ enabled: false });
  } catch (error) {
    return NextResponse.json({ enabled: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 