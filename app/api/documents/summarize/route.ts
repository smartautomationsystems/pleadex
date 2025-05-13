import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';
import OpenAI from 'openai';

// Initialize OpenAI client only when needed
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const document = await db.collection('documents').findOne({
      _id: new ObjectId(documentId),
      userId: new ObjectId(session.user.id),
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (!document.content) {
      return NextResponse.json(
        { error: 'Document has no content to summarize' },
        { status: 400 }
      );
    }

    // Truncate content to stay within token limits
    const maxTokens = 4000; // Leave buffer for response
    const truncatedContent = document.content.slice(0, maxTokens * 4);

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a legal document summarizer. Provide a concise summary of the document, highlighting key points, arguments, and findings. Format the summary in clear paragraphs."
          },
          {
            role: "user",
            content: `Please summarize this legal document:\n\n${truncatedContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const summary = completion.choices[0].message.content;
      return NextResponse.json({ summary });
    } catch (error) {
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate summary: OpenAI API error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error summarizing document:', error);
    return NextResponse.json(
      { error: 'Failed to summarize document' },
      { status: 500 }
    );
  }
} 