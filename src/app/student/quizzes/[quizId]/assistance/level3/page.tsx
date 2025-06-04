"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getAssistanceLevel3 } from "@/lib/actions/assistance-actions";
import { getStudentQuizStatus } from "@/lib/actions/quiz-progress-actions";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, FileText } from "lucide-react";

// --- Interface Definitions ---
interface AssistanceLevel3ApiData {
  id: string;
  title: string;
  description?: string | null;
  pdfUrl?: string | null;
  // tambahkan properti lain jika ada dari getAssistanceLevel3
}

interface AssistanceLevelStatusForL3 {
  available: boolean;
  completed: boolean;
  assistanceId?: string | null;
  // latestSubmission tidak relevan untuk level 3 jika hanya PDF
}

interface QuizStatusForLevel3 {
  assistanceStatus: {
    level1: AssistanceLevelStatusForL3; // Asumsi struktur serupa
    level2: AssistanceLevelStatusForL3; // Asumsi struktur serupa
    level3: AssistanceLevelStatusForL3;
  };
  // Tambahkan properti lain dari getStudentQuizStatus
}

export default function AssistanceLevel3Page() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [loading, setLoading] = useState(true);
  const [assistance, setAssistance] = useState<AssistanceLevel3ApiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quizStatus, setQuizStatus] = useState<QuizStatusForLevel3 | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const statusResult = await getStudentQuizStatus(quizId, "");
        if (!statusResult.success || !statusResult.data) {
          setError(statusResult.message || "Gagal memuat status kuis");
          setLoading(false);
          return;
        }
        const currentQuizStatus = statusResult.data as QuizStatusForLevel3;
        setQuizStatus(currentQuizStatus);

        if (!currentQuizStatus.assistanceStatus.level3.available) {
          setError("Bantuan level 3 tidak tersedia untuk kuis ini.");
          setLoading(false);
          return;
        }

        if (currentQuizStatus.assistanceStatus.level3.completed) {
          setIsCompleted(true);
          // Jika sudah selesai, mungkin tidak perlu fetch data assistance lagi
          // kecuali jika ingin menampilkan judul/deskripsi
          if (currentQuizStatus.assistanceStatus.level3.assistanceId) {
            const assistanceResult = await getAssistanceLevel3(quizId, true);
            if (assistanceResult.success && assistanceResult.data) {
              setAssistance(assistanceResult.data as AssistanceLevel3ApiData);
            }
          }
          setLoading(false);
          return;
        }

        // Di level 3, kita gunakan quizId langsung daripada bergantung pada assistanceId 
        // dari status kuis, mirip dengan yang kita lakukan di level 1 dan 2
        // Parameter true untuk skipValidation agar bisa mengakses meskipun belum memenuhi syarat
        const assistanceResult = await getAssistanceLevel3(quizId, true);
        if (!assistanceResult.success || !assistanceResult.data) {
          setError(assistanceResult.message || "Gagal memuat data bantuan level 3.");
          setLoading(false);
          return;
        }
        setAssistance(assistanceResult.data as AssistanceLevel3ApiData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data.");
        setLoading(false);
      }
    }
    loadData();
  }, [quizId]);

  const completeAssistanceLevel3AndContinue = async () => {
    if (!assistance || !assistance.id) {
      toast.error("Data bantuan tidak ditemukan.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/student/submit-quiz', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId,
          completedAssistanceLevel: 3 // Level 3
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || "Bantuan level 3 selesai!");
        setIsCompleted(true);
        
        setTimeout(() => {
          if (result.data?.nextAction === "take_main_quiz") {
            router.push(`/student/quizzes/${quizId}/take`);
          } else {
            router.push(`/student/quizzes/${quizId}`);
          }
        }, 1500);
      } else {
        toast.error(result.message || "Gagal menyelesaikan bantuan");
      }
    } catch (err) {
      console.error("Error saat menyelesaikan bantuan:", err);
      toast.error("Terjadi kesalahan saat menyelesaikan bantuan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/student/quizzes/${quizId}`);
  };

  if (loading && !assistance) { // Tampilkan loading hanya jika assistance belum ada
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat bantuan level 3...</p>
      </div>
    );
  }

  if (error && !assistance) {
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={handleBack}>Kembali ke Kuis</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted || quizStatus?.assistanceStatus.level3.completed) {
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{assistance?.title || "Bantuan Level 3"}</CardTitle>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardDescription>
              {assistance?.description || "Anda telah mempelajari materi bantuan level 3."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Anda telah menyelesaikan bantuan level 3. Anda dapat kembali ke halaman kuis untuk melanjutkan.
              </AlertDescription>
            </Alert>
            {assistance?.pdfUrl && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">Anda dapat meninjau kembali materi PDF:</p>
                <Button asChild variant="outline">
                  <a href={assistance.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" /> Buka PDF Materi
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handleBack} variant="outline">
              Kembali ke Detail Kuis
            </Button>
            <Button 
              onClick={() => router.push(`/student/quizzes/${quizId}/take`)}
            >
              Lanjut ke Kuis Utama
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!assistance || !assistance.pdfUrl) {
    return (
      <div className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{assistance?.title || "Bantuan Level 3"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {assistance?.description || "Materi PDF untuk bantuan level 3 tidak ditemukan atau belum tersedia."}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={handleBack}>Kembali ke Kuis</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{assistance.title}</CardTitle>
          <CardDescription>
            {assistance.description || "Pelajari materi PDF berikut untuk melanjutkan."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border rounded-lg bg-secondary/30">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Materi Pembelajaran (PDF)
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Silakan buka dan pelajari materi PDF yang telah disediakan. Setelah Anda merasa paham,
              tandai bahwa Anda telah menyelesaikan bantuan level 3 ini.
            </p>
            <Button asChild>
              <a href={assistance.pdfUrl} target="_blank" rel="noopener noreferrer">
                Buka PDF Materi
              </a>
            </Button>
          </div>

          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-3">
              Jika Anda sudah mempelajari materi PDF dan merasa siap, klik tombol di bawah ini.
            </p>
            <Button onClick={completeAssistanceLevel3AndContinue} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Tandai Sudah Selesai & Lanjut ke Kuis Utama"
              )}
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
           <Button variant="outline" onClick={handleBack} disabled={loading}>
            Batal dan Kembali ke Kuis
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 