"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Loader2, AlertCircle, ChevronLeft, Check, X, Calendar } from "lucide-react";
import { getStudentSubmissionDetail } from "@/lib/actions/quiz-submission-actions"; 
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { SubmissionStatus } from "@/types";

// Interface definitions
interface Question {
  id: string;
  text: string;
  correctAnswer?: string | null;
}

interface Answer {
  id: string;
  answerText: string;
  isCorrect: boolean | null;
  feedback?: string | null;
  question: Question;
}

interface Submission {
  id: string;
  status: SubmissionStatus;
  score?: number | null;
  correctAnswers?: number;
  totalQuestions?: number;
  attemptNumber: number;
  createdAt: string | Date;
  feedback?: string | null;
  quiz: {
    title?: string;
    description?: string;
  };
  answers: Answer[];
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  const quizId = params.quizId as string;
  
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const result = await getStudentSubmissionDetail(submissionId);
        
        if (!result.success) {
          setError(result.message || "Gagal memuat data submisi");
          setLoading(false);
          return;
        }
        
        setSubmission(result.data as Submission);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data");
        setLoading(false);
      }
    }
    
    loadData();
  }, [submissionId]);
  
  // Handle kembali ke halaman riwayat
  const handleBack = () => {
    router.push(`/student/quizzes/${quizId}/history`);
  };
  
  // Helper untuk mendapatkan desain status
  const getStatusDesign = (status: string) => {
    switch (status) {
      case SubmissionStatus.PASSED:
        return {
          icon: <Check className="h-5 w-5 text-green-500" />,
          label: "Semua Jawaban Benar",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-700"
        };
      case SubmissionStatus.FAILED:
        return {
          icon: <X className="h-5 w-5 text-destructive" />,
          label: "Ada Jawaban Salah",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-700"
        };
      case SubmissionStatus.PENDING:
      default:
        return {
          icon: <Check className="h-5 w-5 text-blue-500" />,
          label: "Telah Dinilai Otomatis",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-700"
        };
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat detail submisi...</p>
      </div>
    );
  }
  
  // Render error state
  if (error || !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-destructive font-medium">{error || "Submisi tidak ditemukan"}</p>
        <Button onClick={handleBack} className="mt-4">
          Kembali ke Riwayat
        </Button>
      </div>
    );
  }
  
  const statusDesign = getStatusDesign(submission.status);
  const quiz = submission.quiz || {};
  const answers = submission.answers || [];
  
  return (
    <div className="container py-8 max-w-3xl">
      <Button variant="outline" onClick={handleBack} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Kembali ke Riwayat
      </Button>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2">
            <CardTitle>{quiz.title || "Detail Submisi"}</CardTitle>
            <CardDescription>{quiz.description}</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Header Informasi */}
          <div 
            className={cn(
              "border rounded-lg p-4 mb-6",
              statusDesign.bgColor, 
              statusDesign.borderColor
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div className="flex items-center">
                {statusDesign.icon}
                <span className={cn("ml-2 font-medium", statusDesign.textColor)}>
                  {statusDesign.label}
                </span>
                <span className="ml-4 text-sm text-muted-foreground">
                  Percobaan #{submission.attemptNumber}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  Dikerjakan pada {format(new Date(submission.createdAt), "dd MMMM yyyy, HH:mm", { locale: id })}
                </span>
              </div>
              
              {submission.score !== null && (
                <div className="flex items-center text-sm">
                  <span className="font-medium">Skor:</span>
                  <span className="ml-2">{submission.score}%</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({submission.correctAnswers || 0} dari {submission.totalQuestions || 0} pertanyaan benar)
                  </span>
                </div>
              )}
            </div>
            
            {submission.feedback && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-1">Umpan Balik Pengajar:</h3>
                <div className="bg-background rounded-md p-3 border">
                  <p className="text-sm">{submission.feedback}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Daftar Jawaban */}
          <div>
            <h3 className="font-medium text-lg mb-4">Jawaban Anda</h3>
            <div className="space-y-6">
              {answers.length === 0 ? (
                <div className="text-center p-6 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Tidak ada data jawaban</p>
                </div>
              ) : (
                answers.map((answer: Answer, index: number) => {
                  const question = answer.question || {};
                  return (
                    <div key={answer.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-4">
                        <div className="flex justify-between">
                          <h4 className="font-medium">
                            Pertanyaan {index + 1}{" "}
                            {answer.isCorrect !== null && (
                              answer.isCorrect ? (
                                <span className="ml-2 inline-flex items-center text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                                  <Check className="h-3 w-3 mr-1" />
                                  Benar
                                </span>
                              ) : (
                                <span className="ml-2 inline-flex items-center text-xs font-medium text-red-700 bg-red-50 rounded-full px-2 py-0.5">
                                  <X className="h-3 w-3 mr-1" />
                                  Salah
                                </span>
                              )
                            )}
                          </h4>
                        </div>
                        <p>{question.text}</p>
                      </div>
                      
                      <div className="p-4">
                        <h5 className="text-sm font-medium mb-2 text-muted-foreground">Jawaban Anda:</h5>
                        <div className="p-3 bg-muted/30 rounded-md">
                          <p className="text-sm">{answer.answerText}</p>
                        </div>
                        
                        {question.correctAnswer && answer.isCorrect === false && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium mb-2 text-muted-foreground">Jawaban Benar:</h5>
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                              <p className="text-sm text-green-700">{question.correctAnswer}</p>
                            </div>
                          </div>
                        )}
                        
                        {answer.feedback && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium mb-2 text-muted-foreground">Umpan Balik:</h5>
                            <div className="p-3 bg-background border rounded-md">
                              <p className="text-sm">{answer.feedback}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 