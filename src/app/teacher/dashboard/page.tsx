"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { getTeacherDashboardStats, getAllFailedStudents } from "@/lib/actions/teacher-dashboard-actions";
import { Loader2, AlertCircle, BookOpen, Users, School, X, BarChart, Clock, CheckCircle, XCircle } from "lucide-react";

export default function TeacherDashboardPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [allFailedStudents, setAllFailedStudents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Muat data dashboard
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        // Dapatkan statistik dashboard
        const statsResult = await getTeacherDashboardStats();
        
        if (!statsResult.success) {
          setError(statsResult.message || "Gagal memuat statistik dashboard");
          setLoading(false);
          return;
        }
        
        setStats(statsResult.data);
        
        // Dapatkan semua siswa yang tidak lulus
        const failedResult = await getAllFailedStudents();
        
        if (failedResult.success) {
          setAllFailedStudents(failedResult.data || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data");
        setLoading(false);
      }
    }
    
    loadDashboard();
  }, []);
  
  // Fungsi untuk menentukan status siswa
  const getStudentStatus = (student: any) => {
    if (student.currentAttempt >= 4 && !student.lastAttemptPassed) {
      return {
        type: "critical",
        label: "Kritis - 4x Gagal",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: XCircle
      };
    } else if (student.finalStatus === "FAILED") {
      return {
        type: "failed",
        label: "Gagal Final",
        color: "bg-red-100 text-red-700 border-red-200",
        icon: XCircle
      };
    } else if (!student.lastAttemptPassed && student.currentAttempt > 0) {
      return {
        type: "struggling",
        label: `Kesulitan - ${student.currentAttempt}x Percobaan`,
        color: "bg-orange-100 text-orange-700 border-orange-200",
        icon: Clock
      };
    } else {
      return {
        type: "pending",
        label: "Perlu Evaluasi",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: AlertCircle
      };
    }
  };

  // Kelompokkan siswa berdasarkan status
  const groupedStudents = {
    critical: allFailedStudents.filter(s => s.currentAttempt >= 4 && !s.lastAttemptPassed),
    struggling: allFailedStudents.filter(s => !s.lastAttemptPassed && s.currentAttempt > 0 && s.currentAttempt < 4),
    failed: allFailedStudents.filter(s => s.finalStatus === "FAILED"),
    other: allFailedStudents.filter(s => 
      !(s.currentAttempt >= 4 && !s.lastAttemptPassed) && 
      s.finalStatus !== "FAILED" && 
      !(s.currentAttempt > 0 && s.currentAttempt < 4)
    )
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Pengajar</h1>
          <p className="text-muted-foreground">Pantau kelas, kuis, dan perkembangan siswa</p>
        </div>
        
        {/* <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push("/teacher/classes/new")}>
            <School className="h-4 w-4 mr-2" />
            Buat Kelas
          </Button>
          <Button onClick={() => router.push("/teacher/quizzes/new")}>
            <BookOpen className="h-4 w-4 mr-2" />
            Buat Kuis
          </Button>
        </div> */}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kelas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClasses || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeClasses || 0} kelas aktif
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kuis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQuizzes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingSubmissions || 0} submisi menunggu penilaian
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeStudents || 0} siswa aktif minggu ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tidak Lulus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{allFailedStudents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {groupedStudents.critical.length} butuh bantuan kritis
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="siswa-tidak-lulus" className="mb-8">
        <TabsList>
          <TabsTrigger value="siswa-tidak-lulus">
            <XCircle className="h-4 w-4 mr-2" />
            Siswa Tidak Lulus ({allFailedStudents.length})
          </TabsTrigger>
          <TabsTrigger value="overview">
            <BarChart className="h-4 w-4 mr-2" />
            Ringkasan
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="siswa-tidak-lulus" className="mt-4">
          <div className="space-y-6">
            {/* Siswa Kritis */}
            {groupedStudents.critical.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <XCircle className="h-5 w-5 mr-2" />
                    Siswa Kritis - Butuh Bantuan Segera ({groupedStudents.critical.length})
                  </CardTitle>
                  <CardDescription>
                    Siswa yang telah gagal 4 kali dan memerlukan interventi langsung
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {groupedStudents.critical.map((student) => {
                      const status = getStudentStatus(student);
                      const StatusIcon = status.icon;
                      
                      return (
                        <div key={`${student.studentId}-${student.quizId}`} className="border rounded-lg overflow-hidden border-red-200">
                          <div className="p-4 bg-red-50 flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">{student.studentName}</h3>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className="h-3.5 w-3.5 mr-1" />
                              <span>{status.label}</span>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Kuis</p>
                                <p className="font-medium">{student.quizTitle}</p>
                                <p className="text-xs text-muted-foreground">{student.className}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="font-medium">Percobaan: {student.currentAttempt}/4</p>
                                <p className="text-xs text-muted-foreground">Skor Terakhir: {student.lastScore}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Bantuan</p>
                                <div className="flex gap-1 mt-1">
                                  <span className={`text-xs px-2 py-1 rounded ${student.level1Completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    L1 {student.level1Completed ? '✓' : '✗'}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${student.level2Completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    L2 {student.level2Completed ? '✓' : '✗'}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${student.level3Completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    L3 {student.level3Completed ? '✓' : '✗'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/students/${student.studentId}`)}>
                                Lihat Profil
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/quizzes/${student.quizId}/students/${student.studentId}`)}>
                                Detail Submission
                              </Button>
                              <Button size="sm" onClick={() => router.push(`/teacher/quizzes/${student.quizId}`)}>
                                Atur Bantuan
                              </Button>
                            </div> */}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Siswa Kesulitan */}
            {groupedStudents.struggling.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-600">
                    <Clock className="h-5 w-5 mr-2" />
                    Siswa Kesulitan - Perlu Perhatian ({groupedStudents.struggling.length})
                  </CardTitle>
                  <CardDescription>
                    Siswa yang mengalami kesulitan namun masih memiliki kesempatan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedStudents.struggling.map((student) => {
                      const status = getStudentStatus(student);
                      const StatusIcon = status.icon;
                      
                      return (
                        <div key={`${student.studentId}-${student.quizId}`} className="border rounded-lg p-4 border-orange-200">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-medium">{student.studentName}</h3>
                              <p className="text-sm text-muted-foreground">{student.quizTitle}</p>
                            </div>
                            <div className={`flex items-center px-2 py-1 rounded text-xs ${status.color}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              <span>{student.currentAttempt}x</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Skor Terakhir:</span>
                              <span className="font-medium">{student.lastScore}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Bantuan:</span>
                              <div className="flex gap-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${student.level1Completed ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                  L1{student.level1Completed ? '✓' : ''}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${student.level2Completed ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                  L2{student.level2Completed ? '✓' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/teacher/students/${student.studentId}`)}>
                              Profil
                            </Button>
                            <Button size="sm" className="flex-1" onClick={() => router.push(`/teacher/quizzes/${student.quizId}`)}>
                              Bantuan
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ringkasan jika tidak ada siswa yang tidak lulus */}
            {allFailedStudents.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Siswa yang Tidak Lulus</CardTitle>
                  <CardDescription>
                    Daftar semua siswa yang mengalami kesulitan atau belum lulus kuis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="bg-green-50 rounded-full p-3 mb-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">Semua Siswa Berkembang dengan Baik</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      Saat ini tidak ada siswa yang mengalami kesulitan significant. Semua siswa berhasil dalam kuis atau masih dalam proses belajar yang normal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Aktivitas</CardTitle>
              <CardDescription>
                Statistik dan tren aktivitas terbaru di kelas Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Kelas Terpopuler</h3>
                  <div className="space-y-3">
                    {stats?.popularClasses?.map((classItem: any) => (
                      <div key={classItem.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center">
                          <School className="h-5 w-5 text-primary mr-2" />
                          <span>{classItem.name}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{classItem.studentCount} siswa</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Kuis Terbaru</h3>
                  <div className="space-y-3">
                    {stats?.recentQuizzes?.map((quiz: any) => (
                      <div key={quiz.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <div className="font-medium">{quiz.title}</div>
                          <div className="text-sm text-muted-foreground">{quiz.className}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => router.push(`/teacher/quizzes/${quiz.id}`)}
                        >
                          Detail
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 