import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';
import { CaseEvent } from '@/models/case';

// GET /api/cases/[id]/events - Get all events for a case
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const caseDoc = await db.collection('cases').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(session.user.id)
    });

    if (!caseDoc) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ events: caseDoc.events || [] });
  } catch (error) {
    console.error('Error fetching case events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case events' },
      { status: 500 }
    );
  }
}

// POST /api/cases/[id]/events - Add a new event to a case
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, type, title, description, aiSuggested = false } = await request.json();

    if (!date || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verify the case exists and belongs to the user
    const caseDoc = await db.collection('cases').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(session.user.id)
    });

    if (!caseDoc) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify the event type exists in globals
    const eventType = await db.collection('globals').findOne({
      type: 'caseEvent',
      key: type
    });

    if (!eventType) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const newEvent: CaseEvent = {
      date,
      type,
      title,
      description,
      aiSuggested,
      createdBy: aiSuggested ? 'ai' : session.user.id
    };

    // Add the event to the case's events array
    await db.collection('cases').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $push: { events: newEvent },
        $set: { updatedAt: new Date() }
      }
    );

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    console.error('Error adding case event:', error);
    return NextResponse.json(
      { error: 'Failed to add case event' },
      { status: 500 }
    );
  }
}

// PUT /api/cases/[id]/events - Update an event in a case
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, type, title, description, eventIndex } = await request.json();

    if (!date || !type || !title || typeof eventIndex !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verify the case exists and belongs to the user
    const caseDoc = await db.collection('cases').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(session.user.id)
    });

    if (!caseDoc) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify the event type exists in globals
    const eventType = await db.collection('globals').findOne({
      type: 'caseEvent',
      key: type
    });

    if (!eventType) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Update the specific event in the array
    await db.collection('cases').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          [`events.${eventIndex}`]: {
            date,
            type,
            title,
            description,
            aiSuggested: caseDoc.events[eventIndex].aiSuggested,
            createdBy: caseDoc.events[eventIndex].createdBy
          },
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating case event:', error);
    return NextResponse.json(
      { error: 'Failed to update case event' },
      { status: 500 }
    );
  }
}

// DELETE /api/cases/[id]/events - Delete an event from a case
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventIndex = searchParams.get('eventIndex');

    if (!eventIndex) {
      return NextResponse.json(
        { error: 'Missing event index' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verify the case exists and belongs to the user
    const caseDoc = await db.collection('cases').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(session.user.id)
    });

    if (!caseDoc) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Remove the event from the array using $unset and $pull
    await db.collection('cases').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $unset: { [`events.${eventIndex}`]: 1 }
      }
    );

    await db.collection('cases').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $pull: { events: null },
        $set: { updatedAt: new Date() }
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting case event:', error);
    return NextResponse.json(
      { error: 'Failed to delete case event' },
      { status: 500 }
    );
  }
} 