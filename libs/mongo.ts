import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export async function connectToMongo() {
  if (client) return client;

  const isDevelopment = process.env.NODE_ENV === 'development';
  const connectionURI = isDevelopment
    ? 'mongodb://localhost:27017/'
    : process.env.MONGODB_URI;

  if (!connectionURI) {
    throw new Error('MongoDB connection URI is not defined');
  }

  const maxRetries = 5;
  let currentAttempt = 1;

  while (currentAttempt <= maxRetries) {
    try {
      console.log(`Attempting to create MongoDB client (${isDevelopment ? 'Local' : 'Production'}) - Attempt ${currentAttempt}/${maxRetries}`);
      console.log('Connection URI:', connectionURI);
      
      const options = {
        serverApi: {
          version: '1' as const,
          strict: true,
          deprecationErrors: true,
        },
        minPoolSize: 1,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        maxIdleTimeMS: 60000,
        waitQueueTimeoutMS: 30000,
        maxConnecting: 5,
        directConnection: isDevelopment,
        ssl: !isDevelopment,
        tls: !isDevelopment,
      };

      console.log('Connection options:', JSON.stringify(options, null, 2));

      client = new MongoClient(connectionURI, options);
      await client.connect();
      console.log('Successfully connected to MongoDB');
      return client;
    } catch (error) {
      console.error(`MongoDB connection attempt ${currentAttempt} failed:`, error);
      if (currentAttempt === maxRetries) {
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
      }
      currentAttempt++;
      // Wait for a short time before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * currentAttempt));
    }
  }

  throw new Error('Failed to connect to MongoDB');
} 