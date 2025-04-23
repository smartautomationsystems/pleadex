import axios from 'axios';
import { connectToDatabase } from '@/libs/db';
import { Court } from '@/models/court';

interface CourtData {
  name: string;
  jurisdiction: 'state' | 'federal';
  state: string;
  county: string;
  address: string;
  departments: Array<{
    number: string;
    name: string;
  }>;
  judges: Array<{
    name: string;
    title: string;
    department: string;
  }>;
}

async function importCaliforniaCourts() {
  try {
    const { db } = await connectToDatabase();
    
    // California Superior Courts
    const californiaCourts: CourtData[] = [
      {
        name: 'Superior Court of California, County of Los Angeles',
        jurisdiction: 'state',
        state: 'CA',
        county: 'Los Angeles',
        address: '111 N Hill St, Los Angeles, CA 90012',
        departments: [
          { number: '1', name: 'Civil' },
          { number: '2', name: 'Criminal' },
          { number: '3', name: 'Family Law' },
          { number: '4', name: 'Probate' },
          { number: '5', name: 'Juvenile' },
          { number: '6', name: 'Small Claims' },
          { number: '7', name: 'Traffic' },
        ],
        judges: [
          { name: 'Eric Rosen', title: 'Presiding Judge', department: '1' },
          { name: 'Samantha Jessner', title: 'Assistant Presiding Judge', department: '1' },
        ],
      },
      {
        name: 'Superior Court of California, County of Orange',
        jurisdiction: 'state',
        state: 'CA',
        county: 'Orange',
        address: '700 Civic Center Drive West, Santa Ana, CA 92701',
        departments: [
          { number: '1', name: 'Civil' },
          { number: '2', name: 'Criminal' },
          { number: '3', name: 'Family Law' },
          { number: '4', name: 'Probate' },
          { number: '5', name: 'Juvenile' },
          { number: '6', name: 'Small Claims' },
          { number: '7', name: 'Traffic' },
        ],
        judges: [
          { name: 'Maria Hernandez', title: 'Presiding Judge', department: '1' },
          { name: 'Cheri Pham', title: 'Assistant Presiding Judge', department: '1' },
        ],
      },
      {
        name: 'Superior Court of California, County of San Diego',
        jurisdiction: 'state',
        state: 'CA',
        county: 'San Diego',
        address: '220 W Broadway, San Diego, CA 92101',
        departments: [
          { number: '1', name: 'Civil' },
          { number: '2', name: 'Criminal' },
          { number: '3', name: 'Family Law' },
          { number: '4', name: 'Probate' },
          { number: '5', name: 'Juvenile' },
          { number: '6', name: 'Small Claims' },
          { number: '7', name: 'Traffic' },
        ],
        judges: [
          { name: 'Michael Smyth', title: 'Presiding Judge', department: '1' },
          { name: 'Lorna Alksne', title: 'Assistant Presiding Judge', department: '1' },
        ],
      },
      {
        name: 'Superior Court of California, County of Riverside',
        jurisdiction: 'state',
        state: 'CA',
        county: 'Riverside',
        address: '4050 Main St, Riverside, CA 92501',
        departments: [
          { number: '1', name: 'Civil' },
          { number: '2', name: 'Criminal' },
          { number: '3', name: 'Family Law' },
          { number: '4', name: 'Probate' },
          { number: '5', name: 'Juvenile' },
          { number: '6', name: 'Small Claims' },
          { number: '7', name: 'Traffic' },
        ],
        judges: [
          { name: 'John Vineyard', title: 'Presiding Judge', department: '1' },
          { name: 'Mark Johnson', title: 'Assistant Presiding Judge', department: '1' },
        ],
      },
      {
        name: 'Superior Court of California, County of San Bernardino',
        jurisdiction: 'state',
        state: 'CA',
        county: 'San Bernardino',
        address: '351 N Arrowhead Ave, San Bernardino, CA 92401',
        departments: [
          { number: '1', name: 'Civil' },
          { number: '2', name: 'Criminal' },
          { number: '3', name: 'Family Law' },
          { number: '4', name: 'Probate' },
          { number: '5', name: 'Juvenile' },
          { number: '6', name: 'Small Claims' },
          { number: '7', name: 'Traffic' },
        ],
        judges: [
          { name: 'Michael Sachs', title: 'Presiding Judge', department: '1' },
          { name: 'John P. Duran', title: 'Assistant Presiding Judge', department: '1' },
        ],
      },
    ];

    // Federal Courts
    const federalCourts: CourtData[] = [
      {
        name: 'United States District Court, Central District of California',
        jurisdiction: 'federal',
        state: 'CA',
        county: 'Los Angeles',
        address: '312 N Spring St, Los Angeles, CA 90012',
        departments: [
          { number: '1', name: 'Civil' },
          { number: '2', name: 'Criminal' },
          { number: '3', name: 'Bankruptcy' },
        ],
        judges: [
          { name: 'Philip S. Gutierrez', title: 'Chief Judge', department: '1' },
          { name: 'John F. Walter', title: 'Senior Judge', department: '1' },
        ],
      },
      {
        name: 'United States District Court, Southern District of California',
        jurisdiction: 'federal',
        state: 'CA',
        county: 'San Diego',
        address: '221 W Broadway, San Diego, CA 92101',
        departments: [
          { number: '1', name: 'Civil' },
          { number: '2', name: 'Criminal' },
          { number: '3', name: 'Bankruptcy' },
        ],
        judges: [
          { name: 'Dana M. Sabraw', title: 'Chief Judge', department: '1' },
          { name: 'Roger T. Benitez', title: 'Senior Judge', department: '1' },
        ],
      },
    ];

    const allCourts = [...californiaCourts, ...federalCourts];

    // Insert courts into database
    for (const court of allCourts) {
      await db.collection('courts').insertOne({
        courtName: court.name,
        jurisdiction: court.jurisdiction,
        courtState: court.state,
        courtCounty: court.county,
        address: court.address,
        departments: court.departments,
        judges: court.judges,
        caseTypes: ['Civil', 'Criminal', 'Family Law', 'Probate', 'Juvenile', 'Small Claims', 'Traffic'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`Successfully imported ${allCourts.length} courts`);
  } catch (error) {
    console.error('Error importing courts:', error);
  }
}

// Run the import
importCaliforniaCourts(); 