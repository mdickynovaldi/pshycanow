import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { UserRole } from "./lib/auth";

// Konfigurasi path yang dilindungi
const teacherPaths = ["/teacher"];
const studentPaths = ["/student"];
const authRoutes = ["/login", "/register"];
const publicRoutes = ["/", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Periksa apakah ini adalah rute publik
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicRoute) return NextResponse.next();
  
  // Periksa apakah ini adalah rute auth (login/register)
  const isAuthRoute = authRoutes.some(route => pathname === route);
  
  // Dapatkan token dari session
  const token = await getToken({ req: request });
  
  // Jika tidak ada token (tidak login) dan bukan rute auth, redirect ke login
  if (!token && !isAuthRoute) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  
  // Jika sudah login tapi mengakses rute auth, redirect ke dashboard
  if (token && isAuthRoute) {
    const url = new URL("/dashboard", request.url);
    return NextResponse.redirect(url);
  }
  
  // Periksa akses rute berdasarkan peran
  const userRole = token?.role as string;
  
  // Jika rute /teacher diakses oleh selain TEACHER
  if (teacherPaths.some(path => pathname.startsWith(path)) && userRole !== UserRole.TEACHER) {
    // Jika sudah login, redirect ke dashboard
    if (token) {
      const url = new URL("/dashboard", request.url);
      url.searchParams.append("unauthorized", "true");
      return NextResponse.redirect(url);
    }
    // Jika belum login, redirect ke login
    else {
      const url = new URL("/login", request.url);
      return NextResponse.redirect(url);
    }
  }
  
  // Jika rute /student diakses oleh selain STUDENT
  if (studentPaths.some(path => pathname.startsWith(path)) && userRole !== UserRole.STUDENT) {
    // Jika sudah login, redirect ke dashboard
    if (token) {
      const url = new URL("/dashboard", request.url);
      url.searchParams.append("unauthorized", "true");
      return NextResponse.redirect(url);
    }
    // Jika belum login, redirect ke login
    else {
      const url = new URL("/login", request.url);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

// Konfigurasi path yang akan diproses oleh middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 