"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";

import { MathRenderer } from "@/components/ui/MathRenderer";

import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";


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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Penilaian Bantuan Level 2</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              submission.status === 'PASSED' 
                ? 'bg-green-100 text-green-800' 
                : submission.status === 'FAILED'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {submission.status === 'PASSED' ? '✓ Lulus' : 
               submission.status === 'FAILED' ? '✗ Tidak Lulus' : 
               '⏳ Menunggu Penilaian'}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Siswa: {studentName} • Tanggal Submit: {new Date(submission.createdAt).toLocaleDateString('id-ID')}
          </p>
        </div>
        
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Jawaban Siswa</h2>
          <div className="text-sm text-muted-foreground">
            {submission.answers.filter(a => a.answerText && (a.answerText.includes('$') || a.answerText.includes('\\'))).length > 0 && (
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs">
                📐 {submission.answers.filter(a => a.answerText && (a.answerText.includes('$') || a.answerText.includes('\\'))).length} jawaban mengandung equation
              </span>
            )}
          </div>
        </div>
        
        {submission.answers.map((answer, index) => (
          <Card key={answer.questionId} className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Pertanyaan {index + 1}</span>
                {answer.isCorrect !== null && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    answer.isCorrect 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {answer.isCorrect ? '✓ Benar' : '✗ Salah'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Pertanyaan:
                  {answer.question.question && (answer.question.question.includes('$') || answer.question.question.includes('\\')) && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      📐 Mengandung Math
                    </span>
                  )}
                </Label>
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200 shadow-sm">
                  <div className="prose prose-sm max-w-none">
                    <MathRenderer 
                      content={answer.question.question}
                      className="text-blue-900 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Jawaban Siswa:
                  {answer.answerText && (answer.answerText.includes('$') || answer.answerText.includes('\\')) && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      📐 Mengandung Math
                    </span>
                  )}
                </Label>
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200 min-h-[80px] shadow-sm">
                  {answer.answerText ? (
                    <div className="prose prose-sm max-w-none">
                      <MathRenderer 
                        content={answer.answerText}
                        className="text-gray-900 leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="text-gray-500 italic flex items-center justify-center h-12">
                      Belum ada jawaban
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* <Separator className="my-8" />

        <div className="flex justify-center">
          <Card className="border-2 border-gray-200 shadow-sm rounded-lg p-4 bg-gray-50/50 w-full max-w-md">
            <CardHeader className="flex items-center justify-center">
              <CardTitle>Penilaian Keseluruhan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <Label>Status Penilaian</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Status ini akan menentukan apakah siswa dapat melanjutkan atau perlu mengulang.
                  </p>
                  <RadioGroup 
                    value={submission.status} 
                    onValueChange={(value: "PASSED" | "FAILED") => handleStatusChange(value)}
                    className="flex gap-8 justify-center"
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
                <div className="space-y-2 flex justify-center">
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
              </div>
            </CardContent>
          </Card>
        </div> */}
      </div>
    </div>
  );
} 