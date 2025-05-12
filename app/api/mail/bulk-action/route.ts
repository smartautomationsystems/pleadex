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

    const { emailIds, action, folder } = await request.json();

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: 'Invalid email IDs' }, { status: 400 });
    }

    if (!['read', 'unread', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!['inbox', 'sent', 'drafts', 'trash'].includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    switch (action) {
      case 'read':
        await db.collection('emails').updateMany(
          {
            _id: { $in: emailIds },
            userId: session.user.id,
            folder
          },
          { $set: { read: true } }
        );
        break;

      case 'unread':
        await db.collection('emails').updateMany(
          {
            _id: { $in: emailIds },
            userId: session.user.id,
            folder
          },
          { $set: { read: false } }
        );
        break;

      case 'delete':
        if (folder === 'trash') {
          // Permanently delete from trash
          await db.collection('emails').deleteMany({
            _id: { $in: emailIds },
            userId: session.user.id,
            folder: 'trash'
          });
        } else {
          // Move to trash
          await db.collection('emails').updateMany(
            {
              _id: { $in: emailIds },
              userId: session.user.id,
              folder
            },
            { $set: { folder: 'trash' } }
          );
        }
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 