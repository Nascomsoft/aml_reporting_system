/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      institutionId: string | null;
      institutionName: string | null;
    } & DefaultSession["user"];
  }
}
