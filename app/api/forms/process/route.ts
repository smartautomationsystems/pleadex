import { NextResponse } from "next/server";
import { processFormWithOCR } from "@/libs/form-ocr";
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  try {
    console.log('Form OCR process triggered');
    
    // Check for API key in Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      console.error('Unauthorized form OCR process attempt');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { formId, userId } = await request.json();
    console.log('Processing form:', { formId, userId });

    if (!formId || !userId) {
      console.error('Missing required fields:', { formId, userId });
      return new NextResponse('Form ID and User ID are required', { status: 400 });
    }

    // Process the form with OCR and wait for completion
    const result = await processFormWithOCR(formId, userId);
    
    if (!result.success) {
      console.error('OCR processing failed:', result);
      return new NextResponse('OCR processing failed', { status: 500 });
    }

    console.log('OCR processing completed successfully with fields:', result.fields?.length);
    return NextResponse.json({ success: true, fields: result.fields });
  } catch (error) {
    console.error('OCR processing error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 