import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { fromUserRole } from "@/lib/enumMaps";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // Critical for Vercel: trust X-Forwarded-Proto headers for HTTPS detection
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const timestamp = new Date().toISOString();
        const emailStr = (credentials?.email as string) || "";
        const maskedEmail = emailStr ? emailStr.substring(0, 3) + "***" : "unknown";
        
        console.log(`[${timestamp}] [AUTH] authorize() called with email: ${maskedEmail}`);

        if (!credentials?.email || !credentials?.password) {
          console.warn(`[${timestamp}] [AUTH] FAILED: Missing email or password`);
          return null;
        }

        try {
          console.log(`[${timestamp}] [AUTH] Querying database for user: ${maskedEmail}`);
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: { institution: true },
          });

          if (!user) {
            console.warn(`[${timestamp}] [AUTH] FAILED: User not found for email: ${maskedEmail}`);
            return null;
          }

          if (!user.isActive) {
            console.warn(`[${timestamp}] [AUTH] FAILED: User account is inactive for email: ${maskedEmail}`);
            return null;
          }

          console.log(`[${timestamp}] [AUTH] User found. Validating password for: ${maskedEmail}`);
          
          const isValid = await compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            console.warn(`[${timestamp}] [AUTH] FAILED: Invalid password for user: ${maskedEmail}`);
            return null;
          }

          console.log(`[${timestamp}] [AUTH] Password validated successfully for: ${maskedEmail}`);

          // Update last login
          console.log(`[${timestamp}] [AUTH] Updating last login timestamp for user: ${user.id}`);
          
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          const returnUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: fromUserRole(user.role),
            institutionId: user.institutionId,
            institutionName: user.institution?.name ?? null,
          };

          console.log(`[${timestamp}] [AUTH] SUCCESS: User authenticated and login timestamp updated. UserId: ${user.id}, Role: ${returnUser.role}`);
          
          return returnUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : "No stack trace";
          
          console.error(`[${timestamp}] [AUTH] ERROR during authentication:`, {
            message: errorMessage,
            stack: errorStack,
            email: maskedEmail,
          });

          // Return null instead of throwing to let NextAuth handle it gracefully
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    // Critical for Vercel: explicitly configure cookies for serverless
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        sameSite: "lax",
        path: "/",
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      const timestamp = new Date().toISOString();
      
      if (user) {
        console.log(`[${timestamp}] [AUTH:JWT] Creating JWT token for user: ${(user as Record<string, unknown>).id}`);
        token.role = (user as Record<string, unknown>).role as string;
        token.institutionId = (user as Record<string, unknown>).institutionId as string | null;
        token.institutionName = (user as Record<string, unknown>).institutionName as string | null;
      }
      
      return token;
    },
    async session({ session, token }) {
      const timestamp = new Date().toISOString();
      
      if (session.user) {
        console.log(`[${timestamp}] [AUTH:SESSION] Enriching session for user: ${token.sub}`);
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.sub;
        u.role = token.role;
        u.institutionId = token.institutionId;
        u.institutionName = token.institutionName;
      }
      
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
