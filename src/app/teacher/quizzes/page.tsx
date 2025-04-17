import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getAllQuizzes } from "@/lib/actions/quiz-actions";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import QuizList from "@/components/teacher/QuizList";

// Halaman daftar kuis untuk guru
export default async function TeacherQuizzesPage() {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/quizzes");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  // Ambil daftar kuis
  const { success, data: quizzes, message } = await getAllQuizzes();
  
  if (!success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Manajemen Kuis</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {message || "Terjadi kesalahan saat mengambil data kuis"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manajemen Kuis</h1>
        <Link
          href="/teacher/quizzes/create"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-5 h-5 mr-1" />
          Buat Kuis Baru
        </Link>
      </div>
      
      <QuizList quizzes={quizzes || []} />
    </div>
  );
} 