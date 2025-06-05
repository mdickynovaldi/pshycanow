"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { getPendingLevel2Submissions } from "@/lib/actions/assistance-actions";
import { Loader2, AlertCircle, CheckCircle, User, Calendar, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

// Interface definitions
interface Submission {
  id: string;
  createdAt: string | Date;
  student: {
    name: string | null;
  };
  assistance: {
    title: string;
    quiz: {
      title: string;
    };
  };
}

export default function TeacherAssistancesPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Muat daftar submisi yang menunggu penilaian
  useEffect(() => {
    async function loadSubmissions() {
      setLoading(true);
      try {
        const result = await getPendingLevel2Submissions();
        
        if (!result.success) {
          setError(result.message || "Gagal memuat daftar submisi");
          setLoading(false);
          return;
        }
        
        setSubmissions((result.data || []) as Submission[]);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data");
        setLoading(false);
      }
    }
    
    loadSubmissions();
  }, []);
  
  // Handle lihat detil submisi
  const handleViewSubmission = (submissionId: string) => {
    router.push(`/teacher/assistances/${submissionId}`);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat daftar submisi...</p>
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
  
  // Render empty state
  if (submissions.length === 0) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Bantuan Siswa</CardTitle>
            <CardDescription>
              Daftar submisi bantuan level 2 yang perlu dinilai
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium mb-2">Tidak Ada Submisi</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Tidak ada submisi bantuan level 2 yang perlu dinilai saat ini.
              Submisi baru akan muncul di sini saat siswa mengirimkan jawaban mereka.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render list of submissions
  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Bantuan Siswa</CardTitle>
          <CardDescription>
            Daftar submisi bantuan level 2 yang perlu dinilai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-background flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{submission.assistance.quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">{submission.assistance.title}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleViewSubmission(submission.id)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Separator />
                <div className="p-4">
                  <div className="flex space-x-4 mb-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="h-4 w-4 mr-1" />
                      <span>{submission.student.name}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true, locale: id })}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <Button onClick={() => handleViewSubmission(submission.id)}>
                      Nilai Submisi
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 