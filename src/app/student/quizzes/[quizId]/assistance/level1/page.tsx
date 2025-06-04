"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLatestLevel1Submission, submitAssistanceLevel1 } from "@/lib/actions/assistance-level1-actions";
import { getAssistanceLevel1 } from "@/lib/actions/assistance-actions";
import { getStudentQuizStatus } from "@/lib/actions/quiz-progress-actions";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Definisi Interface --- 
interface Question {
  id: string;
  question: string;
  explanation?: string | null; // Tambahkan explanation jika digunakan di JSX
  // tambahkan properti lain jika ada, misal: correctAnswer
}

// Interface untuk memetakan respons dari server action getAssistanceLevel1
interface AssistanceLevel1Response {
  id: string;
  quizId: string;
  quizTitle: string;
  questions: Array<{
    id: string;
    question: string;
    correctAnswer?: boolean;
    explanation?: string | null;
    assistanceQuizId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
}

interface AssistanceData {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  // tambahkan properti lain dari getAssistanceLevel1 jika ada
}

interface AssistanceSubmission {
  id?: string;
  passed: boolean;
  score: number;
  totalQuestions: number;
  scorePercentage: number;
  passingScore: number;
  answers: Record<string, boolean>; 
  correctAnswers: Record<string, boolean>; // Dibuat non-opsional, akan di-default di formatSubmissionData
  explanations: Record<string, string>;   // Dibuat non-opsional, akan di-default di formatSubmissionData
}

interface QuizStatusAssistanceLevelData {
  available: boolean;
  completed: boolean;
  assistanceId?: string; 
  latestSubmission?: unknown; // Menggunakan unknown, akan diformat oleh formatSubmissionData
  attemptCount?: number; // Tambahkan properti untuk menghitung percobaan
}

interface QuizStatusData {
  assistanceStatus: {
    level1: QuizStatusAssistanceLevelData;
    // level2, level3 jika diperlukan di halaman ini
  };
  currentAttempt?: number; // Property untuk mengetahui percobaan saat ini
  finalStatus?: string; // Property untuk mengetahui status final kuis
  // Tambahkan properti lain dari getStudentQuizStatus yang digunakan
}

interface AnswerPayloadItem {
  questionId: string;
  answer: boolean;
}

// Definisikan tipe untuk item dalam array answers di dalam apiData
interface ApiAnswerItem {
  questionId: string;
  answer: boolean;
  // Tambahkan properti lain jika ada dan relevan
}

function formatSubmissionData(apiData: unknown): AssistanceSubmission {
  if (typeof apiData !== 'object' || apiData === null) {
    return {
      passed: false, score: 0, totalQuestions: 0, scorePercentage: 0,
      passingScore: 0, answers: {}, correctAnswers: {}, explanations: {}
    } as AssistanceSubmission;
  }

  const data = apiData as Record<string, unknown>; 

  const formattedAnswers: Record<string, boolean> = {};
  if (Array.isArray(data.answers)) {
    data.answers.forEach((ans: unknown) => { 
      if (
        typeof ans === 'object' && 
        ans !== null &&
        'questionId' in ans && typeof (ans as ApiAnswerItem).questionId === 'string' &&
        'answer' in ans && typeof (ans as ApiAnswerItem).answer === 'boolean'
      ) {
        formattedAnswers[(ans as ApiAnswerItem).questionId] = (ans as ApiAnswerItem).answer;
      }
    });
  } else if (typeof data.answers === 'object' && data.answers !== null) {
    const answersRecord = data.answers as Record<string, unknown>;
    Object.keys(answersRecord).forEach(key => {
      if (typeof answersRecord[key] === 'boolean') {
        formattedAnswers[key] = answersRecord[key] as boolean;
      }
    });
  }
  
  const correctAnswers = (typeof data.correctAnswers === 'object' && data.correctAnswers !== null) 
    ? data.correctAnswers as Record<string, boolean> 
    : {};

  const explanations = (typeof data.explanations === 'object' && data.explanations !== null) 
    ? data.explanations as Record<string, string> 
    : {};

  return {
    id: typeof data.id === 'string' ? data.id : undefined,
    passed: typeof data.passed === 'boolean' ? data.passed : (typeof data.status === 'string' && data.status === 'PASSED'),
    score: typeof data.score === 'number' ? data.score : 0,
    totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : 0,
    scorePercentage: typeof data.scorePercentage === 'number' ? data.scorePercentage : 0,
    passingScore: typeof data.passingScore === 'number' ? data.passingScore : 0,
    correctAnswers,
    explanations,
    answers: formattedAnswers,
  } as AssistanceSubmission;
}

export default function AssistanceLevel1Page() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  
  const [loading, setLoading] = useState(true);
  const [assistance, setAssistance] = useState<AssistanceData | null>(null);
  const [answers, setAnswers] = useState<{[key: string]: boolean}>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<AssistanceSubmission | null>(null);
  const [quizStatus, setQuizStatus] = useState<QuizStatusData | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0); // State untuk jumlah percobaan
  
  // Konstanta untuk batas maksimum percobaan
  const MAX_ATTEMPTS = 4;
  // Untuk debugging - memungkinkan akses bantuan meskipun belum memenuhi syarat

  
  // Muat data bantuan level 1
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Tambahkan log untuk debugging
        console.log("Memuat data bantuan level 1 untuk quizId:", quizId);
        
        // Periksa parameter yang diperlukan untuk API
        const statusResult = await getStudentQuizStatus(quizId, "");
        
        if (!statusResult.success || !statusResult.data) {
          console.error("Gagal memuat status kuis:", statusResult);
          setError(statusResult.message || "Gagal memuat status kuis");
          setLoading(false);
          return;
        }
        
        const quizStatusData = statusResult.data as QuizStatusData; 
        console.log("Data status kuis:", quizStatusData);
        setQuizStatus(quizStatusData);
        
        // Hitung jumlah percobaan bantuan level 1 
        const attemptCountValue = quizStatusData.currentAttempt || 0;
        console.log("Jumlah percobaan saat ini:", attemptCountValue);
        setAttemptCount(attemptCountValue);
        
        // Periksa jika sudah mencapai batas percobaan
        if (attemptCountValue >= MAX_ATTEMPTS && quizStatusData.finalStatus !== "PASSED") {
          setError(`Anda telah mencapai batas maksimal percobaan (${MAX_ATTEMPTS} kali). Anda dinyatakan tidak lulus kuis ini.`);
          setLoading(false);
          return;
        }
        
        // Verifikasi ketersediaan bantuan level 1 dengan log
        console.log("Status bantuan level 1:", quizStatusData.assistanceStatus?.level1);
        
        // Periksa apakah assistanceStatus dan level1 ada sebelum mengakses properti
        if (!quizStatusData.assistanceStatus || !quizStatusData.assistanceStatus.level1) {
          setError("Data bantuan level 1 tidak tersedia");
          setLoading(false);
          return;
        }
        
        if (!quizStatusData.assistanceStatus.level1.available) {
          setError("Bantuan level 1 tidak tersedia untuk kuis ini");
          setLoading(false);
          return;
        }
        
        if (quizStatusData.assistanceStatus.level1.completed && quizStatusData.assistanceStatus.level1.latestSubmission) {
          console.log("Bantuan level 1 sudah diselesaikan, menampilkan hasil terakhir");
          const formattedSubmission = formatSubmissionData(quizStatusData.assistanceStatus.level1.latestSubmission);
          setSubmission(formattedSubmission);
          setLoading(false);
          return;
        }
        
        // Gunakan server action daripada akses Prisma langsung
        const assistanceResult = await getAssistanceLevel1(quizId, true);
        console.log("Hasil permintaan bantuan level 1:", assistanceResult);
        
        if (!assistanceResult.success || !assistanceResult.data) {
          console.error("Gagal memuat bantuan level 1:", assistanceResult);
          setError(assistanceResult.message || "Bantuan level 1 tidak tersedia untuk kuis ini");
          setLoading(false);
          return;
        }
        
        // Cek tipe data yang diterima
        console.log("Tipe data bantuan level 1:", typeof assistanceResult.data, assistanceResult.data);
        
        try {
          // Gunakan cast yang lebih aman dengan validasi data
          const assistanceData = assistanceResult.data as unknown as AssistanceLevel1Response;
          
          if (!assistanceData.id || !assistanceData.questions) {
            throw new Error("Format data bantuan level 1 tidak valid");
          }
          
          // Set data bantuan level 1 dengan properti yang benar dari hasil API
          setAssistance({
            id: assistanceData.id,
            title: assistanceData.quizTitle || "Bantuan Level 1",
            questions: assistanceData.questions
          });
          
          // Cek jika ada submisi sebelumnya
          if (assistanceData.id && !quizStatusData.assistanceStatus.level1.completed) {
            // Pastikan memberikan parameter kedua yang diperlukan
            const submissionResult = await getLatestLevel1Submission(assistanceData.id, "");
            console.log("Hasil permintaan submisi terakhir:", submissionResult);
            
            if (submissionResult.success && submissionResult.data) {
              const formattedSubmission = formatSubmissionData(submissionResult.data);
              setSubmission(formattedSubmission);
            }
          }
        } catch (formatErr) {
          console.error("Error format data:", formatErr);
          setError("Format data bantuan level 1 tidak sesuai");
          setLoading(false);
          return;
        }
        
        setLoading(false);
      } catch (err: unknown) { 
        console.error("Error saat memuat bantuan level 1:", err);
        const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
        setError(message);
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
    
    if (!assistance || !assistance.questions) {
      setError("Data bantuan tidak termuat dengan benar.");
      setSubmitting(false);
      return;
    }

    try {
      const questionIds = assistance.questions.map((q: Question) => q.id);
      const missingAnswers = questionIds.filter((id: string) => answers[id] === undefined);
      
      if (missingAnswers.length > 0) {
        setError(`Harap jawab semua pertanyaan (${missingAnswers.length} belum dijawab)`);
        setSubmitting(false);
        return;
      }
      
      const answersPayload: AnswerPayloadItem[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      
      const result = await submitAssistanceLevel1(
        {
          quizId: quizId,
          answers: answersPayload
        },
        assistance.id 
      );
      
      if (!result.success || !result.data) {
        setError(result.message || "Gagal mengirimkan jawaban");
        setSubmitting(false);
        return;
      }
      
      const formattedSubmission = formatSubmissionData(result.data);
      setSubmission(formattedSubmission);
      
      // Perbarui nilai percobaan setelah submit
      const statusResult = await getStudentQuizStatus(quizId, "");
      if (statusResult.success && statusResult.data) {
        const quizStatusData = statusResult.data as QuizStatusData;
        setQuizStatus(quizStatusData);
        setAttemptCount(quizStatusData.currentAttempt || 0);
      }
      
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
    } catch (err: unknown) { 
      console.error(err);
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat mengirimkan jawaban";
      setError(message);
      setSubmitting(false);
    }
  };
  
  // Handle kembali ke halaman kuis
  const handleBack = () => {
    router.push(`/student/quizzes/${quizId}`);
  };
  
  // Handle coba lagi
  const handleRetry = () => {
    // Periksa jika siswa masih memiliki kesempatan
    if (attemptCount >= MAX_ATTEMPTS) {
      setError(`Anda telah mencapai batas maksimal percobaan (${MAX_ATTEMPTS} kali). Anda dinyatakan tidak lulus kuis ini.`);
      return;
    }
    
    setSubmission(null);
    setAnswers({});
  };
  
  // Tambahkan fungsi ini untuk menandai bahwa bantuan level 1 telah selesai
  const completeAssistanceLevel1 = async () => {
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
          completedAssistanceLevel: 1 // Level 1
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || "Bantuan level 1 selesai!");
        
        // Arahkan langsung ke halaman kuis utama tanpa menunggu
        router.push(`/student/quizzes/${quizId}/take`);
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

  // Tambahkan fungsi continueToMainQuiz yang akan memastikan bantuan level 1 diselesaikan 
  // dan mengarahkan siswa ke kuis utama
  const continueToMainQuiz = () => {
    if (submission?.passed) {
      completeAssistanceLevel1();
    } else {
      toast.error("Anda harus menjawab semua pertanyaan dengan benar sebelum melanjutkan ke kuis utama.");
    }
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
  
  // Render jika siswa mencapai batas percobaan maksimal
  if (attemptCount >= MAX_ATTEMPTS && !quizStatus?.assistanceStatus.level1.completed) {
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Batas Percobaan Tercapai</CardTitle>
                <CardDescription>
                  Anda telah mencapai batas maksimal percobaan untuk kuis ini
                </CardDescription>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-destructive/15 border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription>
                Anda telah mencapai batas maksimal {MAX_ATTEMPTS} kali percobaan. Anda dinyatakan tidak lulus untuk kuis ini.
              </AlertDescription>
            </Alert>
            
            <p className="text-sm mt-4">
              Silakan hubungi guru Anda untuk informasi lebih lanjut atau bantuan tambahan.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBack} variant="outline">
              Kembali ke Kuis
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Render error state
  if (error && !assistance && !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-destructive font-medium">{error}</p>
        
        {error.includes("tidak tersedia") && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md text-sm">
            <p className="font-medium text-blue-800 mb-2">Informasi untuk Guru:</p>
            <p className="text-blue-700 mb-2">
              Bantuan level 1 perlu dikonfigurasi terlebih dahulu melalui panel guru. 
              Silakan ikuti langkah-langkah berikut:
            </p>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Login sebagai guru</li>
              <li>Buka menu Kuis dan pilih kuis ini</li>
              <li>Klik tombol Edit Kuis</li>
              <li>Scroll ke bagian Bantuan Level 1 dan klik Konfigurasi</li>
              <li>Tambahkan pertanyaan Ya/Tidak yang relevan dengan materi</li>
              <li>Simpan perubahan</li>
            </ol>
          </div>
        )}

        {error.includes("perlu gagal") && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md text-sm">
            <p className="font-medium text-amber-800 mb-2">Informasi untuk Siswa:</p>
            <p className="text-amber-700 mb-2">
              Anda hanya dapat mengakses bantuan level 1 setelah Anda mencoba mengerjakan kuis utama terlebih dahulu
              dan belum memenuhi kriteria kelulusan.
            </p>
            <ol className="list-decimal list-inside text-amber-700 space-y-1">
              <li>Kembali ke halaman kuis utama</li>
              <li>Kerjakan kuis utama terlebih dahulu</li>
              <li>Jika hasil kuis utama belum memenuhi kriteria lulus, sistem akan mengarahkan Anda ke bantuan level 1</li>
            </ol>
          </div>
        )}
        
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
          <CardFooter className="flex justify-between">
            <Button onClick={handleBack} variant="outline">
              Kembali ke Detail Kuis
            </Button>
            <Button 
              onClick={() => router.push(`/student/quizzes/${quizId}/take`)} 
              className="bg-green-600 hover:bg-green-700"
            >
              Lanjut ke Kuis Utama
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render hasil submisi
  if (submission) {
    // Pastikan assistance.questions exists dan buat questionResults dengan aman
    const typedSubmission = submission as AssistanceSubmission;
    
    const questionResults = assistance?.questions?.map((question: Question) => {
      const userAnswer = typedSubmission.answers[question.id];
      const correctAnswer = typedSubmission.correctAnswers[question.id];
      const isCorrect = userAnswer === correctAnswer;
      
      console.log(`Question ${question.id}:`, { 
        question: question.question,
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
                    ? "Bantuan level 1 berhasil diselesaikan! Anda dapat melanjutkan ke kuis utama."
                    : attemptCount >= MAX_ATTEMPTS - 1 
                      ? `Ini adalah kesempatan terakhir Anda (percobaan ke-${attemptCount+1} dari ${MAX_ATTEMPTS}). Anda harus menjawab semua pertanyaan dengan benar (100%) untuk dapat melanjutkan.`
                      : `Anda harus menjawab semua pertanyaan dengan benar (100%) untuk dapat melanjutkan. Ini percobaan ke-${attemptCount+1} dari ${MAX_ATTEMPTS}.`}
                </AlertDescription>
              </Alert>
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Hasil:</p>
                <p className="text-sm">Skor: {submission.scorePercentage.toFixed(0)}%</p>
                <p className="text-sm">Batas Lulus: 100%</p>
                <p className="text-sm">Benar: {submission.score} dari {submission.totalQuestions}</p>
                <p className="text-sm">Percobaan: {attemptCount} dari {MAX_ATTEMPTS}</p>
                <p className="text-sm mt-2 font-medium text-blue-600">
                  Status: {submission.passed ? "Lulus" : "Perlu mengulang"}
                </p>
              </div>
              
              {submission.passed && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">Selamat! Anda telah lulus bantuan level 1</p>
                      <p className="text-sm text-green-700 mt-1">Anda dapat melanjutkan ke kuis utama</p>
                    </div>
                    <Button 
                      onClick={continueToMainQuiz} 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        "Lanjut ke Kuis Utama"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              {questionResults.map((question: Question & { isCorrect: boolean; userAnswer: boolean }, index: number) => (
                <div 
                  key={question.id} 
                  className={cn(
                    "p-4 rounded-lg border",
                    question.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{index + 1}. {question.question}</p>
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
                          {submission && submission.correctAnswers[question.id] ? "Ya" : "Tidak"}
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
                  
                  {submission && submission.explanations[question.id] && (
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
            {!submission.passed && attemptCount < MAX_ATTEMPTS && (
              <Button onClick={handleRetry} variant="default" className="bg-amber-600 hover:bg-amber-700">
                Coba Lagi
              </Button>
            )}
            {submission.passed && (
              <Button 
                onClick={continueToMainQuiz} 
                className="bg-green-600 hover:bg-green-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Lanjut ke Kuis Utama"
                )}
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
          <p className="text-sm text-muted-foreground mt-2">
            Percobaan ke-{attemptCount+1} dari {MAX_ATTEMPTS}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            {assistance?.questions?.map((question: Question, index: number) => {
              // Cek apakah jawaban sudah disubmit dan salah (untuk highlight)
              const isSubmitted = submission !== null;
              const userAnswer = answers[question.id]; 
              
              // Gunakan type assertion untuk mengatasi issue tipe
              const typedSubmission = submission as AssistanceSubmission | null;
              
              const correctAnswer = isSubmitted && typedSubmission ? 
                typedSubmission.correctAnswers[question.id] : null;
                
              const isWrong = isSubmitted && userAnswer !== undefined && userAnswer !== correctAnswer;
              
              const explanation = isSubmitted && isWrong && typedSubmission ? 
                typedSubmission.explanations[question.id] : null;
              
              return (
                <div 
                  key={question.id} 
                  className={cn(
                    "p-4 rounded-lg border",
                    isWrong ? "border-red-300 bg-red-50" : ""
                  )}
                >
                  <div className="flex items-start gap-2">
                    <p className="font-medium mb-3 flex-1">{index + 1}. {question.question}</p>
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