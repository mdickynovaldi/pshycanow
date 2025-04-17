"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { getTeacherDashboardStats, getFailedStudents } from "@/lib/actions/teacher-dashboard-actions";
import { Loader2, AlertCircle, BookOpen, Users, PlusCircle, School, X, BarChart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function TeacherDashboardPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [failedStudents, setFailedStudents] = useState<any[]>([]);
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
        
        // Dapatkan siswa yang gagal
        const failedResult = await getFailedStudents();
        
        if (failedResult.success) {
          setFailedStudents(failedResult.data || []);
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
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push("/teacher/classes/new")}>
            <School className="h-4 w-4 mr-2" />
            Buat Kelas
          </Button>
          <Button onClick={() => router.push("/teacher/quizzes/new")}>
            <BookOpen className="h-4 w-4 mr-2" />
            Buat Kuis
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      </div>
      
      <Tabs defaultValue="siswa-gagal" className="mb-8">
        <TabsList>
          <TabsTrigger value="siswa-gagal">
            <X className="h-4 w-4 mr-2" />
            Siswa yang Perlu Bantuan
          </TabsTrigger>
          <TabsTrigger value="overview">
            <BarChart className="h-4 w-4 mr-2" />
            Ringkasan
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="siswa-gagal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Siswa yang Memerlukan Bantuan Khusus</CardTitle>
              <CardDescription>
                Daftar siswa yang telah gagal menyelesaikan kuis setelah 4 kali percobaan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failedStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="bg-green-50 rounded-full p-3 mb-4">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">Semua Siswa Berkembang dengan Baik</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Saat ini tidak ada siswa yang memerlukan bantuan khusus. Semua siswa berhasil dalam kuis atau masih dalam proses belajar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {failedStudents.map((student) => (
                    <div key={`${student.studentId}-${student.quizId}`} className="border rounded-lg overflow-hidden">
                      <div className="p-4 bg-red-50 border-red-200 flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{student.studentName}</h3>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                        <div className="flex items-center bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                          <X className="h-3.5 w-3.5 mr-1" />
                          <span>Gagal Setelah 4 Percobaan</span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Kuis</p>
                            <p className="font-medium">{student.quizTitle}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Kelas</p>
                            <p className="font-medium">{student.className}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Percobaan Terakhir</p>
                            <p className="font-medium">{formatDistanceToNow(new Date(student.lastAttemptDate), { addSuffix: true, locale: id })}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Skor Terakhir</p>
                            <p className="font-medium">{student.lastScore}%</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/students/${student.studentId}`)}>
                            Lihat Profil Siswa
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/quizzes/${student.quizId}`)}>
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