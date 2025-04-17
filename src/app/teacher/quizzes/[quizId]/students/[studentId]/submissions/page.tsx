"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RefreshCcw, Clock, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Answer {
  id: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  score: number | null;
  feedback: string | null;
  question: {
    id: string;
    question: string;
    maxScore: number;
  };
}

interface Submission {
  id: string;
  attemptNumber: number;
  status: "PENDING" | "PASSED" | "FAILED";
  createdAt: string;
  answers: Answer[];
}

export default function QuizSubmissionPage() {
  const params = useParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`/api/teacher/quiz-submissions?quizId=${params.quizId}&studentId=${params.studentId}`);
      
      if (!response.ok) {
        throw new Error("Gagal memuat data submission");
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Data sudah berformat array of submissions
        setSubmissions(data.data.submissions);
        setStudentName(data.data.studentName);
      } else {
        toast.error(data.message || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Gagal memuat data submission");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (submissionId: string, answerId: string, score: string) => {
    const numScore = parseInt(score);
    if (isNaN(numScore)) return;

    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId 
          ? {
              ...sub,
              answers: sub.answers.map(ans =>
                ans.id === answerId
                  ? { ...ans, score: numScore }
                  : ans
              )
            }
          : sub
      )
    );
  };

  const handleFeedbackChange = (submissionId: string, answerId: string, feedback: string) => {
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId 
          ? {
              ...sub,
              answers: sub.answers.map(ans =>
                ans.id === answerId
                  ? { ...ans, feedback }
                  : ans
              )
            }
          : sub
      )
    );
  };

  const handleSaveScores = async (submissionId: string) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;

    setSaving(true);
    
    try {
      const response = await fetch('/api/teacher/save-quiz-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: params.quizId,
          studentId: params.studentId,
          submissionId: submission.id,
          scores: submission.answers.map(answer => ({
            answerId: answer.id,
            score: answer.score,
            feedback: answer.feedback
          }))
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Nilai untuk percobaan ke-" + submission.attemptNumber + " berhasil disimpan");
        // Refresh data untuk mendapatkan status terbaru
        fetchSubmissions();
      } else {
        toast.error(data.message || "Gagal menyimpan nilai");
      }
    } catch (error) {
      console.error("Error saving scores:", error);
      toast.error("Terjadi kesalahan saat menyimpan nilai");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCcw className="animate-spin h-8 w-8 text-primary" />
        <span className="ml-2">Memuat data submission...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Penilaian Kuis Reguler</h1>
          <p className="text-muted-foreground">Siswa: {studentName}</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">
              Siswa belum mengerjakan kuis
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8">
          {submissions.map((submission, index) => (
            <Card key={submission.id} className="relative">
              <div className="absolute right-4 top-4 flex gap-2">
                <Badge variant={
                  submission.status === "PASSED" ? "default" :
                  submission.status === "FAILED" ? "destructive" :
                  "secondary"
                }>
                  {submission.status === "PASSED" ? "Lulus" :
                   submission.status === "FAILED" ? "Tidak Lulus" :
                   "Menunggu Penilaian"}
                </Badge>
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  Percobaan ke-{submission.attemptNumber}
                </CardTitle>
                <CardDescription>
                  Dikerjakan pada: {
                    submission.createdAt ? 
                    format(new Date(submission.createdAt), "dd MMMM yyyy, HH:mm", { locale: id }) :
                    "Waktu tidak tersedia"
                  }
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {submission.answers.map((answer, answerIndex) => (
                  <div key={answer.id} className="space-y-4 pb-4 border-b last:border-0">
                    <div className="space-y-2">
                      <Label>Pertanyaan {answerIndex + 1}:</Label>
                      <div className="p-3 bg-muted rounded-md">
                        {answer.question?.question || "Pertanyaan tidak tersedia"}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Jawaban Siswa:</Label>
                      <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                        {answer.answerText || "Jawaban tidak tersedia"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`score-${answer.id}`}>
                          Nilai (Maksimal: {answer.question?.maxScore || 100})
                        </Label>
                        <Input
                          id={`score-${answer.id}`}
                          type="number"
                          min="0"
                          max={answer.question?.maxScore || 100}
                          value={answer.score || ""}
                          onChange={(e) => handleScoreChange(submission.id, answer.id, e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`feedback-${answer.id}`}>Feedback</Label>
                        <Textarea
                          id={`feedback-${answer.id}`}
                          value={answer.feedback || ""}
                          onChange={(e) => handleFeedbackChange(submission.id, answer.id, e.target.value)}
                          placeholder="Berikan feedback untuk siswa..."
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => handleSaveScores(submission.id)}
                    disabled={saving}
                    className="px-6"
                  >
                    {saving ? (
                      <>
                        <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Nilai Percobaan ke-" + submission.attemptNumber
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 