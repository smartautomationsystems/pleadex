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
    const userSettings = await db.collection('userSettings').findOne({ userId: session.user.id });

    // If no settings exist, return default settings
    if (!userSettings) {
      return NextResponse.json({
        settings: {
          emailNotifications: false,
          caseUpdates: false,
          documentAlerts: false,
        }
      });
    }

    return NextResponse.json({ settings: userSettings.notifications });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
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
    const body = await req.json();
    const { emailNotifications, caseUpdates, documentAlerts, notificationEmail } = body;

    // Validate notification email if provided
    if (emailNotifications && notificationEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(notificationEmail)) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }
    }

    // Update or insert notification settings
    await db.collection('userSettings').updateOne(
      { userId: session.user.id },
      {
        $set: {
          notifications: {
            emailNotifications,
            caseUpdates,
            documentAlerts,
            notificationEmail,
            updatedAt: new Date(),
          }
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ message: 'Notification settings updated successfully' });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 