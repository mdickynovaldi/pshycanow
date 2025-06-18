import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getQuizById } from "@/lib/actions/quiz-actions";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon, PencilIcon } from "@heroicons/react/24/outline";

interface PageProps {
  params: Promise<{ quizId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Halaman detail kuis untuk guru
export default async function QuizDetailPage({ params }: PageProps) {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/quizzes");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  // Await params untuk mendapatkan quizId
  const { quizId } = await params;
  
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/teacher/quizzes"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali ke Daftar Kuis
        </Link>
      </div>
      
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/teacher/quizzes/${quizId}/edit`}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit Kuis
          </Link>
          <Link
            href={`/teacher/quizzes/${quizId}/quiz-assistance`}
            className="inline-flex items-center justify-center px-4 py-2 border border-green-600 shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 ml-2"
          >
            KELOLA BANTUAN KUIS
          </Link>
          <Link
            href={`/teacher/quizzes/${quizId}/student-control`}
            className="inline-flex items-center justify-center px-4 py-2 border border-amber-600 shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 ml-2"
          >
            KONTROL SISWA
          </Link>
        </div>
      </div>
      
      {/* Dashboard Statistik Kuis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Jumlah Pertanyaan</h3>
                <p className="text-3xl font-bold text-gray-700">{quiz.questions?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Kelas</h3>
                <p className="text-xl font-bold text-gray-700">{quiz.class?.name || "Tidak ada kelas"}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manajemen</h3>
                <div className="mt-2">
                  <Link 
                    href={`/teacher/quizzes/${quizId}/student-control`}
                    className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-md"
                  >
                    Kontrol Siswa
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-6">
          {quiz.description && <p className="text-gray-600 mb-4">{quiz.description}</p>}
          
          {quiz.class && (
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Kelas: 
                <Link 
                  href={`/teacher/classes/${quiz.class.id}`}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  {quiz.class.name}
                </Link>
              </p>
            </div>
          )}
          
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Dibuat pada: {new Date(quiz.createdAt).toLocaleDateString("id-ID", { 
                day: "numeric", 
                month: "long", 
                year: "numeric" 
              })}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-4">Daftar Pertanyaan</h2>
        
        {!quiz.questions || quiz.questions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">Kuis ini belum memiliki pertanyaan</p>
            <div className="mt-4">
              <Link
                href={`/teacher/quizzes/${quizId}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Edit Kuis untuk Menambahkan Pertanyaan
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {quiz.questions.map((question, index) => (
              <div key={question.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-3">Pertanyaan {index + 1}</h3>
                  <p className="text-gray-800 mb-4">{question.text}</p>
                  
                  {question.imageUrl && (
                    <div className="mb-4">
                      <div className="bg-gray-100 rounded-md p-2 mb-2">
                        <p className="text-sm font-medium text-gray-600 mb-2">Gambar Soal:</p>
                        <div className="relative w-full h-60 bg-gray-200 rounded-md overflow-hidden">
                          <Image
                            src={question.imageUrl}
                            alt={`Gambar untuk pertanyaan ${index + 1}`}
                            fill
                            className="object-contain w-full h-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {question.expectedAnswer && (
                    <div className="mt-4 bg-yellow-50 p-4 rounded-md">
                      <p className="text-sm font-medium text-gray-700 mb-1">Jawaban yang Diharapkan:</p>
                      <p className="text-gray-800">{question.expectedAnswer}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 