"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription,  } from "@/components/ui/alert";
import { AlertCircle, FileText, PencilRuler, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Definisikan tipe yang lebih spesifik jika memungkinkan, atau gunakan unknown
interface QuizStatusData {
  currentAttempt: number;
  failedAttempts: number;
  lastAttemptPassed: boolean | null;
  finalStatus: string | null;
  level1Completed: boolean;
  level2Completed: boolean;
  level3Completed: boolean;
  overrideSystemFlow: boolean;
  manuallyAssignedLevel: string | null; // Sebaiknya enum AssistanceRequirement jika ada di client
  assistanceRequired: string; // Sebaiknya enum AssistanceRequirement jika ada di client
  nextStep: string | null;
  canTakeQuiz: boolean;
  maxAttempts: number;
  passingScore: number;
  lastMainQuizSubmission: {
    status: string; // Sebaiknya enum SubmissionStatus jika ada di client
    score: number | null;
    correctAnswers?: number;
    totalQuestions?: number;
  } | null;
  // Tambahkan semua submisi untuk history lengkap
  allMainQuizSubmissions?: Array<{
    id: string;
    status: string;
    score: number | null;
    correctAnswers?: number;
    totalQuestions?: number;
    createdAt: Date;
    attemptNumber: number;
  }>;
  assistanceStatus: {
    level1: { available: boolean; completed: boolean };
    level2: { available: boolean; completed: boolean };
    level3: { available: boolean; completed: boolean };
  };
  progress?: { assistanceRequired?: string }; // Ini mungkin bisa dihilangkan jika semua info ada di root
}



/**
 * Komponen untuk menampilkan detail submit jawaban kuis dan status kuis
 */
export default function QuizSubmissionDetails({ quizId }: { quizId: string }) {
  const [loading, setLoading] = useState(true);
  const [quizStatus, setQuizStatus] = useState<QuizStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<{ id: string; answers?: Array<{ isCorrect: boolean }> } | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<Array<{ id: string; status: string; score?: number; correctAnswers?: number; totalQuestions?: number; answers?: Array<{ isCorrect: boolean }> }>>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchQuizStatusAndSubmission = async () => {
      try {
        setLoading(true);
        
        // Fungsi untuk mendapatkan status kuis dari server
        const getQuizStatus = async () => {
          const response = await fetch(`/api/student/quiz-status?quizId=${quizId}`);
          if (!response.ok) {
            throw new Error('Gagal mendapatkan status kuis');
          }
          return response.json();
        };
        
        // Fungsi untuk mendapatkan submisi terakhir
        const getLastSubmission = async () => {
          const response = await fetch(`/api/student/last-quiz-submission?quizId=${quizId}`);
          if (!response.ok) {
            // Ini bukan error fatal, siswa mungkin belum pernah mengerjakan kuis
            console.log('Belum ada submisi untuk kuis ini');
            return null;
          }
          return response.json();
        };
        
        // Fungsi untuk mendapatkan semua submisi
        const getAllSubmissions = async () => {
          const response = await fetch(`/api/student/quiz-submissions?quizId=${quizId}`);
          if (!response.ok) {
            console.log('Gagal mengambil semua submisi');
            return null;
          }
          return response.json();
        };
        
        // Jalankan request secara paralel
        const [statusResult, submissionResult, allSubmissionsResult] = await Promise.all([
          getQuizStatus(),
          getLastSubmission().catch(() => null), // Tangkap error pada submisi
          getAllSubmissions().catch(() => null) // Tangkap error pada semua submisi
        ]);
         if (statusResult.success) {
          console.log("QuizSubmissionDetails: Status kuis diterima:", statusResult.data);
          setQuizStatus(statusResult.data);
        } else {
          console.error('Error dari server:', statusResult.message);
          setError(statusResult.message);
        }
        
        // Set last submission jika berhasil
        if (submissionResult && submissionResult.success && submissionResult.data) {
          console.log("Last submission:", submissionResult.data);
          setLastSubmission(submissionResult.data);
        }
        
        // Set all submissions jika berhasil
        if (allSubmissionsResult && allSubmissionsResult.success && allSubmissionsResult.data) {
          console.log("All submissions:", allSubmissionsResult.data.length);
          setAllSubmissions(allSubmissionsResult.data);
        }
      } catch (err) {
        console.error('Error saat mengambil data:', err);
        setError('Terjadi kesalahan saat memuat data kuis');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuizStatusAndSubmission();
  }, [quizId]);
  
  // Handle pergi ke bantuan
  // const handleGoToAssistance = (level: number) => {
  //   router.push(`/student/quizzes/${quizId}/assistance/level${level}`);
  // };
  
  if (loading) {
    return (
      <div className="flex justify-center my-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!quizStatus) {
    return (
      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Tidak dapat memuat status kuis</AlertDescription>
      </Alert>
    );
  }
  
  // Menentukan status terkini dan alur berikutnya
  const renderAssistanceStatus = () => {
    if (!quizStatus) return null;

    console.log("Debug assistanceRequired:", quizStatus.assistanceRequired);
    console.log("Debug assistanceRequired type:", typeof quizStatus.assistanceRequired);
    console.log("Debug progress:", quizStatus.progress);
    
    const assistanceRequired = quizStatus.assistanceRequired || "NONE";
    
    console.log("Assistance required final:", assistanceRequired);
    
    // // Pemeriksaan untuk bantuan level 1
    // if (assistanceRequired === "ASSISTANCE_LEVEL1") {
    //   return (
    //     <Card className="mb-6 border-blue-200 bg-blue-50">
    //       <CardHeader className="text-blue-800">
    //         <CardTitle className="flex items-center">
    //           <BookOpen className="h-5 w-5 mr-2" />
    //           Bantuan Level 1 Diperlukan
    //         </CardTitle>
    //         <CardDescription className="text-blue-700">
    //           Anda perlu menyelesaikan kuis bantuan level 1 untuk melanjutkan
    //         </CardDescription>
    //       </CardHeader>
    //       <CardContent>
    //         <p className="text-blue-800 mb-4">
    //           Selesaikan latihan bantuan level 1 untuk memahami konsep dasar. 
    //           Anda harus menjawab semua pertanyaan dengan benar untuk dapat melanjutkan ke kuis utama.
    //         </p>
    //         <Button 
    //           onClick={() => handleGoToAssistance(1)}
    //           className="bg-blue-600 hover:bg-blue-700"
    //         >
    //           Mulai Bantuan Level 1
    //         </Button>
    //       </CardContent>
    //     </Card>
    //   );
    // }
    
    // // Pemeriksaan untuk bantuan level 2
    // if (assistanceRequired === "ASSISTANCE_LEVEL2") {
    //   return (
    //     <Card className="mb-6 border-amber-200 bg-amber-50">
    //       <CardHeader className="text-amber-800">
    //         <CardTitle className="flex items-center">
    //           <HelpCircle className="h-5 w-5 mr-2" />
    //           Bantuan Level 2 Diperlukan
    //         </CardTitle>
    //         <CardDescription className="text-amber-700">
    //           Anda perlu menyelesaikan kuis bantuan level 2 untuk melanjutkan
    //         </CardDescription>
    //       </CardHeader>
    //       <CardContent>
    //         <p className="text-amber-800 mb-4">
    //           Pada bantuan level 2, Anda akan menjawab pertanyaan essay. Jawaban Anda akan disimpan dan ditampilkan
    //           berurutan untuk membantu pemahaman yang lebih mendalam.
    //         </p>
    //         <Button 
    //           onClick={() => handleGoToAssistance(2)}
    //           className="bg-amber-600 hover:bg-amber-700"
    //         >
    //           Mulai Bantuan Level 2
    //         </Button>
    //       </CardContent>
    //     </Card>
    //   );
    // }
    
    // // Pemeriksaan untuk bantuan level 3
    // if (assistanceRequired === "ASSISTANCE_LEVEL3") {
    //   return (
    //     <Card className="mb-6 border-red-200 bg-red-50">
    //       <CardHeader className="text-red-800">
    //         <CardTitle className="flex items-center">
    //           <FileText className="h-5 w-5 mr-2" />
    //           Bantuan Level 3 Diperlukan
    //         </CardTitle>
    //         <CardDescription className="text-red-700">
    //           Anda perlu mempelajari materi referensi untuk melanjutkan
    //         </CardDescription>
    //       </CardHeader>
    //       <CardContent>
    //         <p className="text-red-800 mb-4">
    //           Pada bantuan level 3, Anda perlu mempelajari materi referensi dalam bentuk PDF yang
    //           telah disiapkan oleh guru. Ini adalah kesempatan terakhir Anda untuk memahami konsep sebelum
    //           percobaan terakhir kuis.
    //         </p>
    //         <Button 
    //           onClick={() => handleGoToAssistance(3)}
    //           className="bg-red-600 hover:bg-red-700"
    //         >
    //           Lihat Materi Bantuan Level 3
    //         </Button>
    //       </CardContent>
    //     </Card>
    //   );
    // }
    
    return null;
  };
  
  // Render hasil penilaian otomatis
  const renderAssessmentResult = () => {
    // Tampilkan semua submissions jika ada
    if (allSubmissions && allSubmissions.length > 0) {
      // Ambil submisi terbaru untuk ditampilkan di bagian atas
      const latestSubmission = allSubmissions[0];
      // const submissionStatus = latestSubmission.status;
      // const score = latestSubmission.score || 0;
      
      // TODO: Implementation for showing allSubmissions details can be added here
      console.log('Latest submission available:', latestSubmission.id);
    }
    // Fallback ke lastMainQuizSubmission dari quizStatus jika tidak ada allSubmissions
    else if (quizStatus?.lastMainQuizSubmission?.status === 'PENDING' || 
        quizStatus?.lastMainQuizSubmission?.status === 'PASSED' || 
        quizStatus?.lastMainQuizSubmission?.status === 'FAILED') {
      
      const submissionStatus = quizStatus.lastMainQuizSubmission.status;
      // const score = quizStatus.lastMainQuizSubmission.score || 0;
      
      // Gunakan data dari lastSubmission jika tersedia untuk correctAnswers dan totalQuestions
      let correctAnswers = 0;
      let totalQuestions = 0;
      
      // Jika lastSubmission tersedia, hitung jumlah jawaban benar/salah
      if (lastSubmission && lastSubmission.answers && Array.isArray(lastSubmission.answers)) {
        totalQuestions = lastSubmission.answers.length;
        correctAnswers = lastSubmission.answers.filter((answer: { isCorrect: boolean }) => answer.isCorrect).length;
      } else {
        // Fallback ke quizStatus jika lastSubmission tidak tersedia
        correctAnswers = quizStatus.lastMainQuizSubmission.correctAnswers || 0;
        totalQuestions = quizStatus.lastMainQuizSubmission.totalQuestions || 0;
      }
      
      const wrongAnswers = totalQuestions - correctAnswers;
      const allCorrect = correctAnswers === totalQuestions && totalQuestions > 0;
      const scorePercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      // Hasil evaluasi berdasarkan skor >= 70% ATAU semua jawaban benar
      const actualStatus = (scorePercent >= 70 || allCorrect) ? 'PASSED' : 'FAILED';
      
      let title = "";
      let description = "";
      let cardColor = "";
      let iconComponent = null;
      let statusLabel = "";
      
      // Gunakan status sebenarnya (PASSED/FAILED)
      if (actualStatus === 'PASSED') {
        title = "LULUS";
        statusLabel = allCorrect ? "Semua Jawaban Benar" : "Mencapai Passing Grade";
        description = allCorrect 
          ? "Selamat! Anda berhasil menjawab semua pertanyaan dengan benar"
          : `Selamat! Anda lulus dengan skor ${scorePercent}% (mencapai passing grade 70%)`;
        cardColor = "border-green-200 bg-green-50";
        iconComponent = <CheckCircle className="h-5 w-5 mr-2" />;
      } else {
        title = "TIDAK LULUS";
        statusLabel = submissionStatus === 'PENDING' ? "Telah Dinilai Otomatis" : "Skor Belum Mencapai Passing Grade";
        description = `Skor Anda ${scorePercent}% belum mencapai passing grade 70%. Silakan coba lagi dengan bantuan yang tersedia.`;
        cardColor = "border-red-200 bg-red-50";
        iconComponent = <XCircle className="h-5 w-5 mr-2" />;
      }
      
      return (
        <Card className={`mb-6 ${cardColor}`}>
          <CardHeader>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  {iconComponent}
                  {title}
                </CardTitle>
                <span className={`px-3 py-1 rounded-md text-sm ${allCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {statusLabel}
                </span>
              </div>
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-background">
                <h3 className="text-sm font-medium mb-2">Hasil Jawaban:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Jawaban Benar:</span>
                    <span className="font-medium text-green-600">{correctAnswers} dari {totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jawaban Salah:</span>
                    <span className="font-medium text-red-600">{wrongAnswers} dari {totalQuestions}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border bg-background">
                <h3 className="text-sm font-medium mb-2">Detail Skor:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Skor Anda:</span>
                    <span className="font-bold">{scorePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kriteria Lulus:</span>
                    <span className="font-medium">70% atau Semua Benar</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${actualStatus === 'PASSED' ? 'text-green-600' : 'text-red-600'}`}>
                      {actualStatus === 'PASSED' ? 'LULUS' : 'TIDAK LULUS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-background">
              <h3 className="text-sm font-medium mb-2">Langkah Selanjutnya:</h3>
              <p>
                {actualStatus === 'PASSED'
                  ? "Selamat! Anda telah berhasil menyelesaikan kuis ini dengan mencapai passing grade. Anda tidak perlu mengerjakan kuis ini lagi dan dapat melanjutkan ke materi berikutnya." 
                  : "Skor Anda belum mencapai passing grade 70%. Manfaatkan bantuan yang tersedia untuk memperdalam pemahaman, lalu coba kerjakan kuis lagi."}
              </p>
            </div>
            
            {/* Tambahkan tombol untuk melihat detail jawaban */}
            {(allSubmissions && allSubmissions.length > 0) && (
              <div className="p-4 rounded-lg border bg-background">
                <h3 className="text-sm font-medium mb-2">Lihat Detail Jawaban:</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Klik tombol di bawah untuk melihat jawaban Anda untuk setiap pertanyaan.
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/student/quizzes/${quizId}/submissions/${allSubmissions[0].id}`)}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Lihat Jawaban Saya
                </Button>
              </div>
            )}
            
            {/* Fallback button for lastSubmission when allSubmissions is not available */}
            {(!allSubmissions || allSubmissions.length === 0) && lastSubmission && (
              <div className="p-4 rounded-lg border bg-background">
                <h3 className="text-sm font-medium mb-2">Lihat Detail Jawaban:</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Klik tombol di bawah untuk melihat jawaban Anda untuk setiap pertanyaan.
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/student/quizzes/${quizId}/submissions/${lastSubmission.id}`)}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Lihat Jawaban Saya
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6 my-6">
      {/* Tambahkan tombol bantuan darurat jika status menunjukkan belum lulus */}
      

      {/* Tampilkan status bantuan yang diperlukan */}
      {renderAssistanceStatus()}
      
      {/* Tampilkan hasil penilaian otomatis */}
      {renderAssessmentResult()}

      {/* Kondisi untuk menampilkan tombol "Mulai Kuis" atau "Lanjutkan Kuis" */}
      {quizStatus && quizStatus.canTakeQuiz && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PencilRuler className="h-5 w-5 mr-2" />
              {quizStatus.currentAttempt > 0 ? "Lanjutkan Kuis" : "Mulai Kuis Utama"}
            </CardTitle>
            <CardDescription>
              {quizStatus.currentAttempt > 0 
                ? `Anda memiliki sisa percobaan. Ini adalah percobaan ke-${quizStatus.currentAttempt + 1} dari ${quizStatus.maxAttempts}.`
                : "Anda akan memulai kuis utama. Pastikan Anda sudah siap."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push(`/student/quizzes/${quizId}/take`)}
              className="w-full"
            >
              {quizStatus.currentAttempt > 0 ? "Lanjutkan Mengerjakan Kuis" : "Mulai Kuis"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tombol untuk melihat riwayat submisi */}
      <Button 
        variant="outline"
        onClick={() => router.push(`/student/quizzes/${quizId}/history`)}
      >
        Lihat Riwayat Pengerjaan Kuis
      </Button>

      {/* Informasi tambahan dari quizStatus (jika ada) */}
      {/* <Separator className="my-4" />
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Detail Status Tambahan</CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          <p>Next Step: {quizStatus?.nextStep}</p>
          <p>Max Attempts: {quizStatus?.maxAttempts}</p>
          <p>Passing Score: {quizStatus?.passingScore}</p>
          <p>Override Flow: {String(quizStatus?.overrideSystemFlow)}</p>
          <p>Manually Assigned Level: {quizStatus?.manuallyAssignedLevel}</p>
        </CardContent>
      </Card> */} 
    </div>
  );
} 