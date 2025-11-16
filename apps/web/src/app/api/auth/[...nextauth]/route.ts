import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const authOptions: NextAuthOptions = {
  // No adapter needed for JWT strategy - we'll handle OAuth manually
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const res = await axios.post(`${API}/auth/login`, {
            username: credentials.username,
            password: credentials.password,
          });

          if (res.data) {
            return {
              id: res.data.id.toString(),
              name: res.data.name || res.data.username,
              email: res.data.email,
              handle: res.data.username,
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth, ensure user is created in database
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email || "" },
          });

          if (!existingUser) {
            // Create user if doesn't exist
            await prisma.user.create({
              data: {
                email: user.email || "",
                name: user.name || "",
                image: user.image || "",
                handle: user.email?.split("@")[0] || "",
              },
            });
          }
        } catch (error) {
          console.error("Error creating user:", error);
          // Don't block sign in if there's an error
        }
      }
      return true;
    },
    async session({ session, user, token }: any) {
      if (session?.user) {
        if (user) {
          session.user.id = user.id;
          session.user.handle = user.handle || user.email?.split("@")[0] || "";
        } else if (token) {
          // For credentials login and JWT
          session.user.id = token.id;
          session.user.handle = token.handle || token.email?.split("@")[0] || "";
        }
      }
      return session;
    },
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        token.handle = user.handle || user.email?.split("@")[0] || "";
      }
      if (account?.provider === "google" && user?.email) {
        // For Google OAuth, fetch user from database
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser) {
            token.id = dbUser.id.toString();
            token.handle = dbUser.handle || user.email.split("@")[0] || "";
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

