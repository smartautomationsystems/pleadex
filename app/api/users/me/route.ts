import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Remove sensitive fields
    delete user.password;
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { db } = await connectToDatabase();
    const { firstName, lastName, phone, fax, address } = await request.json();
    const updateData: any = {
      firstName,
      lastName,
      phone,
      fax,
      address,
      updatedAt: new Date(),
    };
    // Only update fields if provided
    Object.keys(updateData).forEach((key) => {
      if (typeof updateData[key] === 'undefined') delete updateData[key];
    });
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Profile updated' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 