import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { MongoClient, Db } from 'mongodb';

// Only check for MONGODB_URI in production runtime, not during build
if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to your environment variables');
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function connectToDatabase(): Promise<{ db: Db }> {
  const client = await clientPromise;
  const db = client.db();
  return { db };
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise; 