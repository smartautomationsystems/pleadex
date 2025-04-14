import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/libs/mongo';
import { ObjectId } from 'mongodb';
import { processDocument } from '@/libs/ocr';

export async function POST(request: Request) {
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
        const document = await db.collection('documents').findOne({
            _id: new ObjectId(documentId),
            userId: new ObjectId(session.user.id)
        });

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Process the document with OCR
        const text = await processDocument(documentId, document.type);

        // Update the document with the extracted text
        await db.collection('documents').updateOne(
            { _id: new ObjectId(documentId) },
            { 
                $set: { 
                    content: text,
                    status: 'completed'
                } 
            }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing document:', error);
        return NextResponse.json(
            { error: 'Failed to process document' },
            { status: 500 }
        );
    }
} 