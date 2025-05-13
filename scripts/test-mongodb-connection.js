const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('Testing connection to MongoDB...');
  console.log('URI format check:', uri.includes('mongodb+srv://') ? 'Valid Atlas URI' : 'Not an Atlas URI');
  
  const client = new MongoClient(uri, {
    serverApi: {
      version: '1',
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    
    // Test a simple query
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('Connection failed with error:', error);
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nThis likely means MongoDB Atlas is not accessible. Check:');
      console.error('1. Network access in MongoDB Atlas (IP whitelist)');
      console.error('2. Vercel\'s outbound IPs are allowed');
      console.error('3. MongoDB Atlas cluster is running');
    } else if (error.name === 'MongoParseError') {
      console.error('\nThis likely means the connection string is malformed. Check:');
      console.error('1. Special characters in password are URL-encoded');
      console.error('2. No extra @ symbols in the URI');
    }
  } finally {
    await client.close();
  }
}

testConnection(); 