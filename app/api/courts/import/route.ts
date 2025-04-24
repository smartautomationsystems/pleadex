import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/libs/db';
import { parse } from 'csv-parse';

export async function POST(request: Request) {
  try {
    // Check for API key in Authorization header
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;
    
    if (!apiKey) {
      console.error('API key not configured on server');
      return NextResponse.json({ error: 'Server configuration error - API key not set' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      console.error('Unauthorized import attempt:', { 
        receivedHeader: authHeader?.substring(0, 20) + '...',
        keyConfigured: !!apiKey
      });
      return NextResponse.json({ error: 'Unauthorized - Invalid API key' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const content = await file.text();
    console.log('Received file content:', content.substring(0, 200) + '...');

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
        if (err) {
          console.error('CSV parsing error:', err);
          reject(err);
        } else {
          console.log('Parsed records count:', output.length);
          resolve(output);
        }
      });
    });

    const { db } = await connectToDatabase();
    const courtsCollection = db.collection('courts');

    // Transform CSV records into court documents with optional fields
    const courts = (records as any[]).map((record: any) => {
      // Validate required fields
      if (!record.courtName || !record.address) {
        console.warn('Skipping record due to missing required fields:', record);
        return null;
      }

      // Handle optional departments field
      let departments = [];
      if (record.departments) {
        try {
          departments = record.departments.split(';').map((deptStr: string) => {
            const [number, name, phone = '', ...judgesStr] = deptStr.split(':');
            const judges = judgesStr.map((judgeStr: string) => {
              const [judgeName, title = ''] = judgeStr.split(':');
              return { name: judgeName.trim(), title: title.trim() };
            });
            return {
              number: number?.trim() || '',
              name: name?.trim() || '',
              phone: phone?.trim() || '',
              judges: judges || []
            };
          });
        } catch (error) {
          console.warn('Error parsing departments, using empty array:', error);
        }
      }

      // Handle optional caseTypes field
      let caseTypes = [];
      if (record.caseTypes) {
        caseTypes = record.caseTypes.split(',').map((type: string) => type.trim());
      }

      return {
        courtName: record.courtName.trim(),
        jurisdiction: record.jurisdiction?.trim()?.toLowerCase() || 'state',
        courtState: record.courtState?.trim() || '',
        courtCounty: record.courtCounty?.trim() || '',
        address: record.address.trim(),
        phone: record.phone?.trim() || '',
        website: record.website?.trim() || '',
        branchName: record.branchName?.trim() || '',
        departments: departments,
        caseTypes: caseTypes,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }).filter(Boolean); // Remove any null records

    if (courts.length === 0) {
      return NextResponse.json({ 
        error: 'No valid courts found in CSV. Each record must have at least courtName and address.' 
      }, { status: 400 });
    }

    // Insert valid courts
    const result = await courtsCollection.insertMany(courts);

    return NextResponse.json({
      message: 'Courts imported successfully',
      insertedCount: result.insertedCount,
      totalRecords: (records as any[]).length,
      validRecords: courts.length
    });
  } catch (error) {
    console.error('Error importing courts:', error);
    return NextResponse.json(
      { error: 'Failed to import courts: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 