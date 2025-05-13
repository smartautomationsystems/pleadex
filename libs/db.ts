import { MongoClient, ServerApiVersion } from 'mongodb';
import mongoose from 'mongoose';

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const IS_ATLAS = MONGODB_URI?.includes('mongodb.net');
const MAX_RETRIES = 2;
const RETRY_DELAY = 500;

if (!MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

// Common connection options
const commonOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  minPoolSize: 1,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 10000,
  heartbeatFrequencyMS: 5000,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 5000,
  maxConnecting: 5,
};

// MongoDB Atlas connection options
const atlasOptions = {
  ...commonOptions,
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: process.env.NODE_ENV === 'development',
  tlsAllowInvalidHostnames: process.env.NODE_ENV === 'development',
};

// Local MongoDB connection options
const localOptions = {
  ...commonOptions,
  directConnection: true,
  ssl: false,
  tls: false,
};

// Use Atlas options if connecting to MongoDB Atlas, otherwise use local options
const options = IS_ATLAS ? atlasOptions : localOptions;

// MongoDB Client for direct MongoDB operations
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Function to create a new MongoDB client with retry logic
async function createMongoClient(retryCount = 0): Promise<MongoClient> {
  try {
    console.log(`Attempting to create MongoDB client (${IS_ATLAS ? 'Atlas' : 'Local'}) - Attempt ${retryCount + 1}/${MAX_RETRIES}`);
    console.log('Connection URI:', MONGODB_URI);
    console.log('Connection options:', JSON.stringify(options, null, 2));
    
    const newClient = new MongoClient(MONGODB_URI, options);
    await newClient.connect();
    console.log('Successfully connected to MongoDB');
    return newClient;
  } catch (error) {
    console.error(`MongoDB connection attempt ${retryCount + 1} failed:`, error);
    
    if (retryCount < MAX_RETRIES - 1) {
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return createMongoClient(retryCount + 1);
    }
    
    throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${error.message}`);
  }
}

// Initialize the client promise
if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    console.log(`Creating new MongoDB connection in development mode (${IS_ATLAS ? 'Atlas' : 'Local'})`);
    globalWithMongo._mongoClientPromise = createMongoClient();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  console.log(`Creating new MongoDB connection in production mode (${IS_ATLAS ? 'Atlas' : 'Local'})`);
  clientPromise = createMongoClient();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

// Function to connect to MongoDB using the native driver
export async function connectToDatabase() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const client = await clientPromise;
    const db = client.db();
    
    // Verify the connection
    await db.command({ ping: 1 });
    console.log('Successfully connected to MongoDB');
    
    return { client, db };
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Function to connect to MongoDB using Mongoose
export async function connectMongoose() {
  try {
    console.log('Attempting to connect to MongoDB using Mongoose...');
    
    // Configure Mongoose
    mongoose.set('strictQuery', true);
    
    // Add connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });
    
    // Connect with retry logic
    let retryCount = 0;
    while (retryCount < MAX_RETRIES) {
      try {
        await mongoose.connect(MONGODB_URI, options);
        console.log('Successfully connected to MongoDB using Mongoose');
        return;
      } catch (error) {
        console.error(`Mongoose connection attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        } else {
          throw new Error(`Failed to connect to MongoDB using Mongoose after ${MAX_RETRIES} attempts: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Mongoose connection error:', error);
    throw error;
  }
}

// Function to get the database name from the URI
export function getDatabaseName(): string {
  const dbName = MONGODB_URI.split('/').pop()?.split('?')[0];
  return dbName || 'pleadex';
}

// Function to close all database connections
export async function closeConnections() {
  try {
    console.log('Closing MongoDB connections...');
    await mongoose.connection.close();
    const client = await clientPromise;
    await client.close();
    console.log('Successfully closed all MongoDB connections');
  } catch (error) {
    console.error('Error closing MongoDB connections:', error);
    throw error;
  }
} 