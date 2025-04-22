import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/libs/mongo";
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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const client = await clientPromise;
          const db = client.db();
          
          // Special case for superadmin login
          if (credentials.email === "bcolombana@gmail.com") {
            // Check if superadmin exists
            let superadmin = await db.collection("users").findOne({
              email: "bcolombana@gmail.com",
              role: "superadmin"
            });

            if (!superadmin) {
              // Create superadmin if doesn't exist
              const hashedPassword = await hash("0penSesame123!@#", 10);
              const result = await db.collection("users").insertOne({
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

            // Verify superadmin password
            const isValid = await compare(credentials.password, superadmin.password);
            if (!isValid) {
              return null;
            }

            return {
              id: superadmin._id.toString(),
              email: superadmin.email,
              name: superadmin.name,
              role: superadmin.role
            };
          }

          // Normal user login flow
          const user = await db.collection("users").findOne({
            email: credentials.email,
          });

          if (!user) {
            return null;
          }

          const isValid = await compare(credentials.password, user.password);

          if (!isValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
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
    },
  },
  pages: {
    signIn: "/login",
  },
}; 