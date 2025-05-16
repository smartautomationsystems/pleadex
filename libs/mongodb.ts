import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getClientPromise } from "./db";

export async function getAdapter() {
  const clientPromise = getClientPromise();
  return MongoDBAdapter(clientPromise);
}