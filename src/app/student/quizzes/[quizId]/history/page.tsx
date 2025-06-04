"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Loader2, AlertCircle, History, CheckCircle, XCircle } from "lucide-react";
import { getStudentSubmissionHistory } from "@/lib/actions/quiz-submission-actions";
import { SubmissionStatus, AssistanceRequirement, SubmissionAnswer } from "@/types";

import { cn } from "@/lib/utils";
import { formatRelative } from "date-fns";
import { id } from "date-fns/locale";

// --- Interface Definitions ---
interface SubmissionData {
  id: string;
  status: SubmissionStatus;
  score?: number | null;
  passed?: boolean | null;
  attemptNumber: number;
  createdAt: Date;
  answers: SubmissionAnswer[];
  assistanceLevel?: AssistanceRequirement | null; // opsional jika ini submisi bantuan
  assistanceQuizTitle?: string | null; // opsional
  feedback?: string | null; // Untuk submisi yang dinilai guru
  // Tambahkan properti lain yang mungkin ada
}

interface QuizDetailsData {
  id: string;
  title: string;
  description?: string | null;
  passingScore: number;
  // Tambahkan properti lain dari quiz details
}

// Untuk assistance submissions, mungkin perlu interface berbeda jika strukturnya jauh berbeda
// Untuk saat ini, kita bisa gunakan SubmissionData atau buat yang lebih spesifik jika perlu

