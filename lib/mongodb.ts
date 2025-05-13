import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { MongoClient, Db } from 'mongodb';

// Only check for MONGODB_URI in production runtime, not during build
if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to your environment variables');
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const options = {
  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000, // 45 seconds
  serverSelectionTimeoutMS: 10000, // 10 seconds
  maxPoolSize: 10,
  minPoolSize: 5,
};

// Initialize MongoDB client only when needed
function getMongoClient() {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect().catch(error => {
        console.error('MongoDB connection error:', error);
        throw new Error('Failed to connect to database');
      });
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    const client = new MongoClient(uri, options);
    return client.connect().catch(error => {
      console.error('MongoDB connection error:', error);
      throw new Error('Failed to connect to database');
    });
  }
}

export async function connectToDatabase(): Promise<{ db: Db }> {
  try {
    const client = await getMongoClient();
    const db = client.db();
    return { db };
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}

// Export a function that returns the client promise
export default getMongoClient; 