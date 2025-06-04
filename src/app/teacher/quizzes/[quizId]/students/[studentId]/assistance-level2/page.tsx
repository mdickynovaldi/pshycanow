"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AnswerItem {
  id: string | null;
  questionId: string;
  answerText: string;
  isCorrect: boolean | null;
  question: {
    id: string;
    question: string;
  };
}

interface Level2Submission {
  id: string;
  status: "PASSED" | "FAILED" | "PENDING";
  feedback: string | null;
  createdAt: string;
  answers: AnswerItem[];
}

export default function AssistanceLevel2Page() {
  const params = useParams();
  const [submission, setSubmission] = useState<Level2Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentName, setStudentName] = useState("");

  const fetchSubmission = useCallback(async () => {
    try {
      const response = await fetch(`/api/teacher/assistance-level2-submission?quizId=${params.quizId}&studentId=${params.studentId}`);
      
      if (!response.ok) {
        throw new Error("Gagal memuat data submission");
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSubmission(data.data.submission);
        setStudentName(data.data.studentName);
      } else {
        toast.error(data.message || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error fetching submission:", error);
      toast.error("Gagal memuat data submission");
    } finally {
      setLoading(false);
    }
  }, [params.quizId, params.studentId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleStatusChange = (status: "PASSED" | "FAILED") => {
    if (!submission) return;
    setSubmission(prev => prev ? { ...prev, status } : null);
  };

  const handleFeedbackChange = (feedback: string) => {
    if (!submission) return;
    setSubmission(prev => prev ? { ...prev, feedback } : null);
  };

  const handleSave = async () => {
    if (!submission) return;
    
    setSaving(true);
    
    try {
      const response = await fetch('/api/teacher/save-assistance-level2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submission.id,
          quizId: params.quizId,
          studentId: params.studentId,
          status: submission.status,
          feedback: submission.feedback
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Penilaian berhasil disimpan");
      } else {
        toast.error(data.message || "Gagal menyimpan penilaian");
      }
    } catch (error) {
      console.error("Error saving assessment:", error);
      toast.error("Terjadi kesalahan saat menyimpan penilaian");
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

  if (!submission) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">
              Siswa belum mengerjakan bantuan level 2
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Penilaian Bantuan Level 2</h1>
          <p className="text-muted-foreground">Siswa: {studentName}</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            "Simpan Penilaian"
          )}
        </Button>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Jawaban Siswa</h2>
        
        {submission.answers.map((answer, index) => (
          <Card key={answer.questionId} className="mb-6">
            <CardHeader>
              <CardTitle>Pertanyaan {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Pertanyaan:</Label>
                <div className="p-3 bg-muted rounded-md">
                  {answer.question.question}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Jawaban:</Label>
                <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {answer.answerText || "Belum ada jawaban"}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle>Penilaian Keseluruhan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status Penilaian</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Status ini akan menentukan apakah siswa dapat melanjutkan atau perlu mengulang.
                </p>
                <RadioGroup 
                  value={submission.status} 
                  onValueChange={(value: "PASSED" | "FAILED") => handleStatusChange(value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PASSED" id="passed" />
                    <Label htmlFor="passed" className="font-normal">Lulus</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FAILED" id="failed" />
                    <Label htmlFor="failed" className="font-normal">Tidak Lulus</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback untuk Siswa</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Feedback ini akan ditampilkan kepada siswa setelah penilaian.
                </p>
                <Textarea
                  id="feedback"
                  value={submission.feedback || ""}
                  onChange={(e) => handleFeedbackChange(e.target.value)}
                  placeholder="Berikan feedback untuk siswa..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 