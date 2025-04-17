import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getQuizById } from "@/lib/actions/quiz-actions";
import { prisma } from "@/lib/prisma";
import QuizForm from "@/components/teacher/QuizForm";

// Halaman edit kuis untuk guru
export default async function EditQuizPage({
  params,
}: {
  params: { quizId: string };
}) {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/quizzes");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  const quizId = params.quizId;
  
  // Ambil detail kuis
  const { success, data: quiz, message } = await getQuizById(quizId);
  
  if (!success || !quiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Edit Kuis</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {message || "Terjadi kesalahan saat mengambil data kuis"}
        </div>
      </div>
    );
  }
  
  // Dapatkan daftar kelas yang dimiliki guru untuk dipilih
  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    select: { id: true, name: true }
  });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Kuis</h1>
      <QuizForm quiz={quiz} classes={classes} />
    </div>
  );
} 