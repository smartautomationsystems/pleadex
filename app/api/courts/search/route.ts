import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import { Court } from '@/models/court';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    const state = searchParams.get('state')?.toUpperCase();
    const county = searchParams.get('county')?.toLowerCase();

    if (!query) {
      return NextResponse.json({ courts: [] });
    }

    const { db } = await connectToDatabase();
    const courtsCollection = db.collection<Court>('courts');

    // Build the search query with text index
    const searchQuery: any = {
      $text: { $search: query }
    };

    if (state) {
      searchQuery.courtState = state;
    }

    if (county) {
      searchQuery.courtCounty = { $regex: county, $options: 'i' };
    }

    const courts = await courtsCollection
      .find(searchQuery)
      .project({
        courtName: 1,
        jurisdiction: 1,
        courtState: 1,
        courtCounty: 1,
        branchName: 1,
        address: 1,
        phone: 1,
        website: 1,
        caseTypes: 1,
        departments: 1,
        score: { $meta: "textScore" }
      })
      .sort({ score: { $meta: "textScore" } })
      .limit(5)
      .toArray();

    // Format the response for autocomplete
    const formattedCourts = courts.map(court => ({
      id: court._id,
      label: court.courtName,
      value: court.courtName,
      court: {
        courtName: court.courtName,
        jurisdiction: court.jurisdiction,
        courtState: court.courtState,
        courtCounty: court.courtCounty,
        branchName: court.branchName,
        address: court.address,
        phone: court.phone,
        website: court.website,
        caseTypes: court.caseTypes,
        departments: court.departments
      }
    }));

    return NextResponse.json({ courts: formattedCourts });
  } catch (error) {
    console.error('Error searching courts:', error);
    return NextResponse.json(
      { error: 'Failed to search courts' },
      { status: 500 }
    );
  }
} 