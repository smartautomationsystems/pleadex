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

    const { db } = await connectToDatabase();
    
    // Get the form first to ensure it exists
    const form = await db.collection('forms').findOne({ _id: new ObjectId(formId) });
    if (!form) {
      console.error('Form not found:', formId);
      return new NextResponse('Form not found', { status: 404 });
    }

    // Process the form with OCR and wait for completion
    const result = await processFormWithOCR(formId, userId);
    
    if (!result.success) {
      console.error('OCR processing failed:', result);
      return new NextResponse('OCR processing failed', { status: 500 });
    }

    console.log('OCR processing completed successfully with fields:', result.fields?.length);

    // Trigger field matching process
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_BASE_URL;

    const fieldMatchingResponse = await fetch(`${baseUrl}/api/forms/process-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify({
        formId,
        userId
      }),
    });

    if (!fieldMatchingResponse.ok) {
      console.error('Field matching failed:', await fieldMatchingResponse.text());
      return new NextResponse('Field matching failed', { status: 500 });
    }

    const fieldMatchingResult = await fieldMatchingResponse.json();
    console.log('Field matching completed successfully');

    return NextResponse.json({
      success: true,
      fields: result.fields,
      matches: fieldMatchingResult.matches
    });
  } catch (error) {
    console.error('OCR processing error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 