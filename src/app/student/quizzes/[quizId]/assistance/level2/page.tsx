"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getAssistanceLevel2, getLatestLevel2Submission, submitAssistanceLevel2 } from "@/lib/actions/assistance-level2-actions";
import { getStudentQuizStatus } from "@/lib/actions/quiz-progress-actions";
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, XCircle, HelpCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubmissionStatus } from "@/types";

// Definisi interface lokal yang digunakan di halaman ini
interface AssistanceLevel2Submission {
  id?: string;
  status: SubmissionStatus;
  feedback?: string | null;
  hints?: Record<string, string>;
  correctAnswers?: Record<string, string>;
}

export default function AssistanceLevel2Page() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  
  const [loading, setLoading] = useState(true);
  const [assistance, setAssistance] = useState<any>(null);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<AssistanceLevel2Submission | null>(null);
  const [quizStatus, setQuizStatus] = useState<any>(null);
  const [showHints, setShowHints] = useState<{[key: string]: boolean}>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<{[key: string]: string}>({});
  
  // State untuk alur bertahap
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  
  // Muat data bantuan level 2
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
        
        // Periksa apakah ada bantuan level 2
        if (!quizStatusData.assistanceStatus.level2.available) {
          setError("Bantuan level 2 tidak tersedia untuk kuis ini");
          setLoading(false);
          return;
        }
        
        // Periksa apakah bantuan level 2 sudah selesai
        if (quizStatusData.assistanceStatus.level2.completed) {
          // Tampilkan submisi terakhir dan pastikan memiliki struktur yang benar
          if (quizStatusData.assistanceStatus.level2.latestSubmission) {
            const submissionData = quizStatusData.assistanceStatus.level2.latestSubmission;
            // Format data submission sesuai dengan interface yang kita butuhkan
            const formattedSubmission: AssistanceLevel2Submission = {
              id: submissionData.id,
              status: submissionData.status as SubmissionStatus,
              feedback: submissionData.feedback || null
            };
            setSubmission(formattedSubmission);
          }
          setLoading(false);
          return;
        }
        
        // Dapatkan data bantuan level 2
        const assistanceId = quizStatusData.assistanceStatus.level2.assistanceId;
        if (!assistanceId) {
          setError("ID bantuan level 2 tidak ditemukan");
          setLoading(false);
          return;
        }
        
        const assistanceResult = await getAssistanceLevel2(assistanceId);
        
        if (!assistanceResult.success) {
          setError(assistanceResult.message || "Gagal memuat bantuan level 2");
          setLoading(false);
          return;
        }
        
        setAssistance(assistanceResult.data);
        
        // Periksa apakah ada submisi terakhir
        if (assistanceId) {
          const submissionResult = await getLatestLevel2Submission(
            assistanceId,
            ""
          );
          
          if (submissionResult.success && submissionResult.data) {
            const submissionData = submissionResult.data;
            
            // Format data submission sesuai dengan struktur API
            const formattedSubmission: AssistanceLevel2Submission = {
              id: submissionData.id,
              status: submissionData.status as SubmissionStatus,
              hints: submissionData.hints,
              correctAnswers: submissionData.correctAnswers,
              feedback: submissionData.feedback || null
            };
            
            setSubmission(formattedSubmission);
            
            // Muat jawaban terakhir jika submisi gagal dan ada contoh jawaban benar
            if (formattedSubmission.status === SubmissionStatus.FAILED && 
                formattedSubmission.correctAnswers && 
                Object.keys(formattedSubmission.correctAnswers).length > 0) {
              
              // Gunakan contoh jawaban sebagai tampilan untuk jawaban saat ini
              setAnswers(formattedSubmission.correctAnswers);
            }
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
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  // Handle lanjut ke pertanyaan berikutnya
  const handleNextQuestion = () => {
    if (!assistance || !assistance.questions) return;
    
    // Validasi jawaban saat ini
    const currentQuestion = assistance.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id];
    
    if (!currentAnswer || currentAnswer.trim() === "") {
      toast.error("Harap isi jawaban Anda terlebih dahulu");
      return;
    }
    
    // Tandai pertanyaan ini sebagai terjawab
    if (!answeredQuestions.includes(currentQuestionIndex)) {
      setAnsweredQuestions(prev => [...prev, currentQuestionIndex]);
    }
    
    // Jika ini bukan pertanyaan terakhir, lanjut ke pertanyaan berikutnya
    if (currentQuestionIndex < assistance.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Handle kembali ke pertanyaan sebelumnya
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Handle submit jawaban
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      // Validasi form
      const questionIds = assistance.questions.map((q: any) => q.id);
      const missingAnswers = questionIds.filter((id: string) => !answers[id] || answers[id].trim() === "");
      
      if (missingAnswers.length > 0) {
        setError(`Harap jawab semua pertanyaan (${missingAnswers.length} belum dijawab)`);
        setSubmitting(false);
        return;
      }
      
      // Transform format jawaban sesuai dengan API - array of objects dengan questionId dan answerText
      const answersPayload = Object.entries(answers).map(([questionId, answerText]) => ({
        questionId,
        answerText
      }));
      
      // Simpan jawaban yang telah dikirim untuk ditampilkan nanti
      setSubmittedAnswers(answers);
      
      // Submit jawaban
      const result = await submitAssistanceLevel2(
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
      
      toast.success("Jawaban berhasil dikirim! Mengarahkan ke halaman kuis...");
      
      // Langsung arahkan ke halaman kuis utama
      setTimeout(() => {
        router.push(`/student/quizzes/${quizId}`);
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat mengirimkan jawaban");
      setSubmitting(false);
    }
  };
  
  // Handle toggle petunjuk
  const toggleHint = (questionId: string) => {
    setShowHints((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };
  
  // Handle kembali ke halaman kuis
  const handleBack = () => {
    router.push(`/student/quizzes/${quizId}`);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat bantuan level 2...</p>
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
  
  // Render submisi berhasil (jika level 2 selesai)
  if (quizStatus?.assistanceStatus.level2.completed) {
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Bantuan Level 2 Selesai</CardTitle>
                <CardDescription>
                  Anda telah menyelesaikan bantuan level 2 untuk kuis ini
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
                <p className="text-sm font-medium mb-2">Status Submisi:</p>
                <p className="text-sm">Status: {
                  submission.status === SubmissionStatus.PASSED ? "Lulus" :
                  submission.status === SubmissionStatus.FAILED ? "Tidak Lulus" :
                  "Menunggu Penilaian"
                }</p>
                {submission.feedback && (
                  <div className="mt-3 p-3 bg-background rounded border text-sm">
                    <p className="font-medium mb-1">Umpan Balik dari Guru:</p>
                    <p>{submission.feedback}</p>
                  </div>
                )}
                
                {submission.status === SubmissionStatus.FAILED && (
                  <Alert className="mt-4 bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-800">
                      <p className="font-semibold">Jawaban Anda belum memenuhi kriteria!</p>
                      <p className="mt-1">Berdasarkan penilaian guru, Anda perlu mengerjakan kembali bantuan level 2 ini.</p>
                      
                      <Button 
                        onClick={() => router.push(`/student/quizzes/${quizId}`)} 
                        className="mt-3 bg-red-600 hover:bg-red-700"
                      >
                        Kembali ke Kuis untuk Mencoba Lagi
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
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
  
  // Render hasil submisi yang menunggu penilaian
  if (submission && submission.status === SubmissionStatus.PENDING) {
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{assistance?.title || "Bantuan Level 2"}</CardTitle>
                <CardDescription>
                  {assistance?.description || "Jawaban Anda sedang dinilai oleh guru"}
                </CardDescription>
              </div>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription>
                Jawaban Anda telah dikirim dan sedang dinilai oleh guru. Anda akan segera dialihkan ke halaman kuis.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center mt-6">
              <Button onClick={handleBack}>
                Kembali ke Kuis Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render bantuan level 2 bertahap
  if (assistance && assistance.questions && assistance.questions.length > 0) {
    const currentQuestion = assistance.questions[currentQuestionIndex];
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === assistance.questions.length - 1;
    const hasAnsweredCurrentQuestion = answers[currentQuestion.id] && answers[currentQuestion.id].trim() !== "";
    
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{assistance.title}</CardTitle>
                <CardDescription>
                  {assistance.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress indicator */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  Pertanyaan {currentQuestionIndex + 1} dari {assistance.questions.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {answeredQuestions.length} terjawab
                </p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary"
                  style={{ width: `${(answeredQuestions.length / assistance.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* Tampilkan jawaban sebelumnya */}
            {answeredQuestions.length > 0 && answeredQuestions.includes(currentQuestionIndex - 1) && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Jawaban Sebelumnya:</h3>
                <div className="space-y-3">
                  {answeredQuestions.map((idx) => {
                    if (idx < currentQuestionIndex) {
                      const q = assistance.questions[idx];
                      return (
                        <div key={q.id} className="p-3 rounded-lg border bg-muted/30">
                          <p className="text-sm font-medium mb-1">{idx + 1}. {q.question}</p>
                          <div className="p-2 bg-background rounded border">
                            <p className="whitespace-pre-wrap text-sm">{answers[q.id]}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                <Separator className="my-4" />
              </div>
            )}
            
            {/* Pertanyaan saat ini */}
            <div className="p-4 rounded-lg border">
              <div className="flex justify-between">
                <p className="font-medium mb-3">{currentQuestionIndex + 1}. {currentQuestion.question}</p>
                {currentQuestion.hint && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleHint(currentQuestion.id)}
                    className="h-8 px-2 text-muted-foreground"
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Petunjuk
                  </Button>
                )}
              </div>
              
              {showHints[currentQuestion.id] && currentQuestion.hint && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm mb-3">
                  <p className="font-medium mb-1">Petunjuk:</p>
                  <p>{currentQuestion.hint}</p>
                </div>
              )}
              
              <Textarea
                placeholder="Tulis jawaban Anda di sini..."
                className="min-h-[120px]"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              />
            </div>
            
            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              <Button 
                variant="outline" 
                onClick={handlePrevQuestion}
                disabled={isFirstQuestion}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Sebelumnya
              </Button>
            </div>
            
            <div className="flex gap-2">
              {isLastQuestion && answeredQuestions.length === assistance.questions.length - 1 && hasAnsweredCurrentQuestion ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    'Kirim Semua Jawaban'
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNextQuestion}
                  disabled={!hasAnsweredCurrentQuestion}
                >
                  {isLastQuestion ? 'Selesai' : 'Selanjutnya'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-8 max-w-3xl">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Tidak ada pertanyaan untuk bantuan level 2
        </AlertDescription>
      </Alert>
      <div className="flex justify-center mt-4">
        <Button onClick={handleBack}>
          Kembali ke Kuis
        </Button>
      </div>
    </div>
  );
} 