export default function SubmissionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [quizDetails, setQuizDetails] = useState<QuizDetailsData | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!quizId) return;
      setLoading(true);
      console.log('🔍 Fetching submission history for quizId:', quizId);
      try {
        // Fetch quiz submissions, history, and quiz details in parallel
        const [submissionResult, quizResult, directSubmissionsResult] = await Promise.all([
          getStudentSubmissionHistory(quizId),
          fetch(`/api/student/quiz/${quizId}`).then(res => res.json()).catch(() => ({ success: false })),
          fetch(`/api/student/quiz-submissions?quizId=${quizId}`).then(res => res.json()).catch(() => ({ success: false }))
        ]);
        
        console.log('📊 getStudentSubmissionHistory result:', submissionResult);
        console.log('📊 Quiz details result:', quizResult);
        
        // Set quiz details if successful
        if (quizResult.success && quizResult.data) {
          setQuizDetails({
            id: quizResult.data.id,
            title: quizResult.data.title,
            description: quizResult.data.description,
            passingScore: quizResult.data.passingScore || 0
          });
        }
        
        console.log('📊 Direct API call result:', directSubmissionsResult);
        
        // Prioritas ke data dari API langsung jika tersedia
        if (directSubmissionsResult?.success && directSubmissionsResult?.data?.length > 0) {
          console.log('📋 Using direct API submissions data:', directSubmissionsResult.data);
          console.log('📋 Number of direct submissions found:', directSubmissionsResult.data.length);
          
          // Log detail setiap submission
          directSubmissionsResult.data.forEach((submission: any, index: number) => {
            console.log(`  ${index + 1}. ID: ${submission.id}, Attempt: ${submission.attemptNumber}, Status: ${submission.status}`);
          });
          
          // Pastikan data terurut berdasarkan attemptNumber (descending)
          const sortedSubmissions = [...directSubmissionsResult.data].sort((a, b) => 
            (b.attemptNumber || 0) - (a.attemptNumber || 0)
          );
          console.log('📋 Sorted direct submissions:', sortedSubmissions.length);
          setSubmissions(sortedSubmissions as SubmissionData[]);
        } 
        // Fallback ke getStudentSubmissionHistory jika API langsung tidak berhasil
        else if (submissionResult.success && submissionResult.data) {
          console.log('📋 Falling back to server action data:', submissionResult.data);
          console.log('📋 Number of submissions found:', submissionResult.data.length);
          
          // Log detail setiap submission
          submissionResult.data.forEach((submission: any, index: number) => {
            console.log(`  ${index + 1}. ID: ${submission.id}, Attempt: ${submission.attemptNumber}, Status: ${submission.status}, assistanceLevel: ${submission.assistanceLevel}`);
          });
          
          // Pastikan data terurut berdasarkan attemptNumber (descending)
          const sortedSubmissions = [...submissionResult.data].sort((a, b) => 
            (b.attemptNumber || 0) - (a.attemptNumber || 0)
          );
          console.log('📋 Sorted submissions:', sortedSubmissions.length);
          setSubmissions(sortedSubmissions as SubmissionData[]);
        } else {
          console.error('❌ Failed to fetch submissions from both sources');
          setError("Gagal memuat riwayat submisi.");
          setSubmissions([]);
        }
      } catch (err) {
        console.error('❌ Error fetching submission history:', err);
        setError("Terjadi kesalahan saat mengambil data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [quizId]);

  // Fungsi helper untuk mendapatkan icon dan warna status
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case SubmissionStatus.PASSED:
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Semua Jawaban Benar",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-700",
        };
      case SubmissionStatus.FAILED:
        return {
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          text: "Ada Jawaban Salah",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-700",
        };
      case SubmissionStatus.PENDING:
      default:
        return {
          icon: <CheckCircle className="h-5 w-5 text-blue-500" />,
          text: "Telah Dinilai Otomatis",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-700",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Memuat riwayat...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-destructive font-medium">{error || "Kuis tidak ditemukan"}</p>
        <Button onClick={() => router.push(`/student/quizzes/${quizId}`)} className="mt-4">
          Kembali ke Kuis
        </Button>
      </div>
    );
  }

  // Modifikasi karena assistanceSubmissions tidak di-load untuk sementara
  const hasNoHistory = submissions.length === 0;

  return (
    <div className="container py-8 max-w-3xl">
      <Button variant="outline" onClick={() => router.push(`/student/quizzes/${quizId}`)} className="mb-4">
        Kembali ke Kuis
      </Button>
      
      <Card className="shadow-lg">
        <CardHeader className="bg-gray-50 rounded-t-lg">
          <CardTitle className="text-2xl flex items-center">
            <History className="h-6 w-6 mr-2 text-primary" /> 
            Riwayat Pengerjaan Kuis Utama
          </CardTitle>
          {/* Tampilkan judul kuis jika quizDetails berhasil di-load */} 
          {quizDetails && <CardDescription className="mt-1">{quizDetails.title}</CardDescription>}
          {quizDetails?.description && (
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {quizDetails.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {hasNoHistory ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-muted rounded-full p-3 mb-4">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">Belum Ada Riwayat</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Anda belum pernah mengirimkan jawaban untuk kuis ini.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-6 rounded-r-lg">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <History className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Ringkasan Pengerjaan
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Total percobaan: <span className="font-semibold">{submissions.length}</span></p>
                      {submissions.length > 0 && (
                        <>
                          <p>Percobaan terbaru: <span className="font-semibold">#{submissions[0].attemptNumber}</span></p>
                          <p>Status terbaru: <span className="font-semibold">
                            {submissions[0].status === 'PASSED' && 'Lulus ✅'}
                            {submissions[0].status === 'FAILED' && 'Belum Lulus ❌'}
                            {submissions[0].status === 'PENDING' && 'Telah Dinilai Otomatis 📝'}
                          </span></p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Submisi Kuis Utama */}
              {submissions.length > 0 && (
                <div className="px-6">
                  <h3 className="text-lg font-medium mb-3">Detail Semua Percobaan</h3>
                  
                  <div className="space-y-4">
                    {submissions.map((submission) => {
                      const statusDisplay = getStatusDisplay(submission.status);
                      
                      return (
                        <div 
                          key={submission.id} 
                          className={cn(
                            "border rounded-lg p-4",
                            statusDisplay.bgColor, 
                            statusDisplay.borderColor
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                            <div className="flex items-center">
                              {statusDisplay.icon}
                              <span className={cn("ml-2 font-medium", statusDisplay.textColor)}>
                                {statusDisplay.text}
                              </span>
                              <span className="ml-4 text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                                Percobaan #{submission.attemptNumber || "?"}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatRelative(new Date(submission.createdAt), new Date(), { locale: id })}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 my-2">
                            <span className="text-sm font-medium">Skor:</span>
                            {submission.status === 'PENDING' ? (
                              <span className="text-sm text-blue-600">Telah Dinilai Otomatis: {submission.score || 0}%</span>
                            ) : (
                              <>
                                <span className="text-sm">{submission.score || 0}%</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({submission.answers.filter((a: SubmissionAnswer) => a.isCorrect === true).length} dari {submission.answers.length} pertanyaan benar)
                                </span>
                              </>
                            )}
                          </div>
                          
                          {submission.feedback && (
                            <div className="mt-3 bg-background rounded-md p-3 border">
                              <p className="text-sm font-medium mb-1">Umpan Balik:</p>
                              <p className="text-sm">{submission.feedback}</p>
                            </div>
                          )}
                          
                          <div className="mt-3">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/student/quizzes/${quizId}/submissions/${submission.id}`)}
                            >
                              Lihat Detail Jawaban
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}