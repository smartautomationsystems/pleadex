import { getSignedUrlForDocument } from './storage';
import { connectToDatabase } from './mongo';
import { ObjectId } from 'mongodb';

export async function processDocument(documentId: string, type: string): Promise<string> {
    try {
        // Get the signed URL for the document
        const signedUrl = await getSignedUrlForDocument(documentId);
        if (!signedUrl) {
            throw new Error('Failed to get signed URL for document');
        }

        // Fetch the document content
        const response = await fetch(signedUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch document content');
        }
        const buffer = await response.arrayBuffer();

        // Send to Modal OCR endpoint
        const modalResponse = await fetch('https://bcolombana--ocr-service-process-document.modal.run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: buffer,
        });

        if (!modalResponse.ok) {
            const errorText = await modalResponse.text();
            throw new Error(`Modal OCR request failed: ${errorText}`);
        }

        const result = await modalResponse.json();
        return result.text;
    } catch (error) {
        console.error('Error processing document:', error);
        throw error;
    }
}

export async function processDocumentWithOCR(documentId: string, userId: string) {
  try {
    console.log('Starting OCR processing for document:', { documentId, userId });

    // Get the document from MongoDB
    const { db } = await connectToDatabase();
    const document = await db.collection('documents').findOne({
      _id: new ObjectId(documentId),
      userId
    });

    if (!document) {
      console.error('Document not found for OCR processing:', { documentId, userId });
      throw new Error('Document not found');
    }

    console.log('Retrieved document for OCR:', {
      documentId,
      type: document.type,
      s3Key: document.s3Key
    });

    // Get signed URL for the document
    const signedUrl = await getSignedUrlForDocument(document.s3Key);
    console.log('Generated signed URL for document');

    // Call Modal OCR endpoint
    console.log('Calling Modal OCR endpoint:', {
      endpoint: process.env.MODAL_OCR_ENDPOINT,
      hasApiKey: !!process.env.MODAL_API_KEY
    });

    const response = await fetch(process.env.MODAL_OCR_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MODAL_API_KEY}`
      },
      body: JSON.stringify({
        url: signedUrl,
        type: document.type.toLowerCase() // Ensure type is lowercase
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Modal OCR request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OCR processing failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      console.error('Modal OCR returned error:', result.error);
      throw new Error(`OCR processing failed: ${result.error}`);
    }

    console.log('Successfully processed document with OCR');

    // Update document with extracted text
    await db.collection('documents').updateOne(
      { _id: new ObjectId(documentId) },
      {
        $set: {
          content: result.text,
          status: 'completed',
          updatedAt: new Date()
        }
      }
    );

    return result.text;
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Update document status to failed
    const { db } = await connectToDatabase();
    await db.collection('documents').updateOne(
      { _id: new ObjectId(documentId) },
      {
        $set: {
          status: 'failed',
          updatedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    );
    
    throw error;
  }
} 