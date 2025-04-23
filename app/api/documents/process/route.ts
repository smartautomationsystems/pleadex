import { NextResponse } from 'next/server';
import { processDocumentWithOCR } from '@/libs/ocr';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    console.log('OCR process triggered');
    
    // Check for API key in Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      console.error('Unauthorized OCR process attempt');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { documentId, userId } = await request.json();
    console.log('Processing document:', { documentId, userId });

    if (!documentId || !userId) {
      console.error('Missing required fields:', { documentId, userId });
      return new NextResponse('Document ID and User ID are required', { status: 400 });
    }

    // Process the document with OCR and wait for completion
    const result = await processDocumentWithOCR(documentId, userId);
    
    if (!result.success) {
      console.error('OCR processing failed:', result);
      return new NextResponse('OCR processing failed', { status: 500 });
    }

    console.log('OCR processing completed successfully with text:', result.text?.length);
    return NextResponse.json({ success: true, text: result.text });
  } catch (error) {
    console.error('OCR processing error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 