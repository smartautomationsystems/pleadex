import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { connectToDatabase } from '@/libs/db';
import { hash } from 'bcryptjs';
import { ObjectId } from 'mongodb';

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session || session.user.role !== 'superadmin') {
      console.log('Unauthorized access attempt:', { session });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, phone, fax, address } = body;
    const { id } = params;
    console.log('Update request:', { id, name, email, role, hasPassword: !!password, phone, fax, address });

    // Validate required fields except password
    if (!name || !email || !role) {
      console.log('Missing required fields:', { name, email, role });
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      console.log('Invalid ObjectId:', id);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if email is already taken by another user
    const existingUser = await db
      .collection('users')
      .findOne({ 
        email, 
        _id: { $ne: new ObjectId(id) }
      });
    
    if (existingUser) {
      console.log('Email already taken:', { email, existingUserId: existingUser._id });
      return NextResponse.json(
        { error: 'Email is already taken' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role,
      updatedAt: new Date(),
    };
    if (typeof phone !== 'undefined') updateData.phone = phone;
    if (typeof fax !== 'undefined') updateData.fax = fax;
    if (typeof address !== 'undefined') updateData.address = address;

    // Only update password if provided and not empty
    if (password?.trim()) {
      updateData.password = await hash(password, 12);
    }

    console.log('Updating user with data:', { 
      id, 
      name: updateData.name,
      email: updateData.email,
      role: updateData.role,
      phone: updateData.phone,
      fax: updateData.fax,
      address: updateData.address,
      hasPasswordUpdate: !!updateData.password 
    });

    // Update user
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      console.log('User not found:', id);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'User updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/users/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session || session.user.role !== 'superadmin') {
      console.log('Unauthorized delete attempt:', { session });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    console.log('Delete request for user:', id);

    if (!ObjectId.isValid(id)) {
      console.log('Invalid ObjectId:', id);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Don't allow deleting yourself
    if (session.user.id === id) {
      console.log('Attempted to delete own account');
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const result = await db.collection('users').deleteOne({
      _id: new ObjectId(id)
    });

    console.log('Delete result:', result);

    if (result.deletedCount === 0) {
      console.log('User not found for deletion:', id);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/users/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 