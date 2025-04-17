"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, BookOpen, Clock, FileText, HelpCircle, XCircle, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Komponen untuk menampilkan detail submit jawaban kuis dan status kuis
 */
export default function QuizSubmissionDetails({ quizId }: { quizId: string }) {
  const [loading, setLoading] = useState(true);
  const [quizStatus, setQuizStatus] = useState<any>(null);
  const [lastSubmission, setLastSubmission] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
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
        
        // Jalankan kedua request secara paralel
        const [statusResult, submissionResult] = await Promise.all([
          getQuizStatus(),
          getLastSubmission().catch(() => null) // Tangkap error pada submisi
        ]);
        
        if (statusResult.success) {
          console.log("QuizSubmissionDetails: Status kuis diterima:", statusResult.data);
          setQuizStatus(statusResult.data);
        } else {
          console.error('Error dari server:', statusResult.message);
          setError(statusResult.message);
        }
        
        if (submissionResult && submissionResult.success) {
          console.log("QuizSubmissionDetails: Submisi terakhir diterima:", submissionResult.data);
          setLastSubmission(submissionResult.data);
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
  const handleGoToAssistance = (level: number) => {
    router.push(`/student/quizzes/${quizId}/assistance/level${level}`);
  };
  
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
    console.log("Debug assistanceRequired:", quizStatus.assistanceRequired);
    console.log("Debug assistanceRequired type:", typeof quizStatus.assistanceRequired);
    console.log("Debug progress:", quizStatus.progress);
    
    // Ambil status assistanceRequired dari berbagai sumber yang mungkin
    const assistanceRequired = 
      quizStatus.assistanceRequired || 
      quizStatus.progress?.assistanceRequired || 
      "NONE";
    
    console.log("Assistance required final:", assistanceRequired);
    
    // Pemeriksaan untuk bantuan level 1
    if (assistanceRequired === "ASSISTANCE_LEVEL1") {
      return (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader className="text-blue-800">
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Bantuan Level 1 Diperlukan
            </CardTitle>
            <CardDescription className="text-blue-700">
              Anda perlu menyelesaikan kuis bantuan level 1 untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-blue-800 mb-4">
              Selesaikan latihan bantuan level 1 untuk memahami konsep dasar. 
              Anda harus menjawab semua pertanyaan dengan benar untuk dapat melanjutkan ke kuis utama.
            </p>
            <Button 
              onClick={() => handleGoToAssistance(1)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Mulai Bantuan Level 1
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    // Pemeriksaan untuk bantuan level 2
    if (assistanceRequired === "ASSISTANCE_LEVEL2") {
      return (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="text-amber-800">
            <CardTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              Bantuan Level 2 Diperlukan
            </CardTitle>
            <CardDescription className="text-amber-700">
              Anda perlu menyelesaikan kuis bantuan level 2 untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 mb-4">
              Pada bantuan level 2, Anda akan menjawab pertanyaan essay. Jawaban Anda akan disimpan dan ditampilkan
              berurutan untuk membantu pemahaman yang lebih mendalam.
            </p>
            <Button 
              onClick={() => handleGoToAssistance(2)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Mulai Bantuan Level 2
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    // Pemeriksaan untuk bantuan level 3
    if (assistanceRequired === "ASSISTANCE_LEVEL3") {
      return (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader className="text-red-800">
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Bantuan Level 3 Diperlukan
            </CardTitle>
            <CardDescription className="text-red-700">
              Anda perlu mempelajari materi referensi untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-800 mb-4">
              Pada bantuan level 3, Anda perlu mempelajari materi referensi dalam bentuk PDF yang
              telah disiapkan oleh guru. Ini adalah kesempatan terakhir Anda untuk memahami konsep sebelum
              percobaan terakhir kuis.
            </p>
            <Button 
              onClick={() => handleGoToAssistance(3)}
              className="bg-red-600 hover:bg-red-700"
            >
              Lihat Materi Bantuan Level 3
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    return null;
  };
  
  // Render waiting for assessment status
  const renderWaitingForAssessment = () => {
    if (lastSubmission && lastSubmission.status === 'PENDING') {
      return (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="text-amber-800">
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Menunggu Penilaian
            </CardTitle>
            <CardDescription className="text-amber-700">
              Jawaban kuis Anda sedang menunggu penilaian dari guru
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 mb-4">
              Harap bersabar. Guru Anda akan menilai jawaban dan memberikan umpan balik. 
              Hasil penilaian akan menentukan apakah Anda perlu latihan tambahan atau dapat melanjutkan ke kuis berikutnya.
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6 my-6">
      {/* Tambahkan tombol bantuan darurat jika status menunjukkan belum lulus */}
      {quizStatus.currentAttempt > 0 && !quizStatus.lastAttemptPassed && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Bantuan Pembelajaran Tersedia</AlertTitle>
          <AlertDescription className="text-blue-700">
            Anda belum berhasil menjawab semua pertanyaan dengan benar. 
            Anda dapat mengakses bantuan untuk memahami materi lebih baik.
          </AlertDescription>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button 
              size="sm"
              onClick={() => handleGoToAssistance(1)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Akses Bantuan Level 1
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => handleGoToAssistance(2)}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              Akses Bantuan Level 2
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => handleGoToAssistance(3)}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              Akses Bantuan Level 3
            </Button>
          </div>
        </Alert>
      )}

      {/* Tambahkan tombol mulai kuis darurat untuk siswa baru */}
      {(!quizStatus.currentAttempt || quizStatus.currentAttempt === 0 || 
        (quizStatus.progress && quizStatus.progress.currentAttempt === 0)) && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <PencilRuler className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Mulai Kuis Baru</AlertTitle>
          <AlertDescription className="text-green-700">
            Anda belum pernah mengerjakan kuis ini. Klik tombol di bawah untuk memulai.
          </AlertDescription>
          <div className="flex justify-end mt-3">
            <Button 
              size="sm"
              onClick={() => router.push(`/student/quizzes/${quizId}/take`)}
              className="bg-green-600 hover:bg-green-700"
            >
              Mulai Mengerjakan Kuis
            </Button>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Status Kuis Anda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Percobaan saat ini:</p>
                <p>
                  {quizStatus.progress ? 
                    `${quizStatus.progress.currentAttempt || 0} dari ${quizStatus.progress.maxAttempts || 4}` : 
                    `${quizStatus.currentAttempt || 0} dari ${quizStatus.maxAttempts || 4}`
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Status terakhir:</p>
                <p>
                  {quizStatus.lastAttemptPassed ? (
                    <Badge className="bg-green-500">Lulus</Badge>
                  ) : lastSubmission?.status === 'PENDING' ? (
                    <Badge className="bg-amber-500">Menunggu Penilaian</Badge>
                  ) : quizStatus.currentAttempt > 0 ? (
                    <Badge variant="destructive">Belum Lulus</Badge>
                  ) : (
                    <Badge variant="outline">Belum dikerjakan</Badge>
                  )}
                </p>
              </div>
            </div>
            
            {/* Status Alur Pembelajaran */}
            <div className="mt-4 border-t pt-4">
              <h3 className="font-medium mb-2">Alur Pembelajaran Anda:</h3>
              <div className="flex flex-col space-y-2">
                <div className={`flex items-center ${quizStatus.currentAttempt >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                  <span className="inline-flex justify-center items-center w-6 h-6 rounded-full border mr-2 text-xs">1</span>
                  Mengerjakan Kuis Utama {quizStatus.currentAttempt >= 1 ? '✓' : ''}
                </div>
                
                {lastSubmission?.status === 'PENDING' && (
                  <div className="flex items-center text-amber-600">
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full bg-amber-100 border-amber-300 border mr-2 text-xs">→</span>
                    Menunggu Penilaian Guru
                  </div>
                )}
                
                {quizStatus.assistanceRequired === "ASSISTANCE_LEVEL1" && (
                  <div className="flex items-center text-blue-600">
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full bg-blue-100 border-blue-300 border mr-2 text-xs">→</span>
                    Mengerjakan Bantuan Level 1 {quizStatus.level1Completed ? '✓' : '(sedang berlangsung)'}
                  </div>
                )}
                
                {quizStatus.level1Completed && quizStatus.currentAttempt >= 2 && (
                  <div className={`flex items-center ${quizStatus.currentAttempt >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full border mr-2 text-xs">2</span>
                    Mengerjakan Kuis Utama (Percobaan 2) {quizStatus.currentAttempt >= 2 ? '✓' : ''}
                  </div>
                )}
                
                {quizStatus.assistanceRequired === "ASSISTANCE_LEVEL2" && (
                  <div className="flex items-center text-amber-600">
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full bg-amber-100 border-amber-300 border mr-2 text-xs">→</span>
                    Mengerjakan Bantuan Level 2 {quizStatus.level2Completed ? '✓' : '(sedang berlangsung)'}
                  </div>
                )}
                
                {quizStatus.level2Completed && quizStatus.currentAttempt >= 3 && (
                  <div className={`flex items-center ${quizStatus.currentAttempt >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full border mr-2 text-xs">3</span>
                    Mengerjakan Kuis Utama (Percobaan 3) {quizStatus.currentAttempt >= 3 ? '✓' : ''}
                  </div>
                )}
                
                {quizStatus.assistanceRequired === "ASSISTANCE_LEVEL3" && (
                  <div className="flex items-center text-red-600">
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full bg-red-100 border-red-300 border mr-2 text-xs">→</span>
                    Mempelajari Materi Level 3 {quizStatus.level3Completed ? '✓' : '(sedang berlangsung)'}
                  </div>
                )}
                
                {quizStatus.level3Completed && quizStatus.currentAttempt >= 4 && (
                  <div className={`flex items-center ${quizStatus.currentAttempt >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full border mr-2 text-xs">4</span>
                    Mengerjakan Kuis Utama (Percobaan 4) {quizStatus.currentAttempt >= 4 ? '✓' : ''}
                  </div>
                )}
                
                {quizStatus.currentAttempt >= 4 && !quizStatus.lastAttemptPassed && (
                  <div className="flex items-center text-red-600">
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full bg-red-100 border-red-300 border mr-2 text-xs">!</span>
                    Tidak lulus kuis setelah 4 percobaan
                  </div>
                )}
                
                {quizStatus.lastAttemptPassed && (
                  <div className="flex items-center text-green-600">
                    <span className="inline-flex justify-center items-center w-6 h-6 rounded-full bg-green-100 border-green-300 border mr-2 text-xs">✓</span>
                    Lulus kuis!
                  </div>
                )}
              </div>
            </div>
            
            {quizStatus.assistanceRequired !== 'NONE' && (
              <Alert className="mt-4 bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  Anda perlu menyelesaikan latihan tambahan sebelum melanjutkan.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
      
      {renderWaitingForAssessment()}
      {renderAssistanceStatus()}
      
      {lastSubmission && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Pengerjaan Terakhir</CardTitle>
            <CardDescription>
              Dikerjakan pada {new Date(lastSubmission.createdAt).toLocaleString('id-ID')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Skor:</p>
                <p className="text-2xl font-bold">
                  {lastSubmission.status === 'PENDING' ? (
                    'Menunggu Penilaian'
                  ) : lastSubmission.score ? (
                    Math.round(lastSubmission.score) + '%'
                  ) : (
                    '0%'
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Status:</p>
                <p>
                  {lastSubmission.status === 'PASSED' ? (
                    <Badge className="bg-green-500">Lulus</Badge>
                  ) : lastSubmission.status === 'PENDING' ? (
                    <Badge className="bg-amber-500">Menunggu Penilaian</Badge>
                  ) : (
                    <Badge variant="destructive">Belum Lulus</Badge>
                  )}
                </p>
              </div>
              
              {lastSubmission.feedback && (
                <div className="mt-4 border p-4 rounded-md bg-muted/30">
                  <p className="text-sm font-medium mb-1">Feedback dari Guru:</p>
                  <p>{lastSubmission.feedback}</p>
                </div>
              )}
              
              {lastSubmission && (
                <>
                  <Separator className="my-4" />
                  <p className="text-sm font-medium mb-4">Jawaban Anda:</p>
                  
                  <div className="space-y-6">
                    {(() => {
                      try {
                        // Parse jawaban jika berbentuk string
                        const parsedAnswers = typeof lastSubmission.answers === 'string' 
                          ? JSON.parse(lastSubmission.answers) 
                          : lastSubmission.answers;
                        
                        // Jika answers adalah array 
                        if (Array.isArray(parsedAnswers)) {
                          return parsedAnswers.map((answer, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">Pertanyaan {index + 1}</p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {answer.question?.text || "Pertanyaan tidak tersedia"}
                                  </p>
                                </div>
                                {answer.isCorrect === null ? (
                                  <Badge className="bg-amber-500">Menunggu Penilaian</Badge>
                                ) : answer.isCorrect ? (
                                  <Badge className="bg-green-500">Benar</Badge>
                                ) : (
                                  <Badge variant="destructive">Salah</Badge>
                                )}
                              </div>
                              
                              <Separator className="my-3" />
                              
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm font-medium">Jawaban Anda:</p>
                                  <p className="mt-1 p-2 bg-muted rounded-md">
                                    {answer.answerText}
                                  </p>
                                </div>
                                
                                {answer.isCorrect === null ? (
                                  <div>
                                    <p className="text-sm font-medium">Status:</p>
                                    <p className="mt-1 p-2 bg-amber-50 text-amber-700 rounded-md">
                                      Jawaban sedang menunggu penilaian dari guru
                                    </p>
                                  </div>
                                ) : !answer.isCorrect && answer.question?.correctAnswer && (
                                  <div>
                                    <p className="text-sm font-medium">Jawaban Benar:</p>
                                    <p className="mt-1 p-2 bg-green-50 text-green-700 border border-green-200 rounded-md">
                                      {answer.question.correctAnswer}
                                    </p>
                                  </div>
                                )}
                                
                                {answer.feedback && (
                                  <div>
                                    <p className="text-sm font-medium">Feedback:</p>
                                    <p className="mt-1 p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                                      {answer.feedback}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ));
                        } 
                        
                        // Format alternatif
                        return <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(parsedAnswers, null, 2)}
                        </pre>;
                        
                      } catch (err) {
                        console.error('Error parsing answers:', err, lastSubmission.answers);
                        return <p>Tidak dapat menampilkan jawaban</p>;
                      }
                    })()}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 