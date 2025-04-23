import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';
import { deleteObject } from '@/libs/storage';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('Documents API - Session:', session);
    
    if (!session?.user?.id) {
      console.log('Documents API - No user ID in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    console.log('Documents API - User ID:', session.user.id);
    
    const documents = await db
      .collection('documents')
      .find({ userId: new ObjectId(session.user.id) })
      .sort({ uploadedAt: -1 })
      .toArray();

    console.log('Documents API - Found documents:', documents);
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // First, get the document to verify ownership and get the S3 key
    const document = await db.collection('documents').findOne({
      _id: new ObjectId(documentId),
      userId: new ObjectId(session.user.id)
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from S3
    try {
      await deleteObject(document.s3Key);
    } catch (error) {
      console.error('Error deleting from S3:', error);
      // Continue with MongoDB deletion even if S3 deletion fails
    }

    // Delete from MongoDB
    await db.collection('documents').deleteOne({
      _id: new ObjectId(documentId),
      userId: new ObjectId(session.user.id)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
} 