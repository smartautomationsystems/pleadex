const fs = require('fs');
const path = require('path');

function parseCourts() {
  try {
    // Read the courts data file
    const filePath = path.join(process.cwd(), 'court-data', 'courtsData.txt');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract the courts array from the file content
    const courtsMatch = fileContent.match(/const courtsData = (\[[\s\S]*?\]);/);
    if (!courtsMatch) {
      throw new Error('Could not find courts data in file');
    }
    
    const courtsData = eval(courtsMatch[1]);
    
    // Process and validate the first 3 courts
    const sampleCourts = courtsData.slice(0, 3).map(court => {
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
    
    console.log('Total courts found:', courtsData.length);
    console.log('\nSample of first 3 courts:');
    console.log(JSON.stringify(sampleCourts, null, 2));
    
  } catch (error) {
    console.error('Error parsing courts:', error);
  }
}

parseCourts(); 