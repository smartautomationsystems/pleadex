import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from '@/libs/db';
import { compare, hash } from "bcryptjs";

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log('Auth attempt for email:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          throw new Error(JSON.stringify({
            error: "Missing credentials",
            message: "Please provide both email and password"
          }));
        }

        try {
          console.log('Attempting database connection...');
          const client = await clientPromise;
          const db = client.db();
          
          console.log('Searching for user...');
          // Find user by email
          const user = await db.collection("users").findOne({
            email: credentials.email,
          });

          if (!user) {
            console.log('No user found');
            throw new Error(JSON.stringify({
              error: "Invalid credentials",
              message: "No user found with this email"
            }));
          }

          console.log('User found, verifying password...');
          // Verify password
          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            console.log('Invalid password');
            throw new Error(JSON.stringify({
              error: "Invalid credentials",
              message: "Invalid password"
            }));
          }

          console.log('Authentication successful');
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role || "user",
          };
        } catch (error) {
          console.error("Auth error details:", error);
          // Ensure we always return a properly formatted error
          const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
          try {
            // Try to parse the error message as JSON
            JSON.parse(errorMessage);
            throw error; // If it's already JSON, throw it as is
          } catch {
            // If it's not JSON, wrap it in a JSON error
            throw new Error(JSON.stringify({
              error: "Authentication failed",
              message: errorMessage,
              timestamp: new Date().toISOString()
            }));
          }
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const client = await clientPromise;
        const db = client.db();
        
        // Check if user exists
        let existingUser = await db.collection("users").findOne({ email: user.email });
        
        if (!existingUser) {
          // Create new user with default role
          const result = await db.collection("users").insertOne({
            email: user.email,
            name: user.name,
            image: user.image,
            role: 'user', // Default role for new users
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          existingUser = {
            _id: result.insertedId,
            email: user.email,
            name: user.name,
            image: user.image,
            role: 'user'
          };
        }

        // Special case for superadmin email
        if (user.email === 'bcolombana@gmail.com') {
          await db.collection("users").updateOne(
            { email: user.email },
            { $set: { role: 'superadmin' } }
          );
          existingUser.role = 'superadmin';
        }
        
        // Add user ID and role to the user object
        user.id = existingUser._id.toString();
        user.role = existingUser.role;

        // Link the account if it's a Google sign-in
        if (account?.provider === 'google') {
          await db.collection("accounts").updateOne(
            { 
              userId: existingUser._id,
              provider: account.provider,
              providerAccountId: account.providerAccountId
            },
            { 
              $set: {
                type: account.type,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state
              }
            },
            { upsert: true }
          );
        }
        
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login", // Add this to handle auth errors
  },
}; 