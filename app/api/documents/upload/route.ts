import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
    console.log('Starting document upload process...');

    // Check AWS configuration
    const requiredEnvVars = {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION,
      AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('Missing AWS environment variables:', missingVars);
      return NextResponse.json(
        { error: `Missing AWS configuration: ${missingVars.join(', ')}` },
        { status: 500 }
      );
    }

    console.log('AWS Configuration:', {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('Unauthorized: No session or user ID found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', session.user.email);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, PNG, and JPG files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      console.error('File size exceeds limit:', file.size);
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Get file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('File converted to buffer, size:', buffer.length);

    // Generate a unique key for the file
    const fileExtension = file.name.split('.').pop();
    const key = `${session.user.email}/${uuidv4()}.${fileExtension}`;
    console.log('Generated S3 key:', key);

    try {
      // Upload to S3
      console.log('Attempting S3 upload...');
      const s3Url = await uploadToS3(buffer, key, file.type);
      console.log('S3 upload successful:', s3Url);

      // Connect to MongoDB
      console.log('Connecting to MongoDB...');
      const { db } = await connectToDatabase();

      // Create document record
      const document: Document = {
        userId: new ObjectId(session.user.id),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
        status: 'pending',
        s3Key: key,
        s3Url: s3Url,
        content: null
      };

      console.log('Creating MongoDB document...');
      const result = await db.collection('documents').insertOne(document);
      console.log('MongoDB document created:', result.insertedId);

      // Trigger OCR processing
      console.log('Triggering OCR processing...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/documents/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: result.insertedId.toString()
        })
      });

      if (!response.ok) {
        console.error('Failed to trigger OCR processing:', await response.text());
      }

      return NextResponse.json({ success: true, documentId: result.insertedId });
    } catch (error) {
      console.error('Error during document upload:', error);
      return NextResponse.json(
        { error: 'Failed to upload document' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 