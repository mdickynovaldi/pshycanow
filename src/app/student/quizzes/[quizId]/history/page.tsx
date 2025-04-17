"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, ChevronLeft, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { getStudentSubmissionHistory } from "@/lib/actions/quiz-submission-actions";
import { getAssistanceLevel2SubmissionHistory } from "@/lib/actions/assistance-actions";
import { getQuizById } from "@/lib/actions/quiz-actions";
import { cn } from "@/lib/utils";
import { formatRelative } from "date-fns";
import { id } from "date-fns/locale";
import { SubmissionStatus } from "@/types";

export default function QuizHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assistanceLevel2Submissions, setAssistanceLevel2Submissions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Dapatkan informasi kuis
        const quizResult = await getQuizById(quizId);
        
        if (!quizResult.success) {
          setError(quizResult.message || "Gagal memuat kuis");
          setLoading(false);
          return;
        }
        
        setQuiz(quizResult.data);
        
        // Dapatkan riwayat submisi kuis utama
        const submissionsResult = await getStudentSubmissionHistory(quizId);
        
        if (submissionsResult.success) {
          setSubmissions(submissionsResult.data || []);
        }
        
        // Dapatkan riwayat submisi bantuan level 2
        const assistanceLevel2Result = await getAssistanceLevel2SubmissionHistory(quizId);
        
        if (assistanceLevel2Result.success) {
          setAssistanceLevel2Submissions(assistanceLevel2Result.data || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data");
        setLoading(false);
      }
    }
    
    loadData();
  }, [quizId]);
  
  // Handle kembali ke halaman kuis
  const handleBack = () => {
    router.push(`/student/quizzes/${quizId}`);
  };
  
  // Handle lihat detil submisi
  const handleViewSubmission = (submissionId: string) => {
    router.push(`/student/quizzes/${quizId}/submissions/${submissionId}`);
  };
  
  // Handle lihat bantuan level 2
  const handleViewAssistanceLevel2 = () => {
    router.push(`/student/quizzes/${quizId}/assistance/level2`);
  };
  
  // Helper untuk mendapatkan icon dan warna status
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case SubmissionStatus.PASSED:
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Lulus",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-700"
        };
      case SubmissionStatus.FAILED:
        return {
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          text: "Gagal",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-700"
        };
      case SubmissionStatus.PENDING:
      default:
        return {
          icon: <Clock className="h-5 w-5 text-amber-500" />,
          text: "Menunggu Penilaian",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          textColor: "text-amber-700"
        };
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat riwayat kuis...</p>
      </div>
    );
  }
  
  // Render error state
  if (error || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-destructive font-medium">{error || "Kuis tidak ditemukan"}</p>
        <Button onClick={handleBack} className="mt-4">
          Kembali ke Kuis
        </Button>
      </div>
    );
  }
  
  const hasNoHistory = submissions.length === 0 && assistanceLevel2Submissions.length === 0;
  
  return (
    <div className="container py-8 max-w-3xl">
      <Button variant="outline" onClick={handleBack} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Kembali ke Kuis
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Kuis</CardTitle>
          <CardDescription>{quiz.title}</CardDescription>
        </CardHeader>
        <CardContent>
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
              {/* Bantuan Level 2 Submisi */}
              {assistanceLevel2Submissions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    Bantuan Level 2
                  </h3>
                  
                  <div className="space-y-4">
                    {assistanceLevel2Submissions.map((submission) => {
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
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatRelative(new Date(submission.createdAt), new Date(), { locale: id })}
                            </div>
                          </div>
                          
                          {submission.feedback && (
                            <div className="mt-3 bg-background rounded-md p-3 border">
                              <p className="text-sm font-medium mb-1">Umpan Balik:</p>
                              <p className="text-sm">{submission.feedback}</p>
                            </div>
                          )}
                        
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Separator jika ada keduanya */}
              {assistanceLevel2Submissions.length > 0 && submissions.length > 0 && (
                <Separator className="my-6" />
              )}
              
              {/* Submisi Kuis Utama */}
              {submissions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Kuis Utama</h3>
                  
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
                              <span className="ml-4 text-sm text-muted-foreground">
                                Percobaan #{submission.attemptNumber}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatRelative(new Date(submission.createdAt), new Date(), { locale: id })}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 my-2">
                            <span className="text-sm font-medium">Skor:</span>
                            {submission.status === 'PENDING' ? (
                              <span className="text-sm text-amber-600">Menunggu Penilaian</span>
                            ) : (
                              <>
                                <span className="text-sm">{submission.score || 0}%</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({submission.answers.filter((a: any) => a.isCorrect === true).length} dari {submission.answers.length} pertanyaan benar)
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
                              onClick={() => handleViewSubmission(submission.id)}
                            >
                              Lihat Detail
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