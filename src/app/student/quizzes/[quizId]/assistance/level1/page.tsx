"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAssistanceLevel1, getLatestLevel1Submission, submitAssistanceLevel1 } from "@/lib/actions/assistance-level1-actions";
import { getOrCreateQuizProgress, getStudentQuizStatus } from "@/lib/actions/quiz-progress-actions";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Definisi interface lokal yang digunakan di halaman ini
interface AssistanceSubmission {
  id?: string;
  passed: boolean;
  score: number;
  totalQuestions: number;
  scorePercentage: number;
  passingScore: number;
  answers: Record<string, boolean>;
  correctAnswers: Record<string, boolean>;
  explanations: Record<string, string>;
}

// Helper untuk mengubah data API menjadi format yang diharapkan
function formatSubmissionData(apiData: any): AssistanceSubmission {
  // Default values untuk semua property
  const formattedData = {
    id: apiData?.id,
    passed: apiData?.passed || (apiData?.status === 'PASSED') || false,
    score: apiData?.score || 0,
    totalQuestions: apiData?.totalQuestions || 0,
    scorePercentage: apiData?.scorePercentage || 0,
    passingScore: apiData?.passingScore || 0,
    correctAnswers: apiData?.correctAnswers || {},
    explanations: apiData?.explanations || {},
    // Konversi answers dari Array ke Object dengan format { questionId: answer }
    answers: {}
  };
  
  // Jika answers adalah array (dari Prisma), konversi ke format { questionId: answer }
  if (Array.isArray(apiData?.answers)) {
    apiData.answers.forEach((ans: any) => {
      if (ans.questionId) {
        (formattedData.answers as any)[ans.questionId] = ans.answer;
      }
    });
  } else if (typeof apiData?.answers === 'object') {
    formattedData.answers = apiData?.answers || {};
  }
  
  return formattedData as AssistanceSubmission;
}

export default function AssistanceLevel1Page() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  
  const [loading, setLoading] = useState(true);
  const [assistance, setAssistance] = useState<any>(null);
  const [answers, setAnswers] = useState<{[key: string]: boolean}>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<AssistanceSubmission | null>(null);
  const [quizStatus, setQuizStatus] = useState<any>(null);
  
  // Muat data bantuan level 1
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Dapatkan status kuis
        const statusResult = await getStudentQuizStatus(quizId, "");
        
        if (!statusResult.success || !statusResult.data) {
          setError(statusResult.message || "Gagal memuat status kuis");
          setLoading(false);
          return;
        }
        
        const quizStatusData = statusResult.data;
        setQuizStatus(quizStatusData);
        
        // Periksa apakah ada bantuan level 1
        if (!quizStatusData.assistanceStatus.level1.available) {
          setError("Bantuan level 1 tidak tersedia untuk kuis ini");
          setLoading(false);
          return;
        }
        
        // Periksa apakah bantuan level 1 sudah selesai
        if (quizStatusData.assistanceStatus.level1.completed) {
          // Tampilkan submisi terakhir
          if (quizStatusData.assistanceStatus.level1.latestSubmission) {
            // Gunakan helper function untuk format data
            const formattedSubmission = formatSubmissionData(
              quizStatusData.assistanceStatus.level1.latestSubmission
            );
            setSubmission(formattedSubmission);
          }
          setLoading(false);
          return;
        }
        
        // Dapatkan data bantuan level 1
        const assistanceId = quizStatusData.assistanceStatus.level1.assistanceId;
        if (!assistanceId) {
          setError("ID bantuan level 1 tidak ditemukan");
          setLoading(false);
          return;
        }
        
        const assistanceResult = await getAssistanceLevel1(assistanceId);
        
        if (!assistanceResult.success) {
          setError(assistanceResult.message || "Gagal memuat bantuan level 1");
          setLoading(false);
          return;
        }
        
        setAssistance(assistanceResult.data);
        
        // Periksa apakah ada submisi terakhir
        if (assistanceId) {
          const submissionResult = await getLatestLevel1Submission(
            assistanceId,
            ""
          );
          
          if (submissionResult.success && submissionResult.data) {
            // Gunakan helper function untuk format data
            const formattedSubmission = formatSubmissionData(submissionResult.data);
            setSubmission(formattedSubmission);
          }
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
  
  // Handle perubahan jawaban
  const handleAnswerChange = (questionId: string, value: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  // Handle submit jawaban
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      // Validasi form
      const questionIds = assistance?.questions?.map((q: any) => q.id) || [];
      const missingAnswers = questionIds.filter((id: string) => answers[id] === undefined);
      
      if (missingAnswers.length > 0) {
        setError(`Harap jawab semua pertanyaan (${missingAnswers.length} belum dijawab)`);
        setSubmitting(false);
        return;
      }
      
      // Transform format jawaban sesuai dengan API
      const answersPayload = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      
      // Submit jawaban
      const result = await submitAssistanceLevel1(
        {
          assistanceId: assistance.id,
          answers: answersPayload
        },
        assistance.id
      );
      
      if (!result.success) {
        setError(result.message || "Gagal mengirimkan jawaban");
        setSubmitting(false);
        return;
      }
      
      // Gunakan helper function untuk format data
      const formattedSubmission = formatSubmissionData(result.data);
      setSubmission(formattedSubmission);
      
      if (formattedSubmission.passed) {
        toast.success("Bantuan level 1 berhasil diselesaikan!", {
          description: "Anda dapat melanjutkan untuk mengerjakan kuis utama"
        });
      } else {
        toast.error("Jawaban Anda belum mencukupi", {
          description: "Silakan pelajari petunjuk dan jawaban yang benar, lalu coba lagi"
        });
      }
      
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat mengirimkan jawaban");
      setSubmitting(false);
    }
  };
  
  // Handle kembali ke halaman kuis
  const handleBack = () => {
    router.push(`/student/quizzes/${quizId}`);
  };
  
  // Handle coba lagi
  const handleRetry = () => {
    setSubmission(null);
    setAnswers({});
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat bantuan level 1...</p>
      </div>
    );
  }
  
  // Render error state
  if (error && !assistance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-destructive font-medium">{error}</p>
        <Button onClick={handleBack} className="mt-4">
          Kembali ke Kuis
        </Button>
      </div>
    );
  }
  
  // Render submisi berhasil (jika level 1 selesai)
  if (quizStatus?.assistanceStatus.level1.completed) {
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Bantuan Level 1 Selesai</CardTitle>
                <CardDescription>
                  Anda telah menyelesaikan bantuan level 1 untuk kuis ini
                </CardDescription>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Anda dapat melanjutkan untuk mengerjakan kuis utama
              </AlertDescription>
            </Alert>
            
            {submission && (
              <div>
                <p className="text-sm font-medium mb-2">Hasil Terakhir:</p>
                <p className="text-sm">Skor: {submission.scorePercentage.toFixed(0)}%</p>
                <p className="text-sm">Batas Lulus: {submission.passingScore}%</p>
                <p className="text-sm">Status: {submission.passed ? "Lulus" : "Tidak Lulus"}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleBack}>
              Kembali ke Kuis
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render hasil submisi
  if (submission) {
    // Pastikan assistance.questions exists dan buat questionResults dengan aman
    const questionResults = assistance?.questions?.map((question: any) => {
      // Cari jawaban pengguna berdasarkan questionId di array submission.answers
      const userAnswer = submission.answers[question.id];
      const correctAnswer = submission.correctAnswers[question.id];
      const isCorrect = userAnswer === correctAnswer;
      
      console.log(`Question ${question.id}:`, { 
        question: question.question || question.text, 
        userAnswer, 
        correctAnswer, 
        isCorrect 
      });
      
      return { ...question, isCorrect, userAnswer };
    }) || [];
    
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{assistance?.title || "Bantuan Level 1"}</CardTitle>
                <CardDescription>
                  {assistance?.description || ""}
                </CardDescription>
              </div>
              {submission.passed ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Alert className={cn(
                "mb-4", 
                submission.passed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              )}>
                {submission.passed ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                <AlertDescription>
                  {submission.passed
                    ? "Bantuan level 1 berhasil diselesaikan! Silakan tunggu guru Anda mengaktifkan kuis utama untuk Anda."
                    : "Anda harus menjawab semua pertanyaan dengan benar (100%) untuk dapat melanjutkan. Silakan coba lagi."}
                </AlertDescription>
              </Alert>
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Hasil:</p>
                <p className="text-sm">Skor: {submission.scorePercentage.toFixed(0)}%</p>
                <p className="text-sm">Batas Lulus: 100%</p>
                <p className="text-sm">Benar: {submission.score} dari {submission.totalQuestions}</p>
                <p className="text-sm mt-2 font-medium text-blue-600">
                  Status: {submission.passed ? "Menunggu persetujuan guru" : "Perlu mengulang"}
                </p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              {questionResults.map((question: any, index: number) => (
                <div 
                  key={question.id} 
                  className={cn(
                    "p-4 rounded-lg border",
                    question.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{index + 1}. {question.question || question.text}</p>
                      <div className="mt-2 flex items-center">
                        <p className="text-sm mr-2">Jawaban Anda:</p>
                        <span className={cn(
                          "text-sm font-medium",
                          question.isCorrect ? "text-green-600" : "text-red-600"
                        )}>
                          {question.userAnswer ? "Ya" : "Tidak"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <p className="text-sm mr-2">Jawaban Benar:</p>
                        <span className="text-sm font-medium text-green-600">
                          {submission.correctAnswers[question.id] ? "Ya" : "Tidak"}
                        </span>
                      </div>
                    </div>
                    <div>
                      {question.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </div>
                  
                  {submission.explanations[question.id] && (
                    <div className="mt-3 p-3 bg-background rounded border text-sm">
                      <p className="font-medium mb-1">Penjelasan:</p>
                      <p>{submission.explanations[question.id]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-start sm:items-center">
            <Button onClick={handleBack} variant="outline">
              Kembali ke Kuis
            </Button>
            {!submission.passed && (
              <Button onClick={handleRetry} variant="default" className="bg-amber-600 hover:bg-amber-700">
                Coba Lagi
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Render form bantuan level 1
  return (
    <div className="container py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{assistance?.title || "Bantuan Level 1"}</CardTitle>
          <CardDescription>
            {assistance?.description || ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            {assistance?.questions?.map((question: any, index: number) => {
              // Cek apakah jawaban sudah disubmit dan salah (untuk highlight)
              const isSubmitted = submission !== null;
              const userAnswer = answers[question.id]; 
              const correctAnswer = isSubmitted && submission?.correctAnswers ? 
                submission.correctAnswers[question.id] : null;
              const isWrong = isSubmitted && userAnswer !== undefined && userAnswer !== correctAnswer;
              const explanation = isSubmitted && isWrong && submission?.explanations ? 
                submission.explanations[question.id] : null;
              
              return (
                <div 
                  key={question.id} 
                  className={cn(
                    "p-4 rounded-lg border",
                    isWrong ? "border-red-300 bg-red-50" : ""
                  )}
                >
                  <div className="flex items-start gap-2">
                    <p className="font-medium mb-3 flex-1">{index + 1}. {question.question || question.text}</p>
                    {isWrong && (
                      <div className="text-red-500 flex items-center">
                        <XCircle className="h-5 w-5 mr-1" />
                        <span className="text-sm">Salah</span>
                      </div>
                    )}
                  </div>
                  
                  <RadioGroup
                    value={answers[question.id]?.toString()}
                    onValueChange={(value) => handleAnswerChange(question.id, value === "true")}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id={`yes-${question.id}`} />
                      <Label htmlFor={`yes-${question.id}`}>Ya</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id={`no-${question.id}`} />
                      <Label htmlFor={`no-${question.id}`}>Tidak</Label>
                    </div>
                  </RadioGroup>
                  
                  {isWrong && explanation && (
                    <div className="mt-3 text-sm p-2 bg-red-100 border border-red-200 rounded text-red-800">
                      <p className="font-medium">Penjelasan:</p>
                      <p>{explanation}</p>
                      <p className="mt-1 font-medium">Jawaban yang benar: {correctAnswer ? "Ya" : "Tidak"}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-start sm:items-center">
          <Button onClick={handleBack} variant="outline">
            Kembali ke Kuis
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Mengirim...</span>
              </>
            ) : (
              <span>Kirim Jawaban</span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}