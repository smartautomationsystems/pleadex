import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/libs/mongo';
import { parse } from 'csv-parse';

interface Judge {
  name: string;
  title: string;
}

interface Department {
  number: string;
  name: string;
  phone: string;
  judges: Judge[];
}

interface CourtRecord {
  courtName: string;
  jurisdiction: string;
  courtState: string;
  courtCounty: string;
  address: string;
  departments: Department[];
  caseTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: Request) {
  try {
    // Check for API key in Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const content = await file.text();
    const records = await new Promise((resolve, reject) => {
      parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        quote: '"',
        escape: '"',
        relax_quotes: true,
        relax_column_count: true,
        skip_records_with_error: true
      }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });

    const { db } = await connectToDatabase();
    const courtsCollection = db.collection('courts');

    // Transform CSV records into court documents
    const courts = (records as any[]).map((record: any) => {
      // Parse departments with their judges
      const departments = record.departments.split(';').map((deptStr: string) => {
        const [number, name, phone, ...judgesStr] = deptStr.split(':');
        const judges = judgesStr.map((judgeStr: string) => {
          const [name, title] = judgeStr.split(':');
          return { name: name.trim(), title: title.trim() };
        });
        return {
          number: number.trim(),
          name: name.trim(),
          phone: phone.trim(),
          judges
        };
      });

      // Parse case types
      const caseTypes = record.caseTypes.split(',').map((type: string) => type.trim());

      return {
        courtName: record.courtName,
        jurisdiction: record.jurisdiction,
        courtState: record.courtState,
        courtCounty: record.courtCounty,
        address: record.address,
        departments,
        caseTypes,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    // Insert all courts
    const result = await courtsCollection.insertMany(courts);

    return NextResponse.json({
      message: 'Courts imported successfully',
      insertedCount: result.insertedCount
    });
  } catch (error) {
    console.error('Error importing courts:', error);
    return NextResponse.json(
      { error: 'Failed to import courts' },
      { status: 500 }
    );
  }
} 