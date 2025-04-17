"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardDocumentCheckIcon, DocumentTextIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPendingSubmissionsWithRawSQL } from "@/lib/actions/quiz-submission-actions";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export default function TeacherSubmissionsPage() {
  const router = useRouter();
  
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadSubmissions = async () => {
    try {
      setIsLoading(true);
      
      const response = await getPendingSubmissionsWithRawSQL();
      
      if (response.success) {
        setSubmissions(response.data || []);
      } else {
        setError(response.message || "Gagal memuat submisi");
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
      setError("Terjadi kesalahan saat memuat submisi");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadSubmissions();
  }, []);
  
  const getInitials = (name: string) => {
    return name
      ? name
          .split(' ')
          .map(part => part.charAt(0))
          .join('')
          .toUpperCase()
          .substring(0, 2)
      : "?";
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
        <ClipboardDocumentCheckIcon className="h-8 w-8 mr-2 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold">Submisi untuk Dinilai</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Daftar pengerjaan kuis siswa yang menunggu penilaian
          </p>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
          <Button 
            className="mt-2" 
            size="sm" 
            variant="outline"
            onClick={loadSubmissions}
          >
            Coba Lagi
          </Button>
        </Alert>
      )}
      
      {submissions.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg text-center">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
            Belum ada submisi yang menunggu penilaian
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Semua submisi kuis siswa sudah dinilai. Periksa kembali nanti jika ada submisi baru.
          </p>
          <Button 
            onClick={loadSubmissions}
            variant="outline"
            size="sm"
          >
            Segarkan Data
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {submissions.map((submission) => (
            <Card key={submission.id} className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => router.push(`/teacher/submissions/${submission.id}`)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{submission.quiz.title}</CardTitle>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Kelas: {submission.quiz.class?.name || "Tidak ada kelas"}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center mb-4">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={submission.student.image || ""} alt={submission.student.name || "Student"} />
                    <AvatarFallback className="bg-blue-100 text-blue-800">
                      {getInitials(submission.student.name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{submission.student.name || "Student"}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{submission.student.email}</div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Percobaan:</span>
                    <span>{submission.attemptNumber} dari 4</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Dikirim:</span>
                    <span>
                      {formatDistanceToNow(new Date(submission.createdAt), {
                        addSuffix: true,
                        locale: id
                      })}
                    </span>
                  </div>
                </div>
                
                <Button className="w-full mt-4" size="sm">
                  Nilai Submisi
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 