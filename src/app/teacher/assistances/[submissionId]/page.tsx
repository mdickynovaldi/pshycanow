"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAssistanceLevel2Submission, gradeAssistanceLevel2Submission } from "@/lib/actions/assistance-actions";
import { Loader2, AlertCircle, ChevronLeft, Clock } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Interface definitions
interface Answer {
  id: string;
  answerText: string;
  question: {
    text: string;
    hint?: string;
  };
}

interface Submission {
  id: string;
  createdAt: string | Date;
  student: {
    name: string;
    email: string;
    image?: string;
  };
  assistance: {
    quiz: {
      title: string;
      class: {
        name: string;
      };
    };
  };
  answers: Answer[];
}

export default function GradeAssistanceSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [passed, setPassed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [goToLevel3, setGoToLevel3] = useState(false);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const result = await getAssistanceLevel2Submission(submissionId);
        
        if (!result.success) {
          setError(result.message || "Gagal memuat data submisi");
          setLoading(false);
          return;
        }
        
        setSubmission(result.data as unknown as Submission);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data");
        setLoading(false);
      }
    }
    
    loadData();
  }, [submissionId]);
  
  // Handle kembali ke daftar submisi
  const handleBack = () => {
    router.push("/teacher/assistances");
  };
  
  // Handle submit penilaian
  const handleSubmit = async () => {
    // Validasi input
    if (!feedback.trim()) {
      setFormError("Umpan balik wajib diisi");
      return;
    }
    
    setSubmitting(true);
    setFormError(null);
    
    try {
      const result = await gradeAssistanceLevel2Submission(
        submissionId,
        passed,
        feedback,
        !passed && goToLevel3  // Hanya kirim goToLevel3 jika tidak lulus
      );
      
      if (!result.success) {
        setFormError(result.message || "Gagal mengirim penilaian");
        setSubmitting(false);
        return;
      }
      
      // Redirect ke daftar submisi
      router.push("/teacher/assistances?graded=true");
    } catch (err) {
      console.error(err);
      setFormError("Terjadi kesalahan saat mengirim penilaian");
      setSubmitting(false);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Memuat data submisi...</p>
      </div>
    );
  }
  
  // Render error state
  if (error || !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-destructive font-medium">{error || "Submisi tidak ditemukan"}</p>
        <Button onClick={handleBack} className="mt-4">
          Kembali ke Daftar
        </Button>
      </div>
    );
  }
  
  // Extract data
  const student = submission.student;
  const quiz = submission.assistance.quiz;
  const className = quiz.class.name;
  const answers = submission.answers || [];
  
  return (
    <div className="container py-8 max-w-4xl">
      <Button variant="outline" onClick={handleBack} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Kembali ke Daftar
      </Button>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Penilaian Bantuan Level 2</CardTitle>
              <CardDescription>{quiz.title} - {className}</CardDescription>
            </div>
            <div className="flex items-center bg-amber-50 text-amber-800 px-3 py-2 rounded-md border border-amber-200">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-sm">
                Dikirim pada {format(new Date(submission.createdAt), "dd MMMM yyyy, HH:mm", { locale: id })}
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Informasi Siswa */}
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg mb-8">
            <Avatar className="h-10 w-10">
              <AvatarImage src={student.image || ""} alt={student.name} />
              <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{student.name}</h3>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>
          </div>
          
          {/* Daftar Jawaban */}
          <div className="space-y-8 mb-8">
            <h3 className="text-lg font-medium">Jawaban Siswa</h3>
            
            {answers.map((answer: Answer, index: number) => (
              <div key={answer.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-4">
                  <h4 className="font-medium">Pertanyaan {index + 1}</h4>
                  <p>{answer.question.text}</p>
                  
                  {answer.question.hint && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800">
                        <span className="font-medium">Petunjuk:</span> {answer.question.hint}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h5 className="text-sm font-medium mb-2 text-muted-foreground">Jawaban Siswa:</h5>
                  <div className="p-3 bg-muted/30 rounded-md whitespace-pre-wrap">
                    {answer.answerText || <span className="text-muted-foreground italic">Tidak ada jawaban</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Form Penilaian */}
          <div className="border rounded-lg p-5">
            <h3 className="text-lg font-medium mb-4">Formulir Penilaian</h3>
            
            <div className="flex items-center gap-3 mb-6">
              <Switch
                id="passed"
                checked={passed}
                onCheckedChange={setPassed}
              />
              <Label htmlFor="passed">Jawaban diterima dan siswa dapat melanjutkan</Label>
            </div>
            
            {!passed && (
              <div className="flex items-center gap-3 mb-6">
                <Switch
                  id="goToLevel3"
                  checked={goToLevel3}
                  onCheckedChange={setGoToLevel3}
                />
                <Label htmlFor="goToLevel3">Arahkan siswa ke bantuan level 3</Label>
              </div>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="feedback">Umpan Balik untuk Siswa</Label>
              <Textarea
                id="feedback"
                placeholder="Berikan umpan balik yang konstruktif untuk membantu siswa memahami..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[150px]"
              />
              <p className="text-sm text-muted-foreground">
                Umpan balik yang Anda berikan akan ditampilkan kepada siswa.
                {!passed && " Jika jawaban ditolak, siswa akan diminta mengerjakan kembali bantuan level 2."}
              </p>
            </div>
            
            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end border-t pt-4">
          <Button 
            variant="outline" 
            onClick={handleBack} 
            className="mr-2"
            disabled={submitting}
          >
            Batal
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              "Kirim Penilaian"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 