import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QuizForm from "@/components/teacher/QuizForm";

// Halaman untuk membuat kuis baru
export default async function CreateQuizPage() {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/quizzes/create");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  // Dapatkan daftar kelas yang dimiliki guru untuk dipilih
  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    select: { id: true, name: true }
  });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Buat Kuis Baru</h1>
      <QuizForm classes={classes} />
    </div>
  );
} 