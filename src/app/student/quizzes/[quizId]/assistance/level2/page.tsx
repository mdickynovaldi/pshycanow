"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MathEditor } from "@/components/ui/MathEditor";
import { MathRenderer } from "@/components/ui/MathRenderer";
import { getLatestLevel2Submission, submitAssistanceLevel2 } from "@/lib/actions/assistance-level2-actions";
import { getAssistanceLevel2 } from "@/lib/actions/assistance-actions";
import { getStudentQuizStatus } from "@/lib/actions/quiz-progress-actions";
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, HelpCircle, ChevronRight, ChevronLeft } from "lucide-react";

import { SubmissionStatus } from "@/types";

// Definisi interface lokal yang digunakan di halaman ini
interface AssistanceQuestion {
  id: string;
  question: string;
  hint?: string | null;
  correctAnswer?: string; // Kemungkinan ada dari data
  // Tambahkan properti lain dari pertanyaan bantuan level 2 jika ada
}

interface AssistanceLevel2Data {
  id: string;
  title?: string;
  quizTitle?: string;
  description?: string | null;
  questions: AssistanceQuestion[];
  quiz?: { id: string; title: string }; // Menambahkan properti quiz berdasarkan pesan error
  // Tambahkan properti lain dari data bantuan level 2 jika ada
}

interface AssistanceLevel2SubmissionAnswer {
  questionId: string;
  answerText: string;
  // tambahkan properti lain jika ada dari API
}

interface AssistanceLevel2ApiSubmission {
  id: string;
  status: SubmissionStatus;
  feedback?: string | null;
  hints?: Record<string, string>;
  correctAnswers?: Record<string, string>;
  answers?: AssistanceLevel2SubmissionAnswer[]; // Jika API mengembalikan jawaban dalam submisi
}

interface AssistanceLevel2Submission {
  id?: string;
  status: SubmissionStatus;
  feedback?: string | null;
  hints?: Record<string, string>;
  correctAnswers?: Record<string, string>;
}

// Interface untuk status level bantuan dari API getStudentQuizStatus
interface AssistanceLevelStatus {
  available: boolean;
  completed: boolean;
  assistanceId?: string | null; // ID bantuan bisa null atau string
  latestSubmission?: AssistanceLevel2ApiSubmission | null; // Submisi terakhir bisa null atau objek
}

// Interface untuk data status kuis secara keseluruhan
interface QuizStatusData {
  assistanceStatus: {
    level1: AssistanceLevelStatus; // Asumsi level 1 juga memiliki struktur serupa
    level2: AssistanceLevelStatus;
    level3: AssistanceLevelStatus; // Asumsi level 3 juga memiliki struktur serupa
  };
  // Tambahkan properti lain yang relevan dari getStudentQuizStatus jika ada
}

export default function AssistanceLevel2Page() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  
  const [loading, setLoading] = useState(true);
  const [assistance, setAssistance] = useState<AssistanceLevel2Data | null>(null);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<AssistanceLevel2Submission | null>(null);
  const [quizStatus, setQuizStatus] = useState<QuizStatusData | null>(null);
  const [showHints, setShowHints] = useState<{[key: string]: boolean}>({});
  
  // State untuk alur bertahap
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  
  // Muat data bantuan level 2
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        console.log("Memuat data bantuan level 2 untuk quizId:", quizId);
        
        // Dapatkan status kuis
        const statusResult = await getStudentQuizStatus(quizId, "");
        
        if (!statusResult.success || !statusResult.data) {
          console.error("Gagal memuat status kuis:", statusResult);
          setError(statusResult.message || "Gagal memuat status kuis");
          setLoading(false);
          return;
        }
        
        // Tipenya sekarang adalah QuizStatusData
        const quizStatusData = statusResult.data as QuizStatusData; 
        setQuizStatus(quizStatusData);
        console.log("Data status kuis:", quizStatusData);
        
        // Periksa apakah ada bantuan level 2
        if (!quizStatusData.assistanceStatus.level2.available) {
          console.log("Bantuan level 2 tidak tersedia untuk kuis ini dalam status kuis, mencoba direct access...");
          // Biarkan proses berlanjut, karena kita masih bisa coba akses langsung
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
              feedback: submissionData.feedback || null,
              hints: submissionData.hints,
              correctAnswers: submissionData.correctAnswers,
            };
            setSubmission(formattedSubmission);
          }
          setLoading(false);
          return;
        }
        
        // Tambahkan variable untuk debugging
        const overrideValidation = true;
        
        // Gunakan quizId dari URL dan parameter skipValidation untuk mengakses bantuan level 2
        // Tidak perlu bergantung pada assistanceId dari status kuis
        const assistanceResult = await getAssistanceLevel2(quizId, overrideValidation);
        console.log("Hasil permintaan bantuan level 2:", assistanceResult);
        
        if (!assistanceResult.success || !assistanceResult.data) {
          console.error("Gagal memuat bantuan level 2:", assistanceResult);
          setError(assistanceResult.message || "Gagal memuat bantuan level 2");
          setLoading(false);
          return;
        }
        
        // Adaptasi data ke format yang diharapkan
        const assistanceData = {
          ...assistanceResult.data,
          title: assistanceResult.data.quizTitle || "Bantuan Level 2"
        };
        
        setAssistance(assistanceData as AssistanceLevel2Data);
        
        // Gunakan ID dari data bantuan yang sudah didapatkan untuk memeriksa submisi terakhir
        const assistanceId = assistanceData.id;
        if (assistanceId) {
          try {
            const submissionResult = await getLatestLevel2Submission(
              assistanceId,
              ""
            );
            console.log("Hasil permintaan submisi terakhir:", submissionResult);
            
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
          } catch (submissionErr) {
            console.error("Error saat mendapatkan submisi terakhir:", submissionErr);
            // Lanjutkan eksekusi meskipun ada error saat mengambil submisi
          }
        } else {
          console.log("Tidak ada ID bantuan level 2 yang valid untuk mendapatkan submisi terakhir");
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error saat memuat bantuan level 2:", err);
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
    if (!assistance || !assistance.questions || assistance.questions.length === 0) return;
    
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
    
    if (!assistance) {
      setError("Data bantuan tidak tersedia. Tidak dapat mengirim jawaban.");
      setSubmitting(false);
      return;
    }
    
    try {
      // Validasi form
      const questionIds = assistance?.questions?.map((q: AssistanceQuestion) => q.id) || [];
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
      
      // Submit jawaban
      const result = await submitAssistanceLevel2(
        { 
          quizId: quizId,
          answers: answersPayload
        },
        assistance.id
      );
      
      if (!result.success) {
        setError(result.message || "Gagal mengirimkan jawaban");
        setSubmitting(false);
        return;
      }
      
      toast.success("Jawaban berhasil dikirim!");
      
      // Langsung selesaikan bantuan level 2 dan arahkan ke kuis utama
      await completeAssistanceLevel2();
      
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
    router.push(`/student/quizzes/${quizId}?refreshStatus=true`);
  };
  
  // Tambahkan fungsi ini untuk menandai bahwa bantuan level 2 telah selesai
  const completeAssistanceLevel2 = async () => {
    try {
      setSubmitting(true);
      
      // Gunakan endpoint PATCH API yang telah kita modifikasi di backend
      const response = await fetch('/api/student/submit-quiz', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId,
          completedAssistanceLevel: 2 // Level 2
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || "Bantuan level 2 selesai!");
        
        // Arahkan langsung ke halaman kuis utama dengan parameter refresh
        router.push(`/student/quizzes/${quizId}?refreshStatus=true`);
      } else {
        toast.error(result.message || "Gagal menyelesaikan bantuan");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Error saat menyelesaikan bantuan:", err);
      toast.error("Terjadi kesalahan saat menyelesaikan bantuan. Silakan coba lagi.");
      setSubmitting(false);
    }
  };
  
  // Tambahkan fungsi continueToMainQuiz untuk menyelesaikan bantuan level 2 dan lanjut ke kuis utama
 
  
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
                Bantuan level 2 sudah selesai. Anda dapat langsung melanjutkan ke kuis utama.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">Selamat! Anda telah menyelesaikan bantuan level 2</p>
                  <p className="text-sm text-green-700 mt-1">Anda dapat melanjutkan ke kuis utama</p>
                </div>
                <Button 
                  onClick={() => router.push(`/student/quizzes/${quizId}?refreshStatus=true`)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Lanjut ke Kuis Utama
                </Button>
              </div>
            </div>

            {submission?.feedback && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium mb-2 text-blue-800 flex items-center gap-2">
                  💬 Umpan Balik dari Guru:
                </h3>
                <div className="p-3 bg-white rounded border border-blue-200">
                  <div className="math-renderer-container">
                    <MathRenderer 
                      content={submission.feedback} 
                      className="text-sm text-blue-900 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handleBack} variant="outline">
              Kembali ke Detail Kuis
            </Button>
            <Button 
              onClick={() => router.push(`/student/quizzes/${quizId}?refreshStatus=true`)} 
              className="bg-green-600 hover:bg-green-700"
            >
              Lanjut ke Kuis Utama
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
                  {assistance?.description || "Anda telah menyelesaikan bantuan level 2"}
                </CardDescription>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Anda telah menyelesaikan bantuan level 2. Anda dapat langsung melanjutkan ke kuis utama.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">Selamat! Anda telah menyelesaikan bantuan level 2</p>
                  <p className="text-sm text-green-700 mt-1">Anda dapat melanjutkan ke kuis utama</p>
                </div>
                <Button 
                  onClick={() => router.push(`/student/quizzes/${quizId}?refreshStatus=true`)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Lanjut ke Kuis Utama
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={() => router.push(`/student/quizzes/${quizId}?refreshStatus=true`)} variant="outline">
              Kembali ke Detail Kuis
            </Button>
            <Button 
              onClick={() => router.push(`/student/quizzes/${quizId}?refreshStatus=true`)} 
              className="bg-green-600 hover:bg-green-700"
            >
              Lanjut ke Kuis Utama
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Render bantuan level 2 bertahap
  if (assistance && assistance.questions && assistance.questions.length > 0) {
    const currentQuestion = assistance.questions[currentQuestionIndex];
    
    if (!currentQuestion) { 
      setError("Gagal mendapatkan pertanyaan saat ini atau pertanyaan tidak ada.");
      return (
        <div className="container py-8 max-w-3xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Terjadi kesalahan internal pada pertanyaan."}</AlertDescription>
          </Alert>
        </div>
      );
    }

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
            {answeredQuestions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Jawaban Sebelumnya:
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {answeredQuestions
                    .filter(idx => idx < currentQuestionIndex)
                    .map((idx) => {
                      const q = assistance.questions[idx];
                      const answerContent = answers[q.id];
                      
                      // Debug: log content untuk memastikan ada data
                      console.log(`Answer content for question ${idx + 1}:`, answerContent);
                      
                      return (
                        <div key={q.id} className="p-4 rounded-lg border-2 border-green-100 bg-green-50/50">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-green-800 mb-2">
                                <span>{idx + 1}. </span>
                                <MathRenderer content={q.question} className="inline" />
                              </div>
                              <div className="p-3 bg-white rounded-lg border border-green-200 shadow-sm">
                                <div className="text-sm font-medium text-gray-700 mb-2">Jawaban:</div>
                                {answerContent ? (
                                  <div className="math-renderer-container">
                                    <MathRenderer 
                                      content={answerContent} 
                                      className="text-gray-900 leading-relaxed break-words"
                                      debug={process.env.NODE_ENV === 'development'}
                                    />
                                  </div>
                                ) : (
                                  <div className="text-gray-500 italic">Tidak ada jawaban</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <Separator className="my-4" />
              </div>
            )}
            
            {/* Pertanyaan saat ini */}
            <div className="p-4 rounded-lg border">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-4">
                  <div className="text-sm font-medium text-gray-500 mb-1">Pertanyaan {currentQuestionIndex + 1}:</div>
                  <div className="math-renderer-container">
                    <MathRenderer 
                      content={`${currentQuestionIndex + 1}. ${currentQuestion.question}`}
                      className="font-medium text-gray-900 leading-relaxed"
                    />
                  </div>
                </div>
                {currentQuestion.hint && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleHint(currentQuestion.id)}
                    className="h-8 px-2 text-muted-foreground flex-shrink-0"
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Petunjuk
                  </Button>
                )}
              </div>
              
              {showHints[currentQuestion.id] && currentQuestion.hint && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm mb-3">
                  <p className="font-medium mb-2 text-blue-800">💡 Petunjuk:</p>
                  <div className="math-renderer-container">
                    <MathRenderer 
                      content={currentQuestion.hint} 
                      className="text-blue-900 leading-relaxed"
                    />
                  </div>
                </div>
              )}
              
              <MathEditor
                placeholder="Tulis jawaban Anda di sini... (Gunakan $...$ untuk equation inline atau $$...$$ untuk equation block)"
                value={answers[currentQuestion.id] || ''}
                onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
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