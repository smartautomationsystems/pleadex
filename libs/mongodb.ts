import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./db";

// Export the MongoDB adapter for NextAuth
export const adapter = MongoDBAdapter(clientPromise); 