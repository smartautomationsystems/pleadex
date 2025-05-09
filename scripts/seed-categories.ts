import { connectToDatabase } from '@/lib/mongodb';

const INITIAL_CATEGORIES = [
  {
    name: 'Party Info',
    description: 'Information about parties involved in the case'
  },
  {
    name: 'Attorney Info',
    description: 'Information about attorneys representing parties'
  },
  {
    name: 'Court Info',
    description: 'Information about the court and its departments'
  },
  {
    name: 'Case Info',
    description: 'General information about the case'
  },
  {
    name: 'Document Meta',
    description: 'Metadata for documents and filings'
  },
  {
    name: 'Motion/Argument Sections',
    description: 'Sections and components of motions and arguments'
  },
  {
    name: 'Family & Relationship Info',
    description: 'Information about family members and relationships'
  },
  {
    name: 'Address & Contact Info',
    description: 'Contact and location information'
  },
  {
    name: 'Employment Info',
    description: 'Employment and work-related information'
  },
  {
    name: 'Health & Insurance Info',
    description: 'Health and insurance-related information'
  },
  {
    name: 'Property Info',
    description: 'Information about properties and assets'
  },
  {
    name: 'Probate & Estate Info',
    description: 'Information related to probate and estate matters'
  },
  {
    name: 'Criminal Info (optional)',
    description: 'Optional information for criminal cases'
  },
  {
    name: 'Discovery & Evidence Info',
    description: 'Information about discovery and evidence'
  },
  {
    name: 'Form-Specific Variables',
    description: 'Variables specific to particular forms'
  }
];

async function seedCategories() {
  try {
    const { db } = await connectToDatabase();
    
    // Clear existing categories
    await db.collection('categories').deleteMany({});
    
    // Insert new categories
    const result = await db.collection('categories').insertMany(
      INITIAL_CATEGORIES.map(cat => ({
        ...cat,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    );
    
    console.log(`Successfully seeded ${result.insertedCount} categories`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories(); 