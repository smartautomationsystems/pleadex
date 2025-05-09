import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';
import { getSignedUrlForDocument } from '@/libs/storage';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing form ID' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const form = await db.collection('forms').findOne({ _id: new ObjectId(id) });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (!form.s3Key) {
      return NextResponse.json({ error: 'No S3 file found for this form' }, { status: 404 });
    }

    const url = await getSignedUrlForDocument(form.s3Key);
    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error('Error downloading form:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 