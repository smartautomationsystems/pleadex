import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { connectToDatabase } from '@/libs/mongo';
import { uploadToS3 } from '@/libs/storage';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

interface Document {
  userId: ObjectId;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  s3Key: string;
  s3Url: string;
  content: string | null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024;
    if (!allowedTypes.includes(file.type) || file.size > maxSize) {
      return NextResponse.json({ error: 'Invalid file type or size exceeds 10MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${session.user.email}/${uuidv4()}.${file.name.split('.').pop()}`;

    const [uploadResult, dbConnection] = await Promise.all([
      uploadToS3(buffer, key, file.type),
      connectToDatabase(),
    ]);

    const document: Document = {
      userId: new ObjectId(session.user.id),
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date(),
      status: 'pending',
      s3Key: uploadResult.key,
      s3Url: uploadResult.url,
      content: null,
    };

    const result = await dbConnection.db.collection('documents').insertOne(document);

    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_BASE_URL;

    // Update document status to processing immediately
    await dbConnection.db.collection('documents').updateOne(
      { _id: result.insertedId },
      { $set: { status: 'processing' } }
    );

    fetch(`${baseUrl}/api/documents/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify({
        documentId: result.insertedId.toString(),
        userId: session.user.id
      }),
    }).catch(err => console.error('OCR trigger failed silently:', err));

    return NextResponse.json({ success: true, documentId: result.insertedId });
  } catch (error) {
    console.error('Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 