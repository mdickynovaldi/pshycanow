"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { 
  Loader2, AlertCircle, CheckCircle, XCircle, FileText, 
  BookOpen, ChevronRight, X, RotateCcw,
  ChevronLeft, AlertTriangle, Target
} from "lucide-react";
import { getStudentQuizStatus, incrementQuizAttempt } from "@/lib/actions/quiz-progress-actions";
import { getQuizById } from "@/lib/actions/quiz-actions";
import { toast } from "sonner";

import { SubmissionStatus, AssistanceRequirement, Question } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { MainQuizButton, AssistanceStatusIndicator } from "@/components/MainQuizButton";
import { useAssistanceStatus } from "@/hooks/useAssistanceStatus";

// --- Interface Definitions ---
interface QuestionData {
  id: string;
  text: string;
  imageUrl?: string | null;
}

interface QuizPageData {
  id: string;
  title: string;
  description?: string | null;
  classId?: string | null;
  maxAttempts: number;
  passingScore: number;
  questions: QuestionData[];
  imageUrl?: string | null;
  course?: { title: string } | null;
  assistanceLevel1Id?: string | null;
  assistanceLevel2Id?: string | null;
  assistanceLevel3Id?: string | null;
}

interface LastSubmissionData {
  status: SubmissionStatus;
  score: number | null;
  correctAnswers?: number;
  totalQuestions?: number;
}

interface QuizStatusDataForPage {
  currentAttempt: number;
  failedAttempts: number;
  lastAttemptPassed: boolean | null;
  finalStatus: SubmissionStatus | null;
  level1Completed: boolean;
  level2Completed: boolean;
  level3Completed: boolean;
  overrideSystemFlow: boolean;
  manuallyAssignedLevel: AssistanceRequirement | null;
  
  assistanceRequired: AssistanceRequirement;
  nextStep: string | null;
  canTakeQuiz: boolean;

  maxAttempts: number;
  passingScore: number;
  
  lastSubmission: LastSubmissionData | null;

  assistanceStatus: {
    level1: { available: boolean; completed: boolean };
    level2: { available: boolean; completed: boolean };
    level3: { available: boolean; completed: boolean };
  };
}

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const refreshStatus = searchParams.get('refreshStatus');
  const quizId = params.quizId as string;
  
  
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<QuizPageData | null>(null);
  const [quizStatus, setQuizStatus] = useState<QuizStatusDataForPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingQuiz, setStartingQuiz] = useState(false);
  
  // Menggunakan hook untuk tracking assistance status
  const { 
    // assistanceStatus, 
    // loading: assistanceLoading,
    // markAssistanceCompleted, 
    // resetMainQuizFlag 
  } = useAssistanceStatus(quizId);
  
  // Debug effect untuk menampilkan status bantuan level 2
  useEffect(() => {
    if (quizStatus && quizData) {
      console.log("Debug bantuan level 2:", {
        currentAttempt: quizStatus.currentAttempt,
        lastAttemptPassed: quizStatus.lastAttemptPassed,
        failedAttempts: quizStatus.failedAttempts,
        assistanceRequired: quizStatus.assistanceRequired,
        assistanceLevel2Id: quizData.assistanceLevel2Id,
        level2Completed: quizStatus.level2Completed,
        lastSubmissionStatus: quizStatus.lastSubmission?.status,
        shouldShowLevel2: (
          (quizStatus.currentAttempt === 2) || 
          (quizStatus.lastSubmission?.status === SubmissionStatus.PENDING && quizStatus.failedAttempts === 1) ||
          (quizStatus.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL2)
        )
      });
    }
  }, [quizStatus, quizData]);
  
  // Debug effect untuk data lengkap kuis
  useEffect(() => {
    if (quizStatus && quizData) {
      console.log("DEBUG DATA LENGKAP KUIS:", {
        quizId: quizId,
        assistanceData: {
          level1Id: quizData.assistanceLevel1Id,
          level2Id: quizData.assistanceLevel2Id,
          level3Id: quizData.assistanceLevel3Id
        },
        
        currentStatus: {
          currentAttempt: quizStatus.currentAttempt,
          failedAttempts: quizStatus.failedAttempts,
          lastAttemptPassed: quizStatus.lastAttemptPassed,
          finalStatus: quizStatus.finalStatus,
          
          level1Completed: quizStatus.level1Completed,
          level2Completed: quizStatus.level2Completed,
          level3Completed: quizStatus.level3Completed,
          
          overrideSystemFlow: quizStatus.overrideSystemFlow,
          assistanceRequired: quizStatus.assistanceRequired,
          nextStep: quizStatus.nextStep,
          canTakeQuiz: quizStatus.canTakeQuiz
        },
        
        lastSubmission: quizStatus.lastSubmission ? {
          status: quizStatus.lastSubmission?.status,
          score: quizStatus.lastSubmission?.score
        } : null
      });
    }
  }, [quizStatus, quizData, quizId]);
  
  // Muat data kuis dan status
  useEffect(() => {
    async function loadData() {
      if (sessionStatus === "loading") {
        return;
      }

      if (sessionStatus === "unauthenticated") {
        setError("Anda harus login untuk melihat halaman ini.");
        setLoading(false);
        return;
      }

      const studentId = session?.user?.id;

      if (!studentId) {
        setError("Tidak dapat mengambil ID siswa dari sesi.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const quizResult = await getQuizById(quizId);
        
        if (!quizResult.success || !quizResult.data) { 
          setError(quizResult.message || "Gagal memuat kuis");
          setLoading(false);
          return;
        }
        
        const fetchedQuiz = quizResult.data; // Ini adalah tipe Quiz

        // Untuk properti yang TIDAK ada di tipe Quiz standar, tapi mungkin dikirim backend
        // Kita perlu mengaksesnya menggunakan type assertion untuk properti spesifik ini.
        const maxAttemptsFromBackend = (fetchedQuiz as unknown as { maxAttempts?: number }).maxAttempts;
        const passingScoreFromBackend = (fetchedQuiz as unknown as { passingScore?: number }).passingScore;
        const quizImageUrlFromBackend = (fetchedQuiz as unknown as { imageUrl?: string | null }).imageUrl;
        const courseFromBackend = (fetchedQuiz as unknown as { course?: { title: string } | null }).course;

        setQuizData({
          id: fetchedQuiz.id,
          title: fetchedQuiz.title,
          description: fetchedQuiz.description || null,
          classId: fetchedQuiz.classId || null,
          maxAttempts: typeof maxAttemptsFromBackend === 'number' ? maxAttemptsFromBackend : 4, 
          passingScore: typeof passingScoreFromBackend === 'number' ? passingScoreFromBackend : 70, 
          questions: fetchedQuiz.questions?.map((q: Question) => ({
            id: q.id,
            text: q.text,
            imageUrl: q.imageUrl
          })) || [],
          imageUrl: quizImageUrlFromBackend || null,
          course: courseFromBackend || null, 
          assistanceLevel1Id: fetchedQuiz.assistanceLevel1?.id || null,
          assistanceLevel2Id: fetchedQuiz.assistanceLevel2?.id || null,
          assistanceLevel3Id: fetchedQuiz.assistanceLevel3?.id || null,
        });
        
        const statusResult = await getStudentQuizStatus(quizId, studentId);
        
        if (statusResult.success && statusResult.data) {
          console.log("Status kuis lengkap:", statusResult.data);
          const backendStatusData = statusResult.data;
          
          // Pastikan tipe data untuk enum sesuai
          const finalStatus = backendStatusData.finalStatus as SubmissionStatus | null;
          const manuallyAssignedLevel = backendStatusData.manuallyAssignedLevel as AssistanceRequirement | null;
          const assistanceRequired = backendStatusData.assistanceRequired as AssistanceRequirement;
          const lastSubmissionStatus = backendStatusData.lastMainQuizSubmission?.status as SubmissionStatus | undefined;


          setQuizStatus({
            currentAttempt: backendStatusData.currentAttempt,
            failedAttempts: backendStatusData.failedAttempts,
            lastAttemptPassed: backendStatusData.lastAttemptPassed,
            finalStatus: finalStatus,
            level1Completed: backendStatusData.level1Completed,
            level2Completed: backendStatusData.level2Completed,
            level3Completed: backendStatusData.level3Completed,
            overrideSystemFlow: backendStatusData.overrideSystemFlow,
            manuallyAssignedLevel: manuallyAssignedLevel,
            assistanceRequired: assistanceRequired,
            nextStep: backendStatusData.nextStep,
            canTakeQuiz: backendStatusData.canTakeQuiz,
            maxAttempts: backendStatusData.maxAttempts,
            passingScore: backendStatusData.passingScore,
            lastSubmission: backendStatusData.lastMainQuizSubmission 
              ? {
                  status: lastSubmissionStatus!, // Non-null assertion karena ada di dalam blok if
                  score: backendStatusData.lastMainQuizSubmission.score
                } 
              : null, 
            assistanceStatus: backendStatusData.assistanceStatus,
          });
        } else {
          console.error('Error dari server:', statusResult.message);
          setError(statusResult.message || "Gagal memuat status kuis. Pesan error tidak tersedia dari server.");
        }
        
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [quizId, refreshStatus, session, sessionStatus]);
  
  // Handle mulai kuis
  const handleStartQuiz = async () => {
    if (!quizData || !quizStatus) return;
    
    const studentId = session?.user?.id;
    if (!studentId) {
      toast.error("Tidak dapat memulai kuis. ID Siswa tidak ditemukan.");
      setStartingQuiz(false);
      return;
    }

    setStartingQuiz(true);
    try {
      console.log("Status kuis saat mulai kuis:", {
        currentAttempt: quizStatus.currentAttempt,
        assistanceRequired: quizStatus.assistanceRequired,
        nextStep: quizStatus.nextStep,
        overrideSystemFlow: quizStatus.overrideSystemFlow,
        manuallyAssignedLevel: quizStatus.manuallyAssignedLevel,
        level1Completed: quizStatus.level1Completed,
        level2Completed: quizStatus.level2Completed,
        level3Completed: quizStatus.level3Completed
      });
    
      // Manual override by teacher - directly start quiz
      if (quizStatus.overrideSystemFlow && quizStatus.manuallyAssignedLevel === AssistanceRequirement.NONE) {
        const result = await incrementQuizAttempt(quizId, studentId);
        if (!result.success) {
          toast.error(result.message || "Terjadi kesalahan saat memulai kuis");
          setStartingQuiz(false);
          return;
        }
        router.push(`/student/quizzes/${quizId}/take`);
        return;
      }
    
      // Check if user needs to complete assistance first
      if (quizStatus.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL1 || quizStatus.nextStep === "COMPLETE_ASSISTANCE_LEVEL1") {
        router.push(`/student/quizzes/${quizId}/assistance/level1`);
        return;
      } else if (quizStatus.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL2 || quizStatus.nextStep === "COMPLETE_ASSISTANCE_LEVEL2") {
        router.push(`/student/quizzes/${quizId}/assistance/level2`);
        return;
      } else if (quizStatus.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL3 || quizStatus.nextStep === "VIEW_ASSISTANCE_LEVEL3") {
        router.push(`/student/quizzes/${quizId}/assistance/level3`);
        return;
      }

      // If assistance is completed and user should take main quiz
      if (
        (quizStatus.level1Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE) ||
        (quizStatus.level2Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE) ||
        (quizStatus.level3Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE) ||
        quizStatus.nextStep === "TRY_MAIN_QUIZ_AGAIN"
      ) {
        const result = await incrementQuizAttempt(quizId, studentId);
        if (!result.success) {
          toast.error(result.message || "Terjadi kesalahan saat memulai kuis setelah menyelesaikan bantuan");
          setStartingQuiz(false);
          return;
        }
        router.push(`/student/quizzes/${quizId}/take`);
        return;
      }

      // Default case - try to start quiz
      const result = await incrementQuizAttempt(quizId, studentId);
      if (!result.success) {
        toast.error(result.message || "Anda mungkin perlu menyelesaikan bantuan terlebih dahulu");
        setStartingQuiz(false);
        return;
      }
      router.push(`/student/quizzes/${quizId}/take`);
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat memulai kuis");
    } finally {
      setStartingQuiz(false);
    }
  };
  
  const handleViewHistory = () => {
    router.push(`/student/quizzes/${quizId}/history`);
  };
  
  const handleGoToAssistance = (level: number) => {
    router.push(`/student/quizzes/${quizId}/assistance/level${level}`);
  };
  
  if (loading || sessionStatus === "loading") {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error || !quizData) {
    return (
      <div className="container max-w-4xl py-8">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || "Kuis tidak ditemukan"}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const renderQuizStatus = () => {
    if (!quizStatus) return null;
    
    console.log("renderQuizStatus: Rendering status kuis dengan data:", {
      finalStatus: quizStatus.finalStatus,
      assistanceRequired: quizStatus.assistanceRequired,
      nextStep: quizStatus.nextStep
    });
    
    // const currentAssistanceRequired = quizStatus.assistanceRequired;
    
    // if (quizStatus.finalStatus === SubmissionStatus.PASSED) {
    //   return (
    //     <Alert className="mb-8 bg-linear-to-r from-green-50 to-emerald-50 border-green-300 shadow-md max-w-4xl">
    //       <div className="flex items-start gap-4">
    //         <div className="bg-green-500 rounded-full p-2 shrink-0">
    //           <CheckCircle className="h-5 w-5 text-white" />
    //         </div>
    //         <div className="flex-1 min-w-0">
    //           <AlertDescription className="text-green-800">
    //             <div className="space-y-3">
    //               <h3 className="text-lg font-semibold">🎉 Selamat! Anda Telah Lulus!</h3>
    //               <p className="text-sm leading-relaxed">
    //                 Anda telah berhasil menyelesaikan kuis ini dengan mencapai passing grade 70% atau menjawab semua pertanyaan dengan benar.
    //               </p>
    //               <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
    //                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
    //                   <div>
    //                     <p className="font-medium">✅ Status</p>
    //                     <p className="font-bold text-green-700">LULUS</p>
    //                   </div>
    //                   <div>
    //                     <p className="font-medium">🎯 Kriteria</p>
    //                     <p className="text-xs">Skor ≥ 70% atau Semua Benar</p>
    //                   </div>
    //                   <div>
    //                     <p className="font-medium">🚀 Aksi</p>
    //                     <p className="text-xs">Dapat melanjutkan ke materi berikutnya</p>
    //                   </div>
    //                 </div>
    //               </div>
    //             </div>
    //           </AlertDescription>
    //         </div>
    //       </div>
    //     </Alert>
    //   );
    // }
    
    
    
    // if (quizStatus.lastSubmission?.status === SubmissionStatus.PENDING) {
    //   // Hitung status lulus berdasarkan passing grade 70%
    //   const correctAnswers = quizStatus.lastSubmission.correctAnswers || 0;
    //   const totalQuestions = quizStatus.lastSubmission.totalQuestions || 0;
    //   const scorePercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    //   const allCorrect = correctAnswers === totalQuestions && totalQuestions > 0;
    //   const actuallyPassed = scorePercent >= 70 || allCorrect;
      
      
    // }
    
    // if (currentAssistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL1) {
    //   return (
    //     <Alert className="mb-8 bg-linear-to-r from-blue-50 to-cyan-50 border-blue-300 shadow-md">
    //       <div className="flex items-start w-full">
    //         <div className="bg-blue-500 rounded-full p-2 mr-4">
    //           <BookOpen className="h-6 w-6 text-white" />
    //         </div>
    //         <div className="flex-1 w-full">
    //           <AlertDescription className="text-blue-800">
    //             <div className="space-y-3">
    //               <h3 className="text-lg font-bold">📚 Bantuan Level 1 Diperlukan</h3>
    //               <p>Percobaan pertama belum mencapai passing grade 70%. Selesaikan bantuan level 1 untuk memahami konsep dasar.</p>
    //               <div className="mt-3 p-3 bg-blue-100 rounded-lg">
    //                 <p className="text-sm font-medium">
    //                   🎯 Target: Memahami konsep dasar materi<br/>
    //                   📝 Format: Kuis pilihan ganda<br/>
    //                   ⭐ Setelah selesai: Wajib mengerjakan kuis utama lagi
    //                 </p>
    //               </div>
    //               <Button 
    //                 onClick={() => handleGoToAssistance(1)} 
    //                 className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
    //               >
    //                 <BookOpen className="h-4 w-4 mr-2" />
    //                 Mulai Bantuan Level 1
    //               </Button>
    //             </div>
    //           </AlertDescription>
    //         </div>
    //       </div>
    //     </Alert>
    //   );
    // }
    
    // // Status setelah menyelesaikan level 1 - WAJIB mengerjakan kuis utama
    // if (quizStatus.level1Completed && (quizStatus.assistanceRequired === AssistanceRequirement.NONE || quizStatus.nextStep === "TRY_MAIN_QUIZ_AGAIN")) {
    //   return (
    //     <Alert className="mb-8 bg-linear-to-r from-green-50 to-emerald-50 border-green-300 shadow-md">
    //       <div className="flex items-start w-full">
    //         <div className="bg-green-500 rounded-full p-2 mr-4">
    //           <CheckCircle className="h-6 w-6 text-white" />
    //         </div>
    //         <div className="flex-1 w-full">
    //           <AlertDescription className="text-green-800">
    //             <div className="space-y-3">
    //               <h3 className="text-lg font-bold">✅ Bantuan Level 1 Selesai!</h3>
    //               <p><strong>Anda sekarang WAJIB mengerjakan kuis utama lagi</strong> untuk melanjutkan ke tahap berikutnya.</p>
    //               <div className="mt-3 p-3 bg-green-100 rounded-lg">
    //                 <p className="text-sm font-medium">
    //                   ✅ Bantuan Level 1: Selesai<br/>
    //                   🎯 Target Kuis Utama: Skor ≥ 70%<br/>
    //                   ⚠️ Wajib: Mengerjakan kuis utama untuk melanjutkan
    //                 </p>
    //               </div>
    //               <Button onClick={handleStartQuiz} disabled={startingQuiz} className="mt-3 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2">
    //                 {startingQuiz ? (
    //                   <>
    //                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
    //                     Memulai...
    //                   </>
    //                 ) : (
    //                   <>
    //                     <CheckCircle className="h-4 w-4 mr-2" />
    //                     Lanjutkan ke Kuis Utama (Wajib)
    //                   </>
    //                 )}
    //               </Button>
    //             </div>
    //           </AlertDescription>
    //         </div>
    //       </div>
    //     </Alert>
    //   );
    // }
    
    // if (quizStatus.currentAttempt >= 2 && !quizStatus.level1Completed && quizStatus.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL2) {
    //   return (
    //     <Alert className="mb-8 bg-linear-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-md">
    //       <div className="flex items-start w-full">
    //         <div className="bg-amber-500 rounded-full p-2 mr-4">
    //           <HelpCircle className="h-6 w-6 text-white" />
    //         </div>
    //         <div className="flex-1 w-full ">
    //           <AlertDescription className="text-amber-800">
    //             <div className="space-y-3">
    //               <h3 className="text-lg font-bold">📝 Bantuan Level 2 Diperlukan</h3>
    //               <p>Percobaan kedua belum mencapai passing grade 70%. Kerjakan bantuan level 2 untuk memperdalam pemahaman.</p>
    //               <div className="mt-3 p-3 bg-amber-100 rounded-lg">
    //                 <p className="text-sm font-medium">
    //                   🎯 Target: Memperdalam pemahaman konsep<br/>
    //                   📝 Format: Pertanyaan essay<br/>
    //                   ⭐ Setelah selesai: Wajib mengerjakan kuis utama lagi
    //                 </p>
    //               </div>
    //               <Button onClick={() => handleGoToAssistance(2)} className="mt-3 bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 py-2">
    //                 <HelpCircle className="h-4 w-4 mr-2" />
    //                 Mulai Bantuan Level 2
    //               </Button>
    //             </div>
    //           </AlertDescription>
    //         </div>
    //       </div>
    //     </Alert>
    //   );
    // }
    
    // if (currentAssistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL2) {
    //   const isLevel2Completed = quizStatus.assistanceStatus?.level2?.completed;
    //   return (
    //     <Alert className={`mb-8 shadow-md ${
    //       isLevel2Completed 
    //         ? "bg-linear-to-r from-green-50 to-emerald-50 border-green-300" 
    //         : "bg-linear-to-r from-amber-50 to-yellow-50 border-amber-300"
    //     }`}>
    //       <div className="flex items-start">
    //         <div className={`rounded-full p-2 mr-4 ${
    //           isLevel2Completed ? "bg-green-500" : "bg-amber-500"
    //         }`}>
    //           <HelpCircle className="h-6 w-6 text-white" />
    //         </div>
    //         <div className="flex-1">
    //           <AlertDescription className={isLevel2Completed ? "text-green-800" : "text-amber-800"}>
    //             <div className="space-y-3">
    //               <h3 className="text-lg font-bold">
    //                 {isLevel2Completed ? "✅ Bantuan Level 2 Selesai!" : "📝 Bantuan Level 2 Diperlukan"}
    //               </h3>
    //               <p>
    //                 {isLevel2Completed 
    //                   ? "Anda dapat melanjutkan ke percobaan kuis utama berikutnya jika tersedia." 
    //                   : "Jawab pertanyaan essay untuk memperdalam pemahaman sebelum mencoba kuis lagi."
    //                 }
    //               </p>
    //               <div className={`mt-3 p-3 rounded-lg ${
    //                 isLevel2Completed ? "bg-green-100" : "bg-amber-100"
    //               }`}>
    //                 <p className="text-sm font-medium">
    //                   {isLevel2Completed 
    //                     ? "✅ Bantuan Level 2: Selesai\n🎯 Target Kuis Utama: Skor ≥ 70%\n⚠️ Wajib: Mengerjakan kuis utama untuk melanjutkan"
    //                     : "🎯 Target: Memperdalam pemahaman konsep\n📝 Format: Pertanyaan essay\n⭐ Setelah selesai: Wajib mengerjakan kuis utama lagi"
    //                   }
    //                 </p>
    //               </div>
    //               {!isLevel2Completed && (
    //                 <Button onClick={() => handleGoToAssistance(2)} className="mt-3 bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 py-2">
    //                   <HelpCircle className="h-4 w-4 mr-2" />
    //                   Mulai Bantuan Level 2
    //                 </Button>
    //               )}
    //               {isLevel2Completed && quizStatus.nextStep === "TRY_MAIN_QUIZ_AGAIN" && (
    //                 <Button onClick={handleStartQuiz} disabled={startingQuiz} className="mt-3 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2">
    //                   {startingQuiz ? (
    //                     <>
    //                       <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
    //                       Memulai...
    //                     </>
    //                   ) : (
    //                     <>
    //                       <CheckCircle className="h-4 w-4 mr-2" />
    //                       Lanjutkan ke Kuis Utama (Wajib)
    //                     </>
    //                   )}
    //                 </Button>
    //               )}
    //             </div>
    //           </AlertDescription>
    //         </div>
    //       </div>
    //     </Alert>
    //   );
    // }
    
    // // Status setelah menyelesaikan level 2 - WAJIB mengerjakan kuis utama
    // if (quizStatus.level2Completed && (quizStatus.nextStep === "TRY_MAIN_QUIZ_AGAIN" || quizStatus.assistanceRequired === AssistanceRequirement.NONE)) {
    //   return (
    //     <Alert className="mb-8 bg-linear-to-r from-green-50 to-emerald-50 border-green-300 shadow-md">
    //       <div className="flex items-start">
    //         <div className="bg-green-500 rounded-full p-2 mr-4">
    //           <CheckCircle className="h-6 w-6 text-white" />
    //         </div>
    //         <div className="flex-1">
    //           <AlertDescription className="text-green-800">
    //             <div className="space-y-3">
    //               <h3 className="text-lg font-bold">✅ Bantuan Level 2 Selesai!</h3>
    //               <p><strong>Anda sekarang WAJIB mengerjakan kuis utama lagi</strong> untuk melanjutkan ke tahap berikutnya.</p>
    //               <div className="mt-3 p-3 bg-green-100 rounded-lg">
    //                 <p className="text-sm font-medium">
    //                   ✅ Bantuan Level 2: Selesai<br/>
    //                   🎯 Target Kuis Utama: Skor ≥ 70%<br/>
    //                   ⚠️ Wajib: Mengerjakan kuis utama untuk melanjutkan
    //                 </p>
    //               </div>
    //               <Button onClick={handleStartQuiz} disabled={startingQuiz} className="mt-3 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2">
    //                 {startingQuiz ? (
    //                   <>
    //                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
    //                     Memulai...
    //                   </>
    //                 ) : (
    //                   <>
    //                     <CheckCircle className="h-4 w-4 mr-2" />
    //                     Lanjutkan ke Kuis Utama (Wajib)
    //                   </>
    //                 )}
    //               </Button>
    //             </div>
    //           </AlertDescription>
    //         </div>
    //       </div>
    //     </Alert>
    //   );
    // }
    
    // // Status setelah menyelesaikan level 3 - percobaan terakhir
    // if (quizStatus.level3Completed && (quizStatus.nextStep === "TRY_MAIN_QUIZ_AGAIN" || quizStatus.assistanceRequired === AssistanceRequirement.NONE)) {
    //   return (
    //     <Alert className="mb-8 bg-linear-to-r from-purple-50 to-indigo-50 border-purple-300 shadow-md">
    //       <div className="flex items-start">
    //         <div className="bg-purple-500 rounded-full p-2 mr-4">
    //           <CheckCircle className="h-6 w-6 text-white" />
    //         </div>
    //         <div className="flex-1">
    //           <AlertDescription className="text-purple-800">
    //             <div className="space-y-3">
    //               <h3 className="text-lg font-bold">✅ Bantuan Level 3 Selesai!</h3>
    //               <p>Ini adalah kesempatan terakhir Anda untuk mengerjakan kuis utama. Pastikan Anda sudah siap!</p>
    //               <div className="mt-3 p-3 bg-purple-100 rounded-lg">
    //                 <p className="text-sm font-medium">
    //                   ✅ Bantuan Level 3: Selesai<br/>
    //                   🎯 Target: Skor ≥ 70% atau Semua Benar<br/>
    //                   ⚠️ Ini adalah percobaan terakhir Anda!
    //                 </p>
    //               </div>
    //               <Button onClick={handleStartQuiz} disabled={startingQuiz} className="mt-3 bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2">
    //                 {startingQuiz ? (
    //                   <>
    //                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
    //                     Memulai...
    //                   </>
    //                 ) : (
    //                   <>
    //                     <CheckCircle className="h-4 w-4 mr-2" />
    //                     Mulai Percobaan Terakhir
    //                   </>
    //                 )}
    //               </Button>
    //             </div>
    //           </AlertDescription>
    //         </div>
    //       </div>
    //     </Alert>
    //   );
    // }
    
    // if (currentAssistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL3) {
    //   return (
    //     <Alert className="mb-8 bg-linear-to-r from-red-50 to-rose-50 border-red-300 shadow-md">
    //       <div className="flex items-start">
    //         <div className="bg-red-500 rounded-full p-2 mr-4">
    //           <FileText className="h-6 w-6 text-white" />
    //         </div>
    //         <div className="flex-1">
    //           <AlertDescription className="text-red-800">
    //             <div className="space-y-3">
    //               <h3 className="text-lg font-bold">📚 Bantuan Level 3 Diperlukan</h3>
    //               <p>Percobaan ketiga belum mencapai passing grade 70%. Pelajari materi referensi ini untuk persiapan terakhir.</p>
    //               <div className="mt-3 p-3 bg-red-100 rounded-lg">
    //                 <p className="text-sm font-medium">
    //                   🎯 Target: Memahami konsep secara menyeluruh<br/>
    //                   📚 Format: Materi referensi lengkap<br/>
    //                   ⚠️ Setelah ini: Kesempatan terakhir mengerjakan kuis
    //                 </p>
    //               </div>
    //               <Button onClick={() => handleGoToAssistance(3)} className="mt-3 bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2">
    //                 <FileText className="h-4 w-4 mr-2" />
    //                 Lihat Materi Bantuan Level 3
    //               </Button>
    //             </div>
    //           </AlertDescription>
    //         </div>
    //       </div>
    //     </Alert>
    //   );
    // }
    
    return (
      <div className="bg-linear-to-r from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200 shadow-sm mb-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-gray-800 flex items-center">
              📊 Status Kuis
            </h3>
            <div className="space-y-1">
              {/* <p className="text-gray-700 text-sm">
                Percobaan saat ini: <span className="font-semibold">{quizStatus.currentAttempt || 0}</span> dari <span className="font-semibold">{quizStatus.maxAttempts || 4}</span>
              </p> */}
              <p className="text-xs text-gray-500">
                🎯 Target: Skor ≥ 70% atau Semua Jawaban Benar
              </p>
            </div>
          </div>
          {quizStatus.lastSubmission && (
            <div className="flex items-center">
              {quizStatus.lastSubmission.status === SubmissionStatus.PASSED ? (
                <span className="inline-flex items-center text-sm font-medium text-green-700 bg-green-100 rounded-full px-3 py-1.5 shadow-sm">
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Lulus
                </span>
              ) : quizStatus.lastSubmission.status === SubmissionStatus.FAILED ? (
                <span className="inline-flex items-center text-sm font-medium text-red-700 bg-red-100 rounded-full px-3 py-1.5 shadow-sm">
                  <XCircle className="h-4 w-4 mr-1.5" /> Tidak Lulus
                </span>
              ) : (
                // Hitung status berdasarkan passing grade 70%
                (() => {
                  const correctAnswers = quizStatus.lastSubmission.correctAnswers || 0;
                  const totalQuestions = quizStatus.lastSubmission.totalQuestions || 0;
                  const scorePercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
                  const allCorrect = correctAnswers === totalQuestions && totalQuestions > 0;
                  const actuallyPassed = scorePercent >= 70 || allCorrect;
                  
                  return actuallyPassed ? (
                    <span className="inline-flex items-center text-sm font-medium text-green-700 bg-green-100 rounded-full px-3 py-1.5 shadow-sm">
                      <CheckCircle className="h-4 w-4 mr-1.5" /> Lulus ({scorePercent}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-sm font-medium text-orange-700 bg-orange-100 rounded-full px-3 py-1.5 shadow-sm">
                      <XCircle className="h-4 w-4 mr-1.5" /> Belum Lulus ({scorePercent}%)
                    </span>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
    
  const renderFailedQuiz = () => {
    if (!quizStatus || !quizData) return null;
    return (
      <Card className="mb-6 bg-linear-to-r from-red-50 to-rose-50 border-red-300 shadow-lg">
        <CardHeader className="bg-linear-to-r from-red-100 to-rose-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-red-800 flex items-center text-xl">
              <div className="bg-red-500 rounded-full p-2 mr-3">
                <X className="h-6 w-6 text-white" />
              </div>
              Kuis Tidak Berhasil Diselesaikan
            </CardTitle>
          </div>
          <CardDescription className="text-red-700 text-base">
            Anda telah mencapai batas maksimal {quizData.maxAttempts} kali percobaan dan belum mencapai passing grade 70%
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-red-200 shadow-sm">
                <h4 className="font-semibold text-red-800 mb-2">📊 Hasil Terakhir</h4>
                <p className="text-red-700">
                  Skor: <span className="font-bold text-xl">{quizStatus.lastSubmission?.score || 0}%</span>
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Target: {quizData.passingScore || 70}% untuk lulus
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-red-200 shadow-sm">
                <h4 className="font-semibold text-red-800 mb-2">📈 Statistik</h4>
                <p className="text-red-700 text-sm">
                  Total Percobaan: {quizData.maxAttempts}<br/>
                  Status Akhir: Tidak Lulus<br/>
                  Bantuan Digunakan: {[quizStatus.level1Completed, quizStatus.level2Completed, quizStatus.level3Completed].filter(Boolean).length}/3
                </p>
              </div>
            </div>
            
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Langkah Selanjutnya:</strong> Anda telah mencapai batas maksimal percobaan. 
                Silakan hubungi pengajar Anda untuk bimbingan lebih lanjut dan diskusi tentang materi yang belum dipahami.
              </AlertDescription>
            </Alert>
            
            <div className="pt-2">
              <Button variant="outline" onClick={handleViewHistory} className="w-full border-red-300 text-red-700 hover:bg-red-50">
                <RotateCcw className="h-4 w-4 mr-2" />
                Lihat Riwayat Semua Percobaan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const renderPassedQuiz = () => {
    if (!quizStatus || !quizData) return null;
    return (
      <Card className="mb-6 bg-linear-to-r from-green-50 to-emerald-50 border-green-300 shadow-lg">
        <CardHeader className="bg-linear-to-r from-green-100 to-emerald-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-800 flex items-center text-xl">
              <div className="bg-green-500 rounded-full p-2 mr-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              🎉 Kuis Berhasil Diselesaikan!
            </CardTitle>
          </div>
          <CardDescription className="text-green-700 text-base">
            Selamat! Anda telah berhasil mencapai passing grade dan menyelesaikan kuis ini
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                <h4 className="font-semibold text-green-800 mb-2">🏆 Hasil Anda</h4>
                <p className="text-green-700">
                  Skor: <span className="font-bold text-2xl text-green-600">{quizStatus.lastSubmission?.score || 0}%</span>
                </p>
                <p className="text-sm text-green-600 mt-1">
                  ✅ Melebihi passing grade {quizData.passingScore || 70}%
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                <h4 className="font-semibold text-green-800 mb-2">📈 Pencapaian</h4>
                <p className="text-green-700 text-sm">
                  Status: <span className="font-semibold">LULUS</span><br/>
                  Kriteria: Skor ≥ 70%<br/>
                  Dapat melanjutkan ke materi berikutnya
                </p>
              </div>
            </div>
            
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Selamat!</strong> Anda telah berhasil menyelesaikan kuis ini dengan mencapai passing grade 70%. 
                Anda tidak perlu mengerjakan kuis ini lagi dan dapat melanjutkan ke materi pembelajaran berikutnya.
              </AlertDescription>
            </Alert>
            
            <div className="pt-2">
              <Button variant="outline" onClick={handleViewHistory} className="w-full border-green-300 text-green-700 hover:bg-green-50">
                <RotateCcw className="h-4 w-4 mr-2" />
                Lihat Riwayat Pencapaian
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const showEmergencyStartButton = quizStatus && 
                                   (quizStatus.currentAttempt === 0) &&
                                   !quizStatus.lastSubmission;

  const showMainStartButton = quizStatus &&
                              (quizStatus.canTakeQuiz ||
                               quizStatus.currentAttempt === 0 ||
                               quizStatus.nextStep === "TRY_MAIN_QUIZ_AGAIN" ||
                               // After completing assistance based on failedAttempts
                               (quizStatus.failedAttempts === 1 && quizStatus.level1Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE) ||
                               (quizStatus.failedAttempts === 2 && quizStatus.level2Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE) ||
                               (quizStatus.failedAttempts === 3 && quizStatus.level3Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE) ||
                               // Manual override by teacher
                               (quizStatus.overrideSystemFlow && quizStatus.manuallyAssignedLevel === AssistanceRequirement.NONE)) &&
                              (!quizStatus.lastSubmission || quizStatus.lastSubmission.status !== SubmissionStatus.PENDING) &&
                              // Don't show if quiz is already passed or failed
                              quizStatus.finalStatus !== SubmissionStatus.PASSED &&
                              quizStatus.finalStatus !== SubmissionStatus.FAILED;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button variant="ghost" size="sm" className="mb-8" onClick={() => router.push('/student/quizzes')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Kuis
        </Button>
        
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900">{quizData.title}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{quizData.description || 'Tidak ada deskripsi'}</p>
          {quizData.classId && (
            <div className="flex items-center mt-3">
              <p className="text-sm text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
                Kelas: {quizData.classId}
              </p>
            </div>
          )}
        </div>
        
        {showEmergencyStartButton && (
          <Alert className="mb-8 bg-linear-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-sm">
            <div className="flex items-start p-2">
              <BookOpen className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="ml-4 flex-1">
                <AlertTitle className="text-blue-800 text-lg font-semibold">Kuis Baru</AlertTitle>
                <AlertDescription className="text-blue-700 mt-2">
                  <p className="mb-4">Ini adalah kuis baru yang siap untuk dikerjakan.</p>
                  <div className="flex justify-end">
                    <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-2" onClick={handleStartQuiz} disabled={startingQuiz}>
                      {startingQuiz ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memulai...</> : <>Mulai Kuis Sekarang <ChevronRight className="ml-2 h-4 w-4" /></>}
                    </Button>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
        
        {renderQuizStatus()}
        
        {quizStatus?.finalStatus === SubmissionStatus.FAILED && renderFailedQuiz()}
        {quizStatus?.finalStatus === SubmissionStatus.PASSED && renderPassedQuiz()}

        {/* Jika belum lulus dan belum gagal, tampilkan informasi kuis normal */}
        {(quizStatus?.finalStatus as SubmissionStatus) !== SubmissionStatus.PASSED && 
         (quizStatus?.finalStatus as SubmissionStatus) !== SubmissionStatus.FAILED && (
          <Card className="mb-8 bg-linear-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
            <CardHeader className="bg-linear-to-r from-blue-100 to-indigo-100 rounded-t-lg p-6">
              <CardTitle className="flex items-center text-xl sm:text-2xl text-blue-900">
                <BookOpen className="h-6 w-6 mr-3 text-blue-600" />
                Informasi Kuis
              </CardTitle>
              <CardDescription className="text-blue-700 text-base mt-2">
                Detail lengkap tentang kuis ini dan sistem penilaian
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-8">
                {/* Grid Informasi Utama */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-5 bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <FileText className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="font-semibold text-blue-800">Jumlah Pertanyaan</h3>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{quizData.questions?.length || 0}</p>
                    <p className="text-sm text-blue-600 mt-1">pertanyaan tersedia</p>
                  </div>
                  
                  <div className="p-5 bg-white rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <Target className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="font-semibold text-green-800">Passing Grade</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-900">70%</p>
                    <p className="text-sm text-green-600 mt-1">minimum untuk lulus</p>
                  </div>
                  
                  <div className="p-5 bg-white rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center mb-3">
                      <RotateCcw className="h-5 w-5 text-purple-600 mr-2" />
                      <h3 className="font-semibold text-purple-800">Maksimal Percobaan</h3>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">{quizStatus?.maxAttempts || 4}</p>
                    <p className="text-sm text-purple-600 mt-1">kali percobaan</p>
                  </div>
                </div>
                
                {/* Sistem Penilaian */}
                <div className="p-6 bg-linear-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
                  <h3 className="font-semibold text-cyan-800 mb-4 flex items-center text-lg">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Sistem Penilaian & Kriteria Lulus
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h4 className="font-medium text-cyan-700 mb-3">Kriteria Kelulusan:</h4>
                      <ul className="space-y-2 text-cyan-600">
                        <li className="flex items-center">
                          <span className="mr-2">✅</span>
                          Skor ≥ 70% ATAU
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">✅</span>
                          Semua jawaban benar
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">✅</span>
                          Penilaian otomatis sistem
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-cyan-700 mb-3">Bantuan Tersedia:</h4>
                      <ul className="space-y-2 text-cyan-600">
                        <li className="flex items-center">
                          <span className="mr-2">📚</span>
                          Level 1: Kuis pilihan ganda
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">📝</span>
                          Level 2: Pertanyaan essay
                        </li>
                        <li className="flex items-center">
                          <span className="mr-2">📖</span>
                          Level 3: Materi referensi
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {quizStatus && (
                  <div className="border-t border-gray-200 pt-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800 flex items-center text-lg">
                          <AlertCircle className="h-5 w-5 mr-2 text-gray-600" />
                          Status Saat Ini
                        </h3>
                        <div className="space-y-2">
                          <p className="text-gray-700">
                            <strong>Status:</strong>{' '}
                            {(quizStatus.finalStatus as SubmissionStatus) === SubmissionStatus.PASSED ? (
                              <span className="text-green-600 font-semibold">✅ Lulus</span>
                            ) : (quizStatus.finalStatus as SubmissionStatus) === SubmissionStatus.FAILED ? (
                              <span className="text-red-600 font-semibold">❌ Gagal (batas percobaan habis)</span>
                            ) : quizStatus.lastSubmission?.status === SubmissionStatus.PENDING ? (
                              (() => {
                                const correctAnswers = quizStatus.lastSubmission.correctAnswers || 0;
                                const totalQuestions = quizStatus.lastSubmission.totalQuestions || 0;
                                const scorePercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
                                const allCorrect = correctAnswers === totalQuestions && totalQuestions > 0;
                                const actuallyPassed = scorePercent >= 70 || allCorrect;
                                
                                return actuallyPassed ? (
                                  <span className="text-green-600 font-semibold">✅ Lulus (Otomatis - {scorePercent}%)</span>
                                ) : (
                                  <span className="text-orange-600 font-semibold">⏳ Belum Lulus ({scorePercent}%)</span>
                                );
                              })()
                            ) : quizStatus.canTakeQuiz ? (
                              <span className="text-blue-600 font-semibold">🚀 Siap untuk dikerjakan</span>
                            ) : quizStatus.currentAttempt === 0 ? (
                              <span className="text-blue-600 font-semibold">🆕 Kuis baru</span>
                            ) : (quizStatus.overrideSystemFlow && quizStatus.manuallyAssignedLevel === AssistanceRequirement.NONE) ? (
                              <span className="text-blue-600 font-semibold">👨‍🏫 Diaktifkan guru</span>
                            ) : (
                              <span className="text-gray-600">⏸️ Perlu bantuan terlebih dahulu</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* MainQuizButton handles all assistance completion logic and quiz button display */}
                      <MainQuizButton 
                        quizId={quizId}
                        onStartQuiz={handleStartQuiz}
                        isStartingQuiz={startingQuiz}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* <section id="submission-details" className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Detail Pengerjaan</h2>
          <QuizSubmissionDetails quizId={quizId} />
        </section> */}

        {quizData && quizStatus && (
          <section className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Bantuan Kuis</h2>
              {/* Quick assistance status overview */}
              <AssistanceStatusIndicator quizId={quizId} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Level 1: Enabled only if failedAttempts = 1 and not completed */}
              <Card className={`border transition-all duration-300 hover:shadow-lg ${
                quizStatus.failedAttempts === 1 && !quizStatus.level1Completed
                  ? "border-blue-300 shadow-md"
                  : quizStatus.level1Completed
                  ? "border-green-300 shadow-md"
                  : "border-gray-200 opacity-60"
              }`}>
                <CardHeader className={`p-6 ${
                  quizStatus.failedAttempts === 1 && !quizStatus.level1Completed
                    ? "bg-linear-to-r from-blue-50 to-blue-100"
                    : quizStatus.level1Completed
                    ? "bg-linear-to-r from-green-50 to-green-100"
                    : "bg-gray-50"
                }`}>
                  <CardTitle className={`text-lg ${
                    quizStatus.failedAttempts === 1 || quizStatus.level1Completed ? "" : "text-gray-500"
                  }`}>
                    Bantuan Level 1
                  </CardTitle>
                  <CardDescription className={`mt-2 ${
                    quizStatus.failedAttempts === 1 || quizStatus.level1Completed
                      ? "" 
                      : "text-gray-400"
                  }`}>
                    {quizStatus.level1Completed 
                      ? "Sudah Diselesaikan" 
                      : quizStatus.failedAttempts === 1
                      ? "Latihan Dasar"
                      : quizStatus.failedAttempts === 0
                      ? "Tersedia setelah 1 kali percobaan gagal"
                      : "Tidak tersedia pada tahap ini"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <p className={`text-sm mb-6 leading-relaxed ${
                    quizStatus.failedAttempts === 1 || quizStatus.level1Completed ? "" : "text-gray-500"
                  }`}>
                    {quizStatus.level1Completed 
                      ? "Anda telah menyelesaikan bantuan level 1 dengan baik." 
                      : quizStatus.failedAttempts === 1
                      ? "Kuis pilihan ganda sederhana untuk memperkuat pemahaman materi dasar."
                      : "Bantuan ini tersedia setelah 1 kali percobaan gagal."
                    }
                  </p>
                  {quizData.assistanceLevel1Id ? (
                    <Button 
                      onClick={() => handleGoToAssistance(1)} 
                      disabled={quizStatus.failedAttempts !== 1 || quizStatus.level1Completed}
                      className={`w-full py-3 ${
                        quizStatus.level1Completed
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : quizStatus.failedAttempts === 1
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {quizStatus.level1Completed 
                        ? "Sudah Diselesaikan" 
                        : quizStatus.failedAttempts === 1
                        ? "Kerjakan Bantuan"
                        : "Belum Tersedia"
                      }
                    </Button>
                  ) : (
                    <Button 
                      disabled
                      className="w-full py-3 bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      Tidak Dikonfigurasi
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {/* Level 2: Enabled only if failedAttempts = 2 and not completed */}
              <Card className={`border transition-all duration-300 hover:shadow-lg ${
                quizStatus.failedAttempts === 2 && !quizStatus.level2Completed
                  ? "border-amber-300 shadow-md"
                  : quizStatus.level2Completed
                  ? "border-green-300 shadow-md"
                  : "border-gray-200 opacity-60"
              }`}>
                <CardHeader className={`p-6 ${
                  quizStatus.failedAttempts === 2 && !quizStatus.level2Completed
                    ? "bg-linear-to-r from-amber-50 to-amber-100"
                    : quizStatus.level2Completed
                    ? "bg-linear-to-r from-green-50 to-green-100"
                    : "bg-gray-50"
                }`}>
                  <CardTitle className={`text-lg ${
                    quizStatus.failedAttempts === 2 || quizStatus.level2Completed ? "" : "text-gray-500"
                  }`}>
                    Bantuan Level 2
                  </CardTitle>
                  <CardDescription className={`mt-2 ${
                    quizStatus.failedAttempts === 2 || quizStatus.level2Completed
                      ? "" 
                      : "text-gray-400"
                  }`}>
                    {quizStatus.level2Completed 
                      ? "Sudah Diselesaikan" 
                      : quizStatus.failedAttempts === 2
                      ? "Pendalaman Materi"
                      : quizStatus.failedAttempts < 2
                      ? "Tersedia setelah 2 kali percobaan gagal"
                      : "Tidak tersedia pada tahap ini"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <p className={`text-sm mb-6 leading-relaxed ${
                    quizStatus.failedAttempts === 2 || quizStatus.level2Completed ? "" : "text-gray-500"
                  }`}>
                    {quizStatus.level2Completed 
                      ? "Anda telah menyelesaikan bantuan level 2 dengan baik." 
                      : quizStatus.failedAttempts === 2
                      ? "Pertanyaan essay untuk membantu memperdalam pemahaman konsep."
                      : "Bantuan ini tersedia setelah 2 kali percobaan gagal."
                    }
                  </p>
                  {quizData.assistanceLevel2Id ? (
                    <Button 
                      onClick={() => handleGoToAssistance(2)} 
                      disabled={quizStatus.failedAttempts !== 2 || quizStatus.level2Completed}
                      className={`w-full py-3 ${
                        quizStatus.level2Completed
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : quizStatus.failedAttempts === 2
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {quizStatus.level2Completed 
                        ? "Sudah Diselesaikan" 
                        : quizStatus.failedAttempts === 2
                        ? "Kerjakan Bantuan"
                        : "Belum Tersedia"
                      }
                    </Button>
                  ) : (
                    <Button 
                      disabled
                      className="w-full py-3 bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      Tidak Dikonfigurasi
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {/* Level 3: Enabled only if failedAttempts = 3 and not completed */}
              <Card className={`border transition-all duration-300 hover:shadow-lg ${
                quizStatus.failedAttempts === 3 && !quizStatus.level3Completed
                  ? "border-red-300 shadow-md"
                  : quizStatus.level3Completed
                  ? "border-green-300 shadow-md"
                  : "border-gray-200 opacity-60"
              }`}>
                <CardHeader className={`p-6 ${
                  quizStatus.failedAttempts === 3 && !quizStatus.level3Completed
                    ? "bg-linear-to-r from-red-50 to-red-100"
                    : quizStatus.level3Completed
                    ? "bg-linear-to-r from-green-50 to-green-100"
                    : "bg-gray-50"
                }`}>
                  <CardTitle className={`text-lg ${
                    quizStatus.failedAttempts === 3 || quizStatus.level3Completed ? "" : "text-gray-500"
                  }`}>
                    Bantuan Level 3
                  </CardTitle>
                  <CardDescription className={`mt-2 ${
                    quizStatus.failedAttempts === 3 || quizStatus.level3Completed
                      ? "" 
                      : "text-gray-400"
                  }`}>
                    {quizStatus.level3Completed 
                      ? "Sudah Dibaca" 
                      : quizStatus.failedAttempts === 3
                      ? "Materi Referensi"
                      : quizStatus.failedAttempts < 3
                      ? "Tersedia setelah 3 kali percobaan gagal"
                      : "Tidak tersedia pada tahap ini"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <p className={`text-sm mb-6 leading-relaxed ${
                    quizStatus.failedAttempts === 3 || quizStatus.level3Completed ? "" : "text-gray-500"
                  }`}>
                    {quizStatus.level3Completed 
                      ? "Anda telah mempelajari materi referensi level 3." 
                      : quizStatus.failedAttempts === 3
                      ? "Materi referensi lengkap untuk mempelajari konsep secara menyeluruh sebelum percobaan terakhir."
                      : "Bantuan ini tersedia setelah 3 kali percobaan gagal."
                    }
                  </p>
                  {quizData.assistanceLevel3Id ? (
                    <Button 
                      onClick={() => handleGoToAssistance(3)} 
                      disabled={quizStatus.failedAttempts !== 3 || quizStatus.level3Completed}
                      className={`w-full py-3 ${
                        quizStatus.level3Completed
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : quizStatus.failedAttempts === 3
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {quizStatus.level3Completed 
                        ? "Sudah Diselesaikan" 
                        : quizStatus.failedAttempts === 3
                        ? "Lihat Materi"
                        : "Belum Tersedia"
                      }
                    </Button>
                  ) : (
                    <Button 
                      disabled
                      className="w-full py-3 bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      Tidak Dikonfigurasi
                    </Button>
                  )}
                </CardContent>
              </Card>

            </div>
            
            {/* Important Notice about Mandatory Quiz Taking */}
            {quizStatus && (quizStatus.level1Completed || quizStatus.level2Completed || quizStatus.level3Completed) && 
             (quizStatus.finalStatus as SubmissionStatus) !== SubmissionStatus.PASSED && 
             (quizStatus.finalStatus as SubmissionStatus) !== SubmissionStatus.FAILED && (
              <div className="mt-8 p-6 bg-linear-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl shadow-sm">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-4" />
                  <div>
                    <h3 className="font-medium text-yellow-800 text-lg">Penting: Wajib Mengerjakan Kuis Utama</h3>
                    <p className="text-sm text-yellow-700 mt-2 leading-relaxed">
                      Setelah menyelesaikan bantuan apa pun (Level 1, 2, atau 3), Anda <strong>WAJIB</strong> mengerjakan kuis utama lagi sebelum dapat melanjutkan ke tahap berikutnya. 
                      Bantuan hanya membantu Anda mempersiapkan diri untuk kuis utama.
                    </p>
                    {(quizStatus.nextStep === "TRY_MAIN_QUIZ_AGAIN" || 
                      (quizStatus.assistanceRequired === AssistanceRequirement.NONE && 
                       (quizStatus.level1Completed || quizStatus.level2Completed || quizStatus.level3Completed))) && (
                      <Button 
                        onClick={handleStartQuiz} 
                        disabled={startingQuiz}
                        className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2"
                      >
                        {startingQuiz ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Memulai...
                          </>
                        ) : (
                          <>
                            Mulai Kuis Utama Sekarang (Wajib)
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Fallback Action Button - Always show if student can take quiz but no button shown above
        {quizStatus && !showMainStartButton && (
          quizStatus.nextStep === "TRY_MAIN_QUIZ_AGAIN" ||
          (quizStatus.failedAttempts === 1 && quizStatus.level1Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE) ||
          (quizStatus.failedAttempts === 2 && quizStatus.level2Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE) ||
          (quizStatus.failedAttempts === 3 && quizStatus.level3Completed && quizStatus.assistanceRequired === AssistanceRequirement.NONE)
        ) && (
          <div className="mt-8 p-6 bg-linear-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="font-medium text-blue-800 text-lg">Siap untuk Kuis Utama</h3>
                <p className="text-sm text-blue-600 mt-2">
                  Anda telah menyelesaikan bantuan yang diperlukan dan dapat melanjutkan ke kuis utama.
                </p>
              </div>
              <Button 
                onClick={handleStartQuiz} 
                disabled={startingQuiz}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 lg:shrink-0"
              >
                {startingQuiz ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memulai...
                  </>
                ) : (
                  <>
                    Mulai Kuis Utama
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )} */}

        {/* Additional fallback for completed assistance levels */}
        {quizStatus && !showMainStartButton && (
          ((quizStatus.failedAttempts === 1 && quizStatus.level1Completed) ||
           (quizStatus.failedAttempts === 2 && quizStatus.level2Completed) ||
           (quizStatus.failedAttempts === 3 && quizStatus.level3Completed)) &&
          (quizStatus.finalStatus as SubmissionStatus) !== SubmissionStatus.PASSED &&
          (quizStatus.finalStatus as SubmissionStatus) !== SubmissionStatus.FAILED &&
          (!quizStatus.lastSubmission || quizStatus.lastSubmission.status !== SubmissionStatus.PENDING)
        ) && (
          <div className="mt-8 p-6 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="font-medium text-amber-800 text-lg">Bantuan Diselesaikan</h3>
                <p className="text-sm text-amber-600 mt-2">
                  Anda telah menyelesaikan bantuan. Jika Anda tidak melihat tombol untuk kuis utama, coba refresh halaman atau hubungi pengajar.
                </p>
              </div>
              <div className="flex gap-3 lg:shrink-0">
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button 
                  onClick={handleStartQuiz} 
                  disabled={startingQuiz}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {startingQuiz ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memulai...
                    </>
                  ) : (
                    <>
                      Coba Mulai Kuis
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Debug Information - Remove this in production
        {process.env.NODE_ENV === 'development' && quizStatus && (
          <div className="mt-8 p-6 bg-gray-100 border border-gray-300 rounded-xl shadow-sm">
            <details>
              <summary className="cursor-pointer font-medium text-gray-700">Debug Info (Development Only)</summary>
              <div className="mt-4 text-xs space-y-2 font-mono">
                <p><strong>showMainStartButton:</strong> {showMainStartButton ? 'true' : 'false'}</p>
                <p><strong>canTakeQuiz:</strong> {quizStatus.canTakeQuiz ? 'true' : 'false'}</p>
                <p><strong>currentAttempt:</strong> {quizStatus.currentAttempt}</p>
                <p><strong>failedAttempts:</strong> {quizStatus.failedAttempts}</p>
                <p><strong>nextStep:</strong> {quizStatus.nextStep || 'null'}</p>
                <p><strong>assistanceRequired:</strong> {quizStatus.assistanceRequired}</p>
                <p><strong>level1Completed:</strong> {quizStatus.level1Completed ? 'true' : 'false'}</p>
                <p><strong>level2Completed:</strong> {quizStatus.level2Completed ? 'true' : 'false'}</p>
                <p><strong>level3Completed:</strong> {quizStatus.level3Completed ? 'true' : 'false'}</p>
                <p><strong>finalStatus:</strong> {quizStatus.finalStatus || 'null'}</p>
                <p><strong>lastSubmission.status:</strong> {quizStatus.lastSubmission?.status || 'null'}</p>
              </div>
            </details>
          </div>
        )} */}
      </div>
    </div>
  );
}