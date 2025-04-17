"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, FileText, BookOpen, PencilRuler, ChevronRight, X, RotateCcw, HelpCircle, Check, ChevronLeft, AlertTriangle } from "lucide-react";
import { getStudentQuizStatus, incrementQuizAttempt } from "@/lib/actions/quiz-progress-actions";
import { getQuizById } from "@/lib/actions/quiz-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner"

import { SubmissionStatus, AssistanceRequirement } from "@/types";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import QuizSubmissionDetails from "./QuizSubmissionDetails";

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshStatus = searchParams.get('refreshStatus');
  const quizId = params.quizId as string;
  
  
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [quizStatus, setQuizStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingQuiz, setStartingQuiz] = useState(false);
  
  // Muat data kuis dan status
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
        
        // Dapatkan status kuis
        const statusResult = await getStudentQuizStatus(quizId, "");
        
        if (statusResult.success && statusResult.data) {
          // Debug log data status kuis
          console.log("Status kuis lengkap:", statusResult.data);
          setQuizStatus(statusResult.data);
        } else {
          console.error('Error dari server:', statusResult.message);
          if (statusResult.message) {
            setError(statusResult.message);
          } else {
            setError("Gagal memuat status kuis");
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
  }, [quizId, refreshStatus]);
  
  // Handle mulai kuis
  const handleStartQuiz = async () => {
    if (!quiz) return;
    
    setStartingQuiz(true);
    try {
      // Log status kuis sebelum navigasi
      console.log("Status kuis saat mulai kuis:", {
        currentAttempt: quizStatus?.currentAttempt,
        assistanceRequired: quizStatus?.assistanceRequired,
        progress: quizStatus?.progress,
        nextStep: quizStatus?.nextStep,
        overrideSystemFlow: quizStatus?.overrideSystemFlow,
        manuallyAssignedLevel: quizStatus?.manuallyAssignedLevel
      });
    
      // Jika guru telah override ke kuis utama, langsung mulai kuis
      if (quizStatus?.overrideSystemFlow && quizStatus?.manuallyAssignedLevel === "NONE") {
        // Increment attempt count and start quiz
        const result = await incrementQuizAttempt(quizId, "");
        
        if (!result.success) {
          toast.error(result.message || "Terjadi kesalahan saat memulai kuis");
          setStartingQuiz(false);
          return;
        }
        
        // Navigate to take quiz page
        router.push(`/student/quizzes/${quizId}/take`);
        return;
      }
    
      // Periksa apakah siswa memerlukan bantuan
      if (quizStatus?.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL1 || 
          quizStatus?.progress?.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL1 ||
          quizStatus?.nextStep === "COMPLETE_ASSISTANCE_LEVEL1") {
        // Jika perlu bantuan level 1, arahkan ke halaman bantuan
        router.push(`/student/quizzes/${quizId}/assistance/level1`);
        return;
      } else if (quizStatus?.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL2) {
        // Jika perlu bantuan level 2, arahkan ke halaman bantuan
        router.push(`/student/quizzes/${quizId}/assistance/level2`);
        return;
      } else if (quizStatus?.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL3) {
        // Jika perlu bantuan level 3, arahkan ke halaman bantuan
        router.push(`/student/quizzes/${quizId}/assistance/level3`);
        return;
      }

      // Increment attempt count and start quiz
      const result = await incrementQuizAttempt(quizId, "");
      
      if (!result.success) {
        toast.error(result.message || "Anda mungkin perlu menyelesaikan bantuan terlebih dahulu");
        setStartingQuiz(false);
        return;
      }
      
      // Navigate to take quiz page
      router.push(`/student/quizzes/${quizId}/take`);
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat memulai kuis");
      setStartingQuiz(false);
    }
  };
  
  // Handle lihat riwayat
  const handleViewHistory = () => {
    router.push(`/student/quizzes/${quizId}/history`);
  };
  
  // Handle pergi ke bantuan
  const handleGoToAssistance = (level: number) => {
    router.push(`/student/quizzes/${quizId}/assistance/level${level}`);
  };
  
  // Render loading state
  if (loading) {
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
  
  // Render error state
  if (error || !quiz) {
    return (
      <div className="container max-w-4xl py-8">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-6"
          onClick={() => router.back()}
        >
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
      progress: quizStatus.progress,
      nextStep: quizStatus.nextStep
    });
    
    // Ambil status bantuan dari berbagai sumber
    const assistanceRequired = 
      quizStatus.assistanceRequired || 
      quizStatus.progress?.assistanceRequired || 
      "NONE";
    
    // Jika kuis sudah lulus (finalStatus = passed)
    if (quizStatus.finalStatus === "passed") {
      return (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="ml-3">
              <AlertDescription className="text-green-700">
                <p className="font-medium">Selamat! Anda telah lulus kuis ini.</p>
                <p className="mt-1">Anda telah menyelesaikan kuis dengan sukses dan dapat melanjutkan ke materi berikutnya.</p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      );
    }
    
    // Jika kuis gagal setelah 4 kali percobaan (finalStatus = failed)
    if (quizStatus.finalStatus === "failed") {
      return (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <AlertDescription className="text-red-700">
                <p className="font-medium">Anda telah mencapai batas maksimum percobaan untuk kuis ini.</p>
                <p className="mt-1">Setelah 4 kali percobaan, Anda belum berhasil lulus kuis. Silakan hubungi pengajar Anda untuk panduan lebih lanjut.</p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      );
    }
    
    // Jika sedang dalam proses penilaian
    if (quizStatus.lastSubmission?.status === "PENDING") {
      return (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="ml-3">
              <AlertDescription className="text-amber-700">
                <p className="font-medium">Jawaban kuis Anda sedang menunggu penilaian.</p>
                <p className="mt-1">Harap tunggu guru Anda menilai jawaban Anda. Hasil penilaian akan menentukan langkah selanjutnya dalam alur pembelajaran.</p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      );
    }
    
    // Jika membutuhkan bantuan level 1
    if (assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL1) {
      return (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <BookOpen className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="ml-3">
              <AlertDescription className="text-blue-700">
                <p className="font-medium">Anda perlu menyelesaikan bantuan level 1 terlebih dahulu.</p>
                <p className="mt-1">Selesaikan kuis bantuan dasar untuk memahami konsep dengan lebih baik sebelum mencoba lagi.</p>
                <Button 
                  onClick={() => handleGoToAssistance(1)} 
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                >
                  Mulai Bantuan Level 1
                </Button>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      );
    }
    
    // Jika membutuhkan bantuan level 2
    if (assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL2) {
      const isLevel2Submitted = quizStatus.assistanceStatus?.level2?.submitted;
      const latestSubmission = quizStatus.assistanceStatus?.level2?.latestSubmission;
      const hasFailed = latestSubmission?.status === "FAILED";
      const feedback = latestSubmission?.feedback;
      
      return (
        <Alert className={`mb-6 ${hasFailed ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-start">
            <HelpCircle className={`h-5 w-5 ${hasFailed ? "text-red-500" : "text-amber-500"} mt-0.5`} />
            <div className="ml-3">
              <AlertDescription className={hasFailed ? "text-red-700" : "text-amber-700"}>
                <p className="font-medium">
                  {hasFailed 
                    ? "Anda perlu mengerjakan kembali bantuan level 2!" 
                    : isLevel2Submitted 
                      ? "Jawaban bantuan level 2 Anda sedang dinilai." 
                      : "Anda perlu menyelesaikan bantuan level 2 terlebih dahulu."}
                </p>
                
                <p className="mt-1">
                  {hasFailed
                    ? "Berdasarkan penilaian guru, jawaban Anda belum memenuhi kriteria. Silakan coba lagi."
                    : isLevel2Submitted
                      ? "Harap tunggu penilaian dari pengajar Anda sebelum dapat melanjutkan ke kuis utama."
                      : "Jawab pertanyaan essay untuk memperdalam pemahaman Anda sebelum mencoba kuis lagi."}
                </p>
                
                {hasFailed && feedback && (
                  <div className="mt-3 p-3 bg-white rounded border border-red-200 text-sm">
                    <p className="font-semibold mb-1">Feedback dari guru:</p>
                    <p className="whitespace-pre-wrap">{feedback}</p>
                  </div>
                )}
                
                {(hasFailed || !isLevel2Submitted) && (
                  <Button 
                    onClick={() => handleGoToAssistance(2)} 
                    className={`mt-3 ${hasFailed ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
                  >
                    {hasFailed ? "Kerjakan Kembali Bantuan Level 2" : "Mulai Bantuan Level 2"}
                  </Button>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      );
    }
    
    // Jika membutuhkan bantuan level 3
    if (assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL3) {
      return (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-start">
            <FileText className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="ml-3">
              <AlertDescription className="text-red-700">
                <p className="font-medium">Anda perlu mempelajari materi bantuan level 3 terlebih dahulu.</p>
                <p className="mt-1">Pelajari materi referensi ini untuk memahami konsep dengan lebih baik sebelum mencoba kuis lagi untuk kesempatan terakhir.</p>
                <Button 
                  onClick={() => handleGoToAssistance(3)} 
                  className="mt-2 bg-red-600 hover:bg-red-700"
                >
                  Lihat Materi Bantuan Level 3
                </Button>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      );
    }
    
    // Default status: menampilkan informasi tentang percobaan
    return (
      <div className="bg-muted/30 p-4 rounded-lg border mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h3 className="font-medium">Status Kuis</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Percobaan saat ini: {quizStatus.progress?.currentAttempt || quizStatus.currentAttempt || 0} dari {quizStatus.maxAttempts || 4}
            </p>
          </div>
          
          {quizStatus.lastSubmission && (
            <div className="flex items-center">
              {quizStatus.lastSubmission.status === "PASSED" ? (
                <span className="inline-flex items-center text-sm font-medium text-green-700 bg-green-50 rounded-full px-3 py-1">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Lulus
                </span>
              ) : quizStatus.lastSubmission.status === "FAILED" ? (
                <span className="inline-flex items-center text-sm font-medium text-red-700 bg-red-50 rounded-full px-3 py-1">
                  <XCircle className="h-4 w-4 mr-1" />
                  Gagal
                </span>
              ) : (
                <span className="inline-flex items-center text-sm font-medium text-amber-700 bg-amber-50 rounded-full px-3 py-1">
                  <Clock className="h-4 w-4 mr-1" />
                  Menunggu Penilaian
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Pesan bantuan berdasarkan level
  const getAssistanceMessage = () => {
    if (!quizStatus) return null;
    
    // Jika bantuan level 1 sudah dikerjakan tapi belum diaktifkan oleh guru
    if (quizStatus.assistanceRequired === "LEVEL1" && quizStatus.assistanceStatus?.level1?.submitted && !quizStatus.assistanceStatus?.level1?.completed) {
      return (
        <Alert className="mb-6 border-blue-200 bg-blue-50 text-blue-800">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle>Menunggu Persetujuan Guru</AlertTitle>
          <AlertDescription>
            Anda telah mengerjakan bantuan level 1. Silakan tunggu guru Anda memeriksa hasil dan mengaktifkan kuis utama untuk Anda.
          </AlertDescription>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => handleGoToAssistance(1)}
              className="bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              Lihat Hasil Bantuan Level 1
            </Button>
          </div>
        </Alert>
      );
    }
    
    if (quizStatus.assistanceRequired === "LEVEL1" && !quizStatus.assistanceStatus?.level1?.submitted) {
      return (
        <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800">
          <HelpCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Bantuan Level 1 Diperlukan</AlertTitle>
          <AlertDescription>
            Untuk mencoba kuis ini lagi, Anda perlu menyelesaikan latihan singkat untuk membantu pemahaman Anda.
          </AlertDescription>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => handleGoToAssistance(1)}
              className="bg-white text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              Akses Bantuan Level 1
            </Button>
          </div>
        </Alert>
      );
    }
    
    if (quizStatus.assistanceRequired === "LEVEL2") {
      const isSubmitted = quizStatus.completedLevel2;
      return (
        <Alert className="mb-6 border-orange-200 bg-orange-50 text-orange-800">
          <HelpCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle>Bantuan Level 2 Diperlukan</AlertTitle>
          <AlertDescription>
            {isSubmitted 
              ? "Jawaban bantuan Level 2 Anda sedang dinilai oleh pengajar. Harap tunggu penilaian sebelum mencoba kuis lagi."
              : "Setelah dua kali gagal, Anda perlu menyelesaikan latihan lanjutan untuk memperdalam pemahaman Anda."}
          </AlertDescription>
          {!isSubmitted && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => handleGoToAssistance(2)}
                className="bg-white text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                Akses Bantuan Level 2
              </Button>
            </div>
          )}
        </Alert>
      );
    }
    
    if (quizStatus.assistanceRequired === "LEVEL3") {
      return (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
          <HelpCircle className="h-4 w-4 text-red-600" />
          <AlertTitle>Bantuan Level 3 Diperlukan</AlertTitle>
          <AlertDescription>
            Setelah tiga kali gagal, Anda perlu mempelajari materi tambahan khusus yang telah disiapkan oleh pengajar.
            Ini adalah kesempatan terakhir Anda untuk memahami materi sebelum mencoba kuis lagi.
          </AlertDescription>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => handleGoToAssistance(3)}
              className="bg-white text-red-600 border-red-300 hover:bg-red-50"
            >
              Akses Bantuan Level 3
            </Button>
          </div>
        </Alert>
      );
    }
    
    return null;
  };
  
  // Render UI untuk kuis yang gagal setelah 4 kali percobaan
  const renderFailedQuiz = () => {
    return (
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-red-800">Kuis Tidak Berhasil Diselesaikan</CardTitle>
            <div className="bg-red-100 text-red-700 rounded-full p-2">
              <X className="h-5 w-5" />
            </div>
          </div>
          <CardDescription className="text-red-700">
            Anda telah mencapai batas maksimal 4 kali percobaan dan belum berhasil lulus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-red-700">
              Skor terakhir Anda: <span className="font-bold">{quizStatus?.lastScore || 0}%</span>
              (Skor minimum untuk lulus: {quiz?.passingScore || 70}%)
            </p>
            
            <Alert variant="destructive" className="bg-white border-red-300">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Anda telah mencapai batas maksimal percobaan. Silakan hubungi pengajar Anda untuk bimbingan lebih lanjut.
              </AlertDescription>
            </Alert>
            
            <div className="pt-2">
              <Button variant="outline" onClick={handleViewHistory}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Lihat Riwayat Percobaan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Render UI untuk kuis yang berhasil
  const renderPassedQuiz = () => {
    return (
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-800">Kuis Berhasil Diselesaikan</CardTitle>
            <div className="bg-green-100 text-green-700 rounded-full p-2">
              <Check className="h-5 w-5" />
            </div>
          </div>
          <CardDescription className="text-green-700">
            Selamat! Anda telah berhasil menyelesaikan kuis ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-green-700">
              Skor Anda: <span className="font-bold">{quizStatus?.lastScore || 0}%</span>
              (Skor minimum untuk lulus: {quiz?.passingScore || 70}%)
            </p>
            
            <div className="pt-2">
              <Button variant="outline" onClick={handleViewHistory}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Lihat Riwayat Percobaan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="container max-w-4xl py-8">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-6"
        onClick={() => router.push('/student/quizzes')}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Kembali ke Daftar Kuis
      </Button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
        <p className="text-muted-foreground">{quiz.description || 'Tidak ada deskripsi'}</p>
        {quiz.class && (
          <div className="flex items-center mt-2">
            <p className="text-sm text-muted-foreground">Kelas: {quiz.class.name}</p>
          </div>
        )}
      </div>
      
      {/* Tombol mulai kuis darurat untuk siswa baru */}
      {quizStatus && 
        (quizStatus.progress?.currentAttempt === 0 || !quizStatus.progress) && 
        !quizStatus.lastSubmission && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <BookOpen className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="ml-3 flex-1">
              <AlertTitle className="text-blue-800">Kuis Baru</AlertTitle>
              <AlertDescription className="text-blue-700">
                <p>Ini adalah kuis baru yang siap untuk dikerjakan.</p>
                <div className="mt-2 flex justify-end">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleStartQuiz}
                    disabled={startingQuiz}
                  >
                    {startingQuiz ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memulai...
                      </>
                    ) : (
                      <>
                        Mulai Kuis Sekarang
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
      
      {renderQuizStatus()}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informasi Kuis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="font-medium">Jumlah Pertanyaan:</p>
              <p>{quiz.questions?.length || 0} pertanyaan</p>
            </div>
            
            {quizStatus && (
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="font-medium">Status:</p>
                  <p>
                    {quizStatus.canTakeQuiz ? 
                      'Siap untuk dikerjakan' : 
                      quizStatus.lastAttemptPassed ? 
                        'Lulus' : 
                        quizStatus.lastSubmission?.status === 'PENDING' ?
                          'Menunggu penilaian guru' :
                          quizStatus.progress?.currentAttempt === 0 ?
                            'Siap untuk dikerjakan (kuis baru)' :
                            quizStatus.overrideSystemFlow && quizStatus.manuallyAssignedLevel === "NONE" ?
                              'Siap untuk dikerjakan (diaktifkan guru)' :
                              'Tidak dapat dikerjakan saat ini'
                    }
                  </p>
                </div>
                
                {(quizStatus.canTakeQuiz || 
                  quizStatus.currentAttempt === 0 || 
                  quizStatus.progress?.currentAttempt === 0 ||
                  !quizStatus.progress ||
                  (quizStatus.overrideSystemFlow && quizStatus.manuallyAssignedLevel === "NONE")) && 
                 (!quizStatus.lastSubmission || quizStatus.lastSubmission.status !== 'PENDING') ? (
                  <Button 
                    onClick={handleStartQuiz}
                    disabled={startingQuiz}
                  >
                    {startingQuiz ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memulai...
                      </>
                    ) : (
                      <>
                        Mulai Kuis
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : quizStatus.lastSubmission?.status === 'PENDING' ? (
                  <span className="inline-flex items-center text-sm font-medium text-amber-700 bg-amber-50 rounded-full px-3 py-1">
                    <Clock className="h-4 w-4 mr-1" />
                    Menunggu Penilaian
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Tambahkan komponen QuizSubmissionDetails di sini */}
      <div id="submission-details">
        <h2 className="text-2xl font-bold mb-4">Detail Pengerjaan</h2>
        <QuizSubmissionDetails quizId={quizId} />
      </div>
    </div>
  );
} 