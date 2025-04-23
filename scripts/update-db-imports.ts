import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filesToUpdate = [
  'scripts/import-courts.ts',
  'app/api/globals/route.ts',
  'app/api/forms/process/route.ts',
  'app/api/forms/view/route.ts',
  'app/api/forms/route.ts',
  'app/api/forms/upload/route.ts',
  'app/api/documents/view/route.ts',
  'app/api/documents/upload/route.ts',
  'app/api/documents/summarize/route.ts',
  'app/api/documents/route.ts',
  'app/api/documents/search/route.ts',
  'app/api/documents/process/route.ts',
  'app/api/documents/download/route.ts',
  'app/api/courts/route.ts',
  'app/api/courts/import/route.ts',
  'app/api/auth/register/route.ts',
  'app/api/auth/config.ts'
];

function updateFile(filePath: string) {
  try {
    const fullPath = join(process.cwd(), filePath);
    let content = readFileSync(fullPath, 'utf8');
    
    // Update imports
    content = content.replace(
      /from ['"]@\/libs\/mongo['"]/g,
      'from \'@/libs/db\''
    );
    
    writeFileSync(fullPath, content);
    console.log(`Updated ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Update all files
filesToUpdate.forEach(updateFile);

console.log('Database import updates completed!'); 