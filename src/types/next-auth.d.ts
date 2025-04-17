import NextAuth, { DefaultSession } from "next-auth";
import { UserRole } from "@/lib/auth";

declare module "next-auth" {
  /**
   * Memperluas tipe default Session dari NextAuth
   */
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
} 