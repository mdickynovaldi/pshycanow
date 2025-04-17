"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, ChevronLeft, Info, ArrowRight, FileText, CheckCircle, Download } from "lucide-react";
import { getAssistanceLevel3, completeAssistanceLevel3 } from "@/lib/actions/assistance-actions";
import { cn } from "@/lib/utils";

export default function AssistanceLevel3Page() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assistance, setAssistance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Dapatkan bantuan level 3
        const result = await getAssistanceLevel3(quizId);
        
        if (!result.success) {
          setError(result.message || "Gagal memuat materi bantuan");
          setLoading(false);
          return;
        }
        
        setAssistance(result.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data");
        setLoading(false);
      }
    }
    
    loadData();
  }, [quizId]);
  
  // Handle kembali ke halaman kuis
  const handleBack = () => {
    router.push(`/student/quizzes/${quizId}`);
  };
  
  // Handle konfirmasi selesai membaca
  const handleConfirmation = () => {
    setIsConfirmed(true);
  };
  
  // Handle submit penyelesaian
  const handleComplete = async () => {
    if (!isConfirmed) {
      return;
    }
    
    setSubmitting(true);
    setFormError(null);
    
    try {
      // Kirim konfirmasi penyelesaian
      const result = await completeAssistanceLevel3(quizId);
      
      if (!result.success) {
        setFormError(result.message || "Gagal mengirim konfirmasi");
        setSubmitting(false);
        return;
      }
      
      // Redirect ke halaman kuis
      router.push(`/student/quizzes/${quizId}?refreshStatus=true`);
    } catch (err) {
      console.error(err);
      setFormError("Terjadi kesalahan saat mengirim konfirmasi");
      setSubmitting(false);
    }
  };
  
  // Handle download PDF
  const handleDownload = () => {
    if (assistance?.pdfUrl) {
      window.open(assistance.pdfUrl, '_blank');
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat materi bantuan...</p>
      </div>
    );
  }
  
  // Render error state
  if (error || !assistance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-destructive font-medium">{error || "Materi bantuan tidak ditemukan"}</p>
        <Button onClick={handleBack} className="mt-4">
          Kembali ke Kuis
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container py-8 max-w-3xl">
      <Button variant="outline" onClick={handleBack} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Kembali ke Kuis
      </Button>
      
      <Card>
        <CardHeader>
          <div className="flex items-start gap-2">
            <div className="bg-green-50 text-green-700 p-2 rounded-full">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Bantuan Level 3</CardTitle>
              <CardDescription className="mt-1">
                Pelajari materi referensi ini untuk memahami konsep lebih dalam.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">
              Guru Anda telah memberikan akses ke materi bantuan level 3 ini untuk membantu pemahaman Anda.
              Unduh dan baca materi dengan teliti, kemudian klik tombol "Saya Sudah Membaca" untuk melanjutkan.
            </p>
          </div>
          
          <div className="border rounded-lg p-6 mt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">{assistance.title}</h3>
                <p className="text-muted-foreground">{assistance.description}</p>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <Button onClick={handleDownload} className="w-full" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Unduh Materi PDF
              </Button>
            </div>
          </div>
          
          <div className="mt-8">
            <Button
              onClick={handleConfirmation}
              variant={isConfirmed ? "default" : "outline"}
              className="w-full"
              disabled={isConfirmed}
            >
              {isConfirmed ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Sudah Dibaca
                </>
              ) : (
                "Saya Sudah Membaca Materi"
              )}
            </Button>
          </div>
          
          {formError && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleComplete}
            disabled={submitting || !isConfirmed}
            className="min-w-[120px]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Lanjutkan
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 