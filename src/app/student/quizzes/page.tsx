"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AcademicCapIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { getStudentAvailableQuizzes } from "@/lib/actions/quiz-submission-actions";
import { SubmissionStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      
      const response = await getStudentAvailableQuizzes();
      
      if (response.success) {
        setQuizzes(response.data || []);
      } else {
        setError(response.message || "Gagal memuat daftar kuis");
      }
    } catch (err) {
      console.error("Error loading quizzes:", err);
      setError("Terjadi kesalahan saat memuat daftar kuis");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadQuizzes();
  }, []);
  
  const getQuizStatusIndicator = (quiz: any) => {
    const { attemptInfo } = quiz;
    
    if (attemptInfo.hasPassed) {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircleIcon className="h-5 w-5 mr-1" />
          <span>Lulus</span>
        </div>
      );
    }
    
    if (attemptInfo.hasPendingAttempt) {
      return (
        <div className="flex items-center text-yellow-600">
          <ClockIcon className="h-5 w-5 mr-1" />
          <span>Menunggu Penilaian</span>
        </div>
      );
    }
    
    if (attemptInfo.attemptCount >= 4) {
      return (
        <div className="flex items-center text-red-600">
          <XCircleIcon className="h-5 w-5 mr-1" />
          <span>Batas Percobaan Habis</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-blue-600">
        <DocumentTextIcon className="h-5 w-5 mr-1" />
        <span>Tersedia</span>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <AcademicCapIcon className="h-8 w-8 mr-2 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold">Kuis Saya</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Daftar kuis yang tersedia untuk Anda
          </p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {quizzes.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            Belum ada kuis
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Belum ada kuis yang tersedia untuk Anda saat ini. Silakan periksa kembali nanti atau hubungi guru Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{quiz.title}</CardTitle>
                <CardDescription>
                  Kelas: {quiz.class?.name || "Tidak ada kelas"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    {getQuizStatusIndicator(quiz)}
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Percobaan:</span>
                    <span>{quiz.attemptInfo.attemptCount} dari 4</span>
                  </div>
                  
                  {quiz.attemptInfo.lastAttempt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Terakhir:</span>
                      <span>
                        {formatDistanceToNow(new Date(quiz.attemptInfo.lastAttempt.createdAt), {
                          addSuffix: true,
                          locale: id
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-end space-x-2">
                <Link href={`/student/quizzes/${quiz.id}/history`}>
                  <Button variant="outline" size="sm">
                    <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1" />
                    Riwayat
                  </Button>
                </Link>
                
                <Link href={`/student/quizzes/${quiz.id}`}>
                  <Button 
                    size="sm"
                    disabled={
                      quiz.attemptInfo.hasPendingAttempt || 
                      quiz.attemptInfo.attemptCount >= 4 ||
                      quiz.attemptInfo.hasPassed
                    }
                  >
                    {quiz.attemptInfo.hasPendingAttempt 
                      ? "Menunggu Penilaian" 
                      : quiz.attemptInfo.hasPassed
                      ? "Sudah Lulus"
                      : quiz.attemptInfo.attemptCount >= 4
                      ? "Batas Percobaan Habis"
                      : "Mulai Kuis"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 