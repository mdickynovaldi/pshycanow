import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Jika tidak ada session, redirect ke landing page
  if (!session?.user) {
    redirect("/");
  }

  const userRole = session.user.role;

  // Redirect berdasarkan role
  if (userRole === UserRole.TEACHER) {
    redirect("/teacher/dashboard");
  } else if (userRole === UserRole.STUDENT) {
    redirect("/student/quizzes");
  } else {
    // Jika role tidak dikenali, logout dan kembali ke landing page
    redirect("/api/auth/signout?callbackUrl=/");
  }
} 