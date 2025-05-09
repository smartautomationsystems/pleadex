import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    // Find the current category to get the old name
    const current = await db.collection('form_categories').findOne({ _id: new ObjectId(params.id) });
    if (!current) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const oldName = current.name;
    // Update the category
    const result = await db.collection('form_categories').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { name, description: description || '', updatedAt: new Date().toISOString() } }
    );
    // Update all forms with the old category name
    if (oldName !== name) {
      await db.collection('forms').updateMany(
        { category: oldName },
        { $set: { category: name } }
      );
    }
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating form category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('form_categories').deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting form category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 