import fs from 'fs';
import path from 'path';

interface Department {
  number: string;
  judge?: string;
  phone?: string;
}

interface CourtLocation {
  courtName: string;
  jurisdiction: string;
  courtLevel: string;
  courtState: string;
  address: string;
  phone: string;
  website: string;
  branchName: string;
  departments: Department[];
  caseTypes: string[];
  county?: string;
}

function processCourts() {
  try {
    // Read the courts data file
    const filePath = path.join(process.cwd(), 'courtsData.txt');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract the courts array from the file content
    const courtsMatch = fileContent.match(/const courtsData = (\[[\s\S]*?\]);/);
    if (!courtsMatch) {
      throw new Error('Could not find courts data in file');
    }
    
    const courtsData: CourtLocation[] = eval(courtsMatch[1]);
    
    // Process each court location
    const processedCourts = courtsData.map(court => {
      // Extract county from courtName for Superior Courts
      if (court.jurisdiction === 'Superior Court') {
        const countyMatch = court.courtName.match(/^([A-Za-z\s]+) County Superior Court$/);
        if (countyMatch) {
          court.county = countyMatch[1].trim();
        }
      }
      
      return {
        name: court.courtName,
        jurisdiction: court.jurisdiction.toLowerCase(),
        level: court.courtLevel.toLowerCase(),
        state: court.courtState,
        county: court.county,
        locations: [{
          name: court.branchName,
          address: court.address,
          phone: court.phone,
          website: court.website,
          departments: court.departments.map(dept => ({
            number: dept.number,
            judge: dept.judge || '',
            phone: dept.phone || ''
          })),
          caseTypes: court.caseTypes
        }]
      };
    });
    
    // Write the processed data to a new file
    const outputPath = path.join(process.cwd(), 'processedCourts.json');
    fs.writeFileSync(outputPath, JSON.stringify(processedCourts, null, 2));
    
    console.log(`Successfully processed ${processedCourts.length} courts`);
    console.log(`Output written to ${outputPath}`);
  } catch (error) {
    console.error('Error processing courts:', error);
  }
}

processCourts(); 