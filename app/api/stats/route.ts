import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import User from '@/models/User';
import { Case } from '@/models/case';
import { Document } from '@/models/document';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Get total users count
    const totalUsers = await db.collection('users').countDocuments();

    // Get active users (users who have logged in within the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await db.collection('users').countDocuments({
      lastLogin: { $gte: thirtyDaysAgo }
    });

    // Get total cases count
    const totalCases = await db.collection('cases').countDocuments();

    // Get total documents count
    const totalDocuments = await db.collection('documents').countDocuments();

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalCases,
      totalDocuments
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 