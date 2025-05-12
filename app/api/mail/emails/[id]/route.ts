import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid email ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // First, get the email to check its folder
    const email = await db.collection('emails').findOne({
      _id: new ObjectId(id),
      userId: session.user.id
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (email.folder === 'trash') {
      // If email is already in trash, delete it permanently
      await db.collection('emails').deleteOne({
        _id: new ObjectId(id),
        userId: session.user.id
      });
    } else {
      // Otherwise, move it to trash
      await db.collection('emails').updateOne(
        {
          _id: new ObjectId(id),
          userId: session.user.id
        },
        { $set: { folder: 'trash' } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 