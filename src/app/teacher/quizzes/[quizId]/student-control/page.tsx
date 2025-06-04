import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getQuizById } from "@/lib/actions/quiz-actions";
import StudentControl from "../student-control";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function StudentControlPage({ params }: any) {
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
        <h1 className="text-2xl font-bold mb-6">Detail Kuis</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {message || "Terjadi kesalahan saat mengambil data kuis"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href={`/teacher/quizzes/${quizId}`}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Kembali ke Detail Kuis
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-end">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <p className="text-muted-foreground text-sm">Kontrol Alur Pembelajaran Siswa</p>
        </div>
      </div>
      
      <StudentControl quizId={quizId} />
    </div>
  );
} 