import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

// Enum untuk peran pengguna
export enum UserRole {
  TEACHER = "TEACHER",
  STUDENT = "STUDENT"
}

// Validasi secret hanya di sisi server
// Node.js khusus
if (typeof window === 'undefined' && !process.env.NEXTAUTH_SECRET) {
  console.warn("Peringatan: NEXTAUTH_SECRET tidak ditemukan di environment variables");
}

export const authOptions: NextAuthOptions = {
  // Kita tidak gunakan adapter untuk Credentials provider saja
  // adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validasi input dengan Zod
        const credentialsSchema = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        });

        const result = credentialsSchema.safeParse(credentials);
        
        if (!result.success) {
          return null;
        }

        // Mencari user berdasarkan email
        const user = await prisma.user.findUnique({
          where: { email: result.data.email }
        });

        if (!user) {
          return null;
        }

        // Karena kita menambahkan field password secara manual,
        // TypeScript tidak mengenalinya secara otomatis.
        // Kita perlu mengakses sebagai properti dinamis.
        const userPassword = (user as any).password;
        
        if (!userPassword) {
          return null;
        }

        const passwordMatch = await compare(result.data.password, userPassword);
        
        if (!passwordMatch) {
          return null;
        }

        // Ambil role dari user
        const userRole = (user as any).role as UserRole;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: userRole
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Pastikan URL ada dan valid
      if (url.startsWith('/')) {
        // Untuk URL relatif, gabungkan dengan baseUrl
        return `${baseUrl}${url}`;
      } else if (url.startsWith(baseUrl)) {
        // URL sudah dengan baseUrl
        return url;
      }
      // URL tidak terkait dengan aplikasi ini, redirect ke dashboard
      return `${baseUrl}/dashboard`;
    }
  },
  debug: process.env.NODE_ENV === "development",
}; 