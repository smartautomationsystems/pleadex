import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "./mongo";
import { ObjectId } from "mongodb";
import { hash, compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Super Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password");
        }

        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");

        // Check if superadmin exists
        let superadmin = await usersCollection.findOne({ email: "bcolombana@gmail.com" });

        if (!superadmin) {
          // Hash the superadmin password
          const hashedPassword = await hash("0penSesame123!@#", 10);
          
          // Create superadmin with hashed password
          const result = await usersCollection.insertOne({
            email: "bcolombana@gmail.com",
            name: "Super Admin",
            role: "superadmin",
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          superadmin = {
            _id: result.insertedId,
            email: "bcolombana@gmail.com",
            name: "Super Admin",
            role: "superadmin",
            password: hashedPassword
          };
        }

        // Verify password
        const isValid = await compare(credentials.password, superadmin.password);
        
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: superadmin._id.toString(),
          email: superadmin.email,
          name: superadmin.name,
          role: superadmin.role
        };
      },
    }),
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");
        
        // Check if user exists
        let existingUser = await usersCollection.findOne({ email: user.email });
        
        if (!existingUser) {
          // Create new user
          const result = await usersCollection.insertOne({
            email: user.email,
            name: user.name,
            image: user.image,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          existingUser = {
            _id: result.insertedId,
            email: user.email,
            name: user.name,
            image: user.image
          };
        }
        
        // Add user ID to the user object
        user.id = existingUser._id.toString();
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
}; 