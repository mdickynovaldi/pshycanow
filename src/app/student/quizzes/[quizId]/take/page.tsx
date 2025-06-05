"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getQuizById } from "@/lib/actions/quiz-actions";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { toast } from "sonner";

// Interface definitions
interface Question {
  id: string;
  text: string;
  imageUrl?: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  questions: Question[];
}

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Muat data kuis
  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true);
        const result = await getQuizById(quizId);
        
        if (result.success && result.data) {
          console.log("Loaded quiz:", result.data);
          setQuiz(result.data as Quiz);
          
          // Initialize answers
          const initialAnswers: Record<string, string> = {};
          (result.data as Quiz).questions.forEach((q: Question) => {
            initialAnswers[q.id] = "";
          });
          setAnswers(initialAnswers);
        } else {
          setError(result.message || "Gagal memuat kuis");
        }
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat kuis");
      } finally {
        setLoading(false);
      }
    }
    
    loadQuiz();
  }, [quizId]);
  
  const goBack = () => {
    router.back();
  };
  
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  const submitQuiz = async () => {
    try {
      setSubmitting(true);
      
      // Validate that all questions have answers
      const unansweredQuestions = Object.entries(answers).filter(([ value]) => !value.trim());
      if (unansweredQuestions.length > 0) {
        toast.error("Harap jawab semua pertanyaan sebelum mengirim");
        setSubmitting(false);
        return;
      }
      
      console.log("Mengirim jawaban kuis...");
      
      // Persiapkan data untuk dikirim
      const formDataToSend = {
        quizId: quizId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer
        }))
      };
      
      console.log("Data request:", JSON.stringify(formDataToSend));
      
      // Gunakan endpoint API yang telah dimodifikasi
      const response = await fetch('/api/student/submit-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataToSend),
      });
      
      console.log("Status respons:", response.status);
      
      const result = await response.json();
      
      console.log("Data respons:", JSON.stringify(result));
      
      if (result.success) {
        toast.success(result.message || "Jawaban berhasil dikirim!");
        
        // Tunggu sebentar untuk memberi waktu pada database diupdate
        setTimeout(() => {
          // Cek arah navigasi selanjutnya berdasarkan respons API
          if (result.data?.nextAction) {
            const nextAction = result.data.nextAction;
            
            // Berdasarkan nextAction dari API, arahkan siswa ke halaman yang sesuai
            if (nextAction === "assistance_level_1") {
              router.push(`/student/quizzes/${quizId}/assistance/level1`);
            } else if (nextAction === "assistance_level_2") {
              router.push(`/student/quizzes/${quizId}/assistance/level2`);
            } else if (nextAction === "assistance_level_3") {
              router.push(`/student/quizzes/${quizId}/assistance/level3`);
            } else {
              // Default ke halaman detail kuis (passed atau max attempts)
              router.push(`/student/quizzes/${quizId}?refreshStatus=true`);
            }
          } else {
            // Fallback jika nextAction tidak disediakan
            router.push(`/student/quizzes/${quizId}?refreshStatus=true`);
          }
        }, 1500);
      } else {
        toast.error(result.message || "Gagal mengirim jawaban");
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Error saat mengirim jawaban:", err);
      toast.error("Terjadi kesalahan saat mengirim jawaban. Silakan coba lagi.");
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4">Memuat pertanyaan kuis...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-6"
          onClick={goBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="container max-w-4xl py-8">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-6"
          onClick={goBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Kuis ini tidak memiliki pertanyaan. Silakan hubungi guru Anda.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-8">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-6"
        onClick={goBack}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Batal Mengerjakan Kuis
      </Button>
      
      <h1 className="text-3xl font-bold mb-8">Kuis: {quiz.title}</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Petunjuk Pengerjaan</CardTitle>
          <CardDescription>
            Jawablah pertanyaan-pertanyaan berikut dengan benar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>{quiz.description || "Jawab semua pertanyaan dengan jawaban yang sesuai."}</p>
          <p className="mt-2">Jumlah pertanyaan: {quiz.questions.length}</p>
        </CardContent>
      </Card>
      
      {quiz.questions.map((question: Question, index: number) => (
        <Card key={question.id} className="mb-8">
          <CardHeader>
            <CardTitle>Pertanyaan {index + 1} dari {quiz.questions.length}</CardTitle>
            <CardDescription>
              {question.text}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {question.imageUrl && (
              <div className="mb-4">
                <Image 
                  src={question.imageUrl} 
                  alt={`Gambar untuk pertanyaan ${index + 1}`}
                  width={600}
                  height={400}
                  className="rounded-md object-contain h-auto max-h-80 w-auto mx-auto"
                />
              </div>
            )}
            <Textarea
              placeholder="Ketik jawaban Anda di sini..."
              rows={5}
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className="w-full"
            />
          </CardContent>
        </Card>
      ))}
      
      <div className="flex justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={goBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        
        <Button 
          onClick={submitQuiz}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            "Selesaikan Kuis"
          )}
        </Button>
      </div>
    </div>
  );
}
