"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, AlertCircle, BookOpen, Clock, CheckCircle, 
  XCircle, User, ChevronLeft,  RotateCcw 
} from "lucide-react";
import { 
  getStudentDetails, 
  getStudentQuizSubmissions, 
  getStudentFailedQuizzes 
} from "@/lib/actions/student-actions";
import { resetStudentQuizAttempts } from "@/lib/actions/teacher-actions";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [failedQuizzes, setFailedQuizzes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  
  // Muat data siswa
  useEffect(() => {
    async function loadStudentData() {
      try {
        // Dapatkan data siswa
        const studentResult = await getStudentDetails(studentId);
        
        if (!studentResult.success) {
          setError(studentResult.message || "Gagal memuat data siswa");
          setLoading(false);
          return;
        }
        
        setStudent(studentResult.data);
        
        // Dapatkan submisi kuis siswa
        const submissionsResult = await getStudentQuizSubmissions(studentId);
        
        if (submissionsResult.success) {
          setSubmissions(submissionsResult.data || []);
        }
        
        // Dapatkan kuis yang gagal
        const failedResult = await getStudentFailedQuizzes(studentId);
        
        if (failedResult.success) {
          setFailedQuizzes(failedResult.data || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data");
        setLoading(false);
      }
    }
    
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);
  
  // Fungsi untuk mereset percobaan kuis
  const handleResetQuizAttempts = async (quizId: string) => {
    try {
      setResetting(quizId);
      
      const result = await resetStudentQuizAttempts(studentId, quizId);
      
      if (result.success) {
        toast.success("Percobaan kuis siswa berhasil direset");
        
        // Refresh data
        const failedResult = await getStudentFailedQuizzes(studentId);
        if (failedResult.success) {
          setFailedQuizzes(failedResult.data || []);
        }
      } else {
        toast.error(result.message || "Gagal mereset percobaan kuis");
      }
      
      setResetting(null);
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat mereset percobaan kuis");
      setResetting(null);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat data siswa...</p>
      </div>
    );
  }
  
  // Render error state
  if (error || !student) {
    return (
      <div className="container py-8">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-6"
          onClick={() => router.push("/teacher/students")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Siswa
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Siswa tidak ditemukan"}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-6"
        onClick={() => router.push("/teacher/students")}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Kembali ke Daftar Siswa
      </Button>
      
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-1/3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>{student.name}</CardTitle>
                  <CardDescription>{student.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kelas</p>
                  <p className="font-medium">{student.classes.length} kelas</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Kuis Diselesaikan</p>
                  <p className="font-medium">{student.completedQuizzes} kuis</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Rata-rata Skor</p>
                  <p className="font-medium">{student.averageScore}%</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Bergabung Sejak</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(student.joinedAt), { addSuffix: true, locale: id })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="kuis-gagal">
            <TabsList className="mb-4">
              <TabsTrigger value="kuis-gagal">
                <XCircle className="h-4 w-4 mr-2" />
                Kuis yang Gagal
              </TabsTrigger>
              <TabsTrigger value="riwayat-kuis">
                <BookOpen className="h-4 w-4 mr-2" />
                Riwayat Kuis
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="kuis-gagal">
              <Card>
                <CardHeader>
                  <CardTitle>Kuis yang Gagal Setelah 4 Percobaan</CardTitle>
                  <CardDescription>
                    Daftar kuis yang siswa gagal setelah 4 kali percobaan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {failedQuizzes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="bg-green-50 rounded-full p-3 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">Tidak Ada Kuis yang Gagal</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        Siswa ini belum gagal di kuis manapun setelah 4 kali percobaan.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {failedQuizzes.map((quiz) => (
                        <div key={quiz.quizId} className="border rounded-lg overflow-hidden">
                          <div className="p-4 bg-red-50 border-red-200 flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">{quiz.quizTitle}</h3>
                              <p className="text-sm text-muted-foreground">{quiz.className}</p>
                            </div>
                            <div className="flex items-center bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              <span>Gagal Setelah 4 Percobaan</span>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Skor Terakhir</p>
                                <p className="font-medium">{quiz.lastScore}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Percobaan Terakhir</p>
                                <p className="font-medium">
                                  {formatDistanceToNow(new Date(quiz.lastAttemptDate), { addSuffix: true, locale: id })}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={resetting === quiz.quizId}
                                onClick={() => handleResetQuizAttempts(quiz.quizId)}
                              >
                                {resetting === quiz.quizId ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    Mereset...
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                    Reset Percobaan
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/teacher/quizzes/${quiz.quizId}`)}
                              >
                                Detail Kuis
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="riwayat-kuis">
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Submisi Kuis</CardTitle>
                  <CardDescription>
                    Daftar semua submisi kuis yang dikerjakan oleh siswa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="bg-amber-50 rounded-full p-3 mb-4">
                        <Clock className="h-6 w-6 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">Belum Ada Submisi</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        Siswa ini belum mengerjakan kuis apapun.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="border rounded-lg overflow-hidden">
                          <div className={`p-4 flex justify-between items-center ${
                            submission.passed 
                              ? "bg-green-50 border-green-200" 
                              : "bg-red-50 border-red-200"
                          }`}>
                            <div>
                              <h3 className="font-medium">{submission.quizTitle}</h3>
                              <p className="text-sm text-muted-foreground">{submission.className}</p>
                            </div>
                            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              submission.passed 
                                ? "bg-green-100 text-green-700" 
                                : "bg-red-100 text-red-700"
                            }`}>
                              {submission.passed ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  <span>Lulus</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  <span>Gagal</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Skor</p>
                                <p className="font-medium">{submission.score}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Percobaan ke-</p>
                                <p className="font-medium">{submission.attemptNumber}/4</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Tanggal Submisi</p>
                                <p className="font-medium">
                                  {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true, locale: id })}
                                </p>
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/teacher/quizzes/${submission.quizId}/submissions/${submission.id}`)}
                            >
                              Lihat Detail Submisi
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 