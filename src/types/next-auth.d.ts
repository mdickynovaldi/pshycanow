import { UserRole } from "@/lib/auth";
import  { DefaultSession } from "next-auth";

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