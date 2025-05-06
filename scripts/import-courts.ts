import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/libs/db';
import { Court } from '@/models/court';

interface CourtLocation {
  courtName: string;
  jurisdiction: string;
  courtLevel: string;
  courtState: string;
  address: string;
  phone: string;
  website: string;
  branchName: string;
  departments: Array<{
    number: string;
    phone?: string;
    judges?: string[];
  }>;
  caseTypes: string[];
  county?: string;
}

async function importCourts() {
  try {
    // Read the courts data file
    const courtsDataPath = path.join(process.cwd(), 'court-data', 'courtsData.txt');
    const courtsDataContent = fs.readFileSync(courtsDataPath, 'utf-8');
    
    // Extract the courts array from the file content
    const courtsDataMatch = courtsDataContent.match(/const courtsData = (\[[\s\S]*?\]);/);
    if (!courtsDataMatch) {
      throw new Error('Could not find courts data in file');
    }
    
    const courtsData: CourtLocation[] = eval(courtsDataMatch[1]);
    
    // Connect to database
    const { db } = await connectToDatabase();
    const courtsCollection = db.collection<Court>('courts');
    
    // Clear existing courts
    await courtsCollection.deleteMany({});
    
    // Transform and insert courts
    const transformedCourts = courtsData.map(court => ({
      courtName: court.courtName,
      jurisdiction: court.jurisdiction.toLowerCase() === 'federal' ? 'federal' as const : 'state' as const,
      courtState: court.courtState,
      courtCounty: court.county || court.courtName.split(',')[1]?.trim() || '',
      branchName: court.branchName,
      caseTypes: court.caseTypes,
      address: court.address,
      phone: court.phone,
      website: court.website,
      departments: court.departments.map(dept => ({
        number: dept.number,
        name: dept.number, // Using number as name since it's not provided
        phone: dept.phone
      })),
      judges: court.departments.flatMap(dept => 
        (dept.judges || []).map(judge => ({
          name: judge,
          title: 'Judge',
          department: dept.number
        }))
      ),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    // Insert courts in batches
    const batchSize = 100;
    for (let i = 0; i < transformedCourts.length; i += batchSize) {
      const batch = transformedCourts.slice(i, i + batchSize);
      await courtsCollection.insertMany(batch);
    }
    
    console.log(`Successfully imported ${transformedCourts.length} courts`);
  } catch (error) {
    console.error('Error importing courts:', error);
    process.exit(1);
  }
}

// Run the import
importCourts(); 