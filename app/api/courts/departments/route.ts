import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { connectToDatabase } from '@/libs/db';
import { Court } from '@/models/court';
import { ObjectId } from 'mongodb';

interface Judge {
  name: string;
  title?: string;
  phone?: string;
}

interface Department {
  number: string;
  name: string;
  phone?: string;
  judges: Judge[];
}

export async function POST(request: Request) {
  console.log('✅ POST /api/courts/departments called');
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { courtId, departments } = await request.json();
    if (!courtId || !Array.isArray(departments)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const courtsCollection = db.collection<Court>('courts');

    // Find the court
    const court = await courtsCollection.findOne({ _id: new ObjectId(courtId) });
    if (!court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 });
    }

    // Transform departments and judges
    const transformedDepartments = departments.map((dept: Department) => ({
      number: dept.number,
      name: dept.name,
      phone: dept.phone
    }));

    const transformedJudges = departments.flatMap((dept: Department) =>
      (dept.judges || []).map((judge: Judge) => ({
        name: judge.name,
        title: judge.title || '',
        phone: judge.phone || '',
        department: dept.number
      }))
    );

    // Update the court with new departments and judges
    const result = await courtsCollection.updateOne(
      { _id: new ObjectId(courtId) },
      {
        $set: {
          departments: transformedDepartments,
          judges: transformedJudges,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Failed to update court' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Departments and judges imported successfully',
      departmentsCount: departments.length,
      judgesCount: transformedJudges.length
    });
  } catch (error) {
    console.error('Error importing departments:', error);
    return NextResponse.json({ error: 'Failed to import departments' }, { status: 500 });
  }
}

export async function GET() {
  return new Response("Departments base route", { status: 200 });
} 