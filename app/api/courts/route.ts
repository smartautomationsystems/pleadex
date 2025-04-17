import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { connectToDatabase } from '@/libs/mongo';
import { Court, UserCourtOverride } from '@/models/court';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const jurisdiction = searchParams.get('jurisdiction');
    const state = searchParams.get('state');
    const county = searchParams.get('county');

    const { db } = await connectToDatabase();

    let query: any = {};
    if (search) {
      query.$text = { $search: search };
    }
    if (jurisdiction) {
      query.jurisdiction = jurisdiction;
    }
    if (state) {
      query.courtState = state;
    }
    if (county) {
      query.courtCounty = county;
    }

    const courts = await db.collection('courts').find(query).toArray();

    // Get user overrides
    const overrides = await db.collection('usercourtoverrides')
      .find({ userId: session.user.id })
      .toArray();

    // Merge overrides with courts
    const courtsWithOverrides = courts.map(court => {
      const override = overrides.find(o => o.courtId === court._id.toString());
      if (override) {
        return {
          ...court,
          departments: override.overrides.departments || court.departments,
          judges: override.overrides.judges || court.judges,
          ...override.overrides
        };
      }
      return court;
    });

    return NextResponse.json(courtsWithOverrides);
  } catch (error) {
    console.error('Error fetching courts:', error);
    return NextResponse.json({ error: 'Failed to fetch courts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const courtData = await request.json();
    const { db } = await connectToDatabase();

    const result = await db.collection('courts').insertOne({
      ...courtData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ _id: result.insertedId, ...courtData });
  } catch (error) {
    console.error('Error creating court:', error);
    return NextResponse.json({ error: 'Failed to create court' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { _id, ...courtData } = await request.json();
    const { db } = await connectToDatabase();

    await db.collection('courts').updateOne(
      { _id: new ObjectId(_id) },
      { $set: { ...courtData, updatedAt: new Date() } }
    );

    return NextResponse.json({ _id, ...courtData });
  } catch (error) {
    console.error('Error updating court:', error);
    return NextResponse.json({ error: 'Failed to update court' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Court ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection('courts').deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting court:', error);
    return NextResponse.json({ error: 'Failed to delete court' }, { status: 500 });
  }
} 