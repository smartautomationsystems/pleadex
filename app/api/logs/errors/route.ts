import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Get the most recent 50 error logs
    const logs = await db
      .collection('errorLogs')
      .find()
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get error log ID from URL
    const errorId = request.url.split('/').pop();
    if (!errorId) {
      return NextResponse.json(
        { error: 'Error ID is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Update the error log
    const result = await db.collection('errorLogs').updateOne(
      { _id: new ObjectId(errorId) },
      {
        $set: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: session.user.email
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Error log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating error log:', error);
    return NextResponse.json(
      { error: 'Failed to update error log' },
      { status: 500 }
    );
  }
} 