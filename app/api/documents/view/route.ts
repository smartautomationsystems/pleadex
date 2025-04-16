import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { getSignedUrlForDocument } from '@/libs/storage';
import { connectToDatabase } from '@/libs/mongo';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    console.log('Starting document view process...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('View failed: No valid session or user ID found');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log(`View request from user: ${session.user.id}`);

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    if (!documentId) {
      console.error('View failed: No document ID provided');
      return new NextResponse('Document ID is required', { status: 400 });
    }

    console.log(`Attempting to view document: ${documentId}`);

    const { db } = await connectToDatabase();
    console.log('Successfully connected to database');

    const document = await db.collection('documents').findOne({
      _id: new ObjectId(documentId),
      userId: new ObjectId(session.user.id),
    });

    if (!document) {
      console.error(`View failed: Document ${documentId} not found for user ${session.user.id}`);
      return new NextResponse('Document not found', { status: 404 });
    }

    console.log(`Document found: ${documentId}, S3 key: ${document.s3Key}`);

    try {
      const signedUrl = await getSignedUrlForDocument(document.s3Key);
      console.log('Successfully generated signed URL for document');
      
      // Return the signed URL and document content
      return NextResponse.json({
        url: signedUrl,
        content: document.content
      });
    } catch (s3Error) {
      console.error('S3 URL generation failed:', {
        error: s3Error,
        documentId,
        s3Key: document.s3Key,
        userId: session.user.id
      });
      return new NextResponse('Failed to generate view URL', { status: 500 });
    }
  } catch (error) {
    console.error('View process failed:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 