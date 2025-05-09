import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const form = await db.collection('forms').findOne({
      _id: new ObjectId(params.id),
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // TODO: Implement file download from storage service
    // For now, we'll just return a placeholder response
    return new NextResponse('File content would be here', {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${form.name}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading form:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 