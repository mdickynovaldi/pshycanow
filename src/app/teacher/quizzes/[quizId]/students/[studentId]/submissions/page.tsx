"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RefreshCcw, CheckCircle, XCircle, AlertCircle, Trophy, Target, BookOpen, Star, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Answer {
  id: string;
  submissionId: string;
  questionId: string;
  answerText: string;
  score: number | null;  // Nilai numerik yang diberikan guru
  feedback: string | null;
  isCorrect: boolean | null; // Hasil koreksi otomatis
  question: {
    id: string;
    question: string;
    maxScore: number;
    expectedAnswer?: string; // Jawaban yang diharapkan untuk koreksi otomatis
  };
}

interface Submission {
  id: string;
  attemptNumber: number;
  status: "PENDING" | "PASSED" | "FAILED";
  score?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  createdAt: string;
  answers: Answer[];
}

export default function QuizSubmissionPage() {
  const params = useParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentName, setStudentName] = useState("");

  const fetchSubmissions = useCallback(async () => {
    console.log('🔍 fetchSubmissions called', { quizId: params.quizId, studentId: params.studentId });
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/teacher/quiz-submissions?quizId=${params.quizId}&studentId=${params.studentId}`);
      
      console.log('📡 API Response:', { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.message || "Gagal memuat data submission");
      }
      
      const data = await response.json();
      
      console.log('📊 API Data:', {
        success: data.success,
        submissionsCount: data.data?.submissions?.length || 0,
        studentName: data.data?.studentName
      });
      
      if (data.success && data.data) {
        const submissions = Array.isArray(data.data.submissions) ? data.data.submissions : [];
        
        console.log('✅ Setting submissions:', {
          totalSubmissions: submissions.length,
          submissionStatuses: submissions.map((s: Submission) => ({ attempt: s.attemptNumber, status: s.status }))
        });
        
        setSubmissions(submissions);
        setStudentName(data.data.studentName || "Nama tidak tersedia");
        
        if (submissions.length === 0) {
          console.log('⚠️ Tidak ada submission ditemukan untuk siswa ini');
          toast.info("Siswa belum pernah mengerjakan kuis ini");
        }
      } else {
        console.error('❌ API returned error:', data.message);
        toast.error(data.message || "Terjadi kesalahan");
        setSubmissions([]);
      }
    } catch (error) {
      console.error("❌ Error fetching submissions:", error);
      toast.error(error instanceof Error ? error.message : "Gagal memuat data submission");
      setSubmissions([]);
    } finally {
      console.log('🏁 fetchSubmissions completed, setting loading to false');
      setLoading(false);
    }
  }, [params.quizId, params.studentId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

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
        // Tampilkan pesan sukses yang informatif
        toast.success(data.message || `Nilai untuk percobaan ke-${submission.attemptNumber} berhasil disimpan`);
        
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

  // Fungsi untuk menghitung status submission berdasarkan kriteria 70%
  const getSubmissionStatus = (submission: Submission) => {
    const totalQuestions = submission.answers.length;
    const autoCorrectCount = submission.answers.filter(a => a.isCorrect === true).length;
    const autoCorrectPercentage = totalQuestions > 0 ? (autoCorrectCount / totalQuestions) * 100 : 0;
    
    // Hitung skor guru jika ada
    const teacherScores = submission.answers.map(a => a.score || 0);
    const teacherTotalScore = teacherScores.reduce((sum, score) => sum + score, 0);
    const teacherMaxScore = 100 * totalQuestions;
    const teacherPercentage = teacherMaxScore > 0 ? (teacherTotalScore / teacherMaxScore) * 100 : 0;
    
    const hasTeacherScores = submission.answers.some(a => a.score !== null);
    const autoCorrectPassed = autoCorrectPercentage >= 70;
    const teacherGradePassed = teacherPercentage >= 70;
    const finalPassed = autoCorrectPassed || (hasTeacherScores && teacherGradePassed);
    
    return {
      autoCorrectCount,
      autoCorrectPercentage,
      teacherPercentage,
      finalPassed,
      autoCorrectPassed,
      teacherGradePassed,
      hasTeacherScores,
      totalQuestions
    };
  };

  if (loading) {
    console.log('🔄 Component is in loading state');
    return (
      <div className="flex flex-col justify-center items-center p-8 space-y-4">
        <RefreshCcw className="animate-spin h-8 w-8 text-primary" />
        <span className="text-lg font-medium">Memuat data submission...</span>
        <p className="text-sm text-muted-foreground">Mengambil riwayat pengerjaan siswa</p>
      </div>
    );
  }

  console.log('🎯 Rendering component with submissions:', { 
    submissionsCount: submissions.length, 
    studentName, 
    loading 
  });

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-200">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Penilaian Kuis Reguler
            </h1>
            <div className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Siswa: {studentName}</span>
            </div>
            <p className="text-gray-600 max-w-2xl">
              Berikan penilaian dan feedback untuk membantu siswa memahami materi dengan lebih baik. 
              Sistem menggunakan <span className="font-semibold text-blue-600">passing grade 70%</span> untuk menentukan kelulusan.
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <Target className="h-4 w-4" />
              <span className="font-semibold">Passing Grade: 70%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informasi Koreksi Otomatis */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-t-lg">
          <CardTitle className="text-lg flex items-center gap-3 text-blue-900">
            <Star className="h-5 w-5 text-blue-600" />
            Sistem Penilaian Otomatis & Manual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm pt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Koreksi Otomatis
              </h4>
              <ul className="space-y-1 text-blue-700 pl-4">
                <li>• Sistem telah melakukan koreksi berdasarkan jawaban yang diharapkan</li>
                <li>• Status otomatis ditampilkan untuk setiap jawaban</li>
                <li>• Skor otomatis dihitung dari jawaban benar</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Penilaian Manual
              </h4>
              <ul className="space-y-1 text-blue-700 pl-4">
                <li>• Anda dapat memberikan nilai dan feedback tambahan</li>
                <li>• <span className="font-semibold">LULUS</span> jika skor ≥ 70% (otomatis ATAU manual)</li>
                <li>• Feedback Anda membantu pembelajaran siswa</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {submissions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="space-y-4">
              <AlertCircle className="h-16 w-16 text-gray-400 mx-auto" />
              <h3 className="text-xl font-semibold text-gray-600">Belum Ada Submission</h3>
              <p className="text-gray-500">Siswa belum mengerjakan kuis ini</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2 text-gray-800">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Ringkasan Penilaian
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">{submissions.length}</div>
                  <div className="text-sm font-medium text-blue-700 mt-1">Total Percobaan</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    {submissions.filter(s => s.status === "PASSED").length}
                  </div>
                  <div className="text-sm font-medium text-green-700 mt-1">Lulus</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                  <div className="text-3xl font-bold text-red-600">
                    {submissions.filter(s => s.status === "FAILED").length}
                  </div>
                  <div className="text-sm font-medium text-red-700 mt-1">Tidak Lulus</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600">
                    {submissions.filter(s => s.status === "PENDING").length}
                  </div>
                  <div className="text-sm font-medium text-orange-700 mt-1">Menunggu Penilaian</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions */}
          <div className="space-y-6">
            {submissions.map((submission) => {
              const status = getSubmissionStatus(submission);
              
              return (
                <Card key={submission.id} className="bg-white shadow-xl border-0 overflow-hidden">
                  {/* Header dengan Status */}
                  <div className={`p-4 ${
                    submission.status === "PASSED" ? "bg-gradient-to-r from-green-100 to-green-200" :
                    submission.status === "FAILED" ? "bg-gradient-to-r from-red-100 to-red-200" :
                    "bg-gradient-to-r from-orange-100 to-orange-200"
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          submission.status === "PASSED" ? "bg-green-500" :
                          submission.status === "FAILED" ? "bg-red-500" :
                          "bg-orange-500"
                        }`}>
                          {submission.status === "PASSED" ? 
                            <Trophy className="h-5 w-5 text-white" /> :
                            submission.status === "FAILED" ?
                            <XCircle className="h-5 w-5 text-white" /> :
                            <AlertCircle className="h-5 w-5 text-white" />
                          }
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">
                            Percobaan ke-{submission.attemptNumber}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {submission.createdAt ? 
                              format(new Date(submission.createdAt), "dd MMMM yyyy, HH:mm", { locale: id }) :
                              "Waktu tidak tersedia"
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant={
                            submission.status === "PASSED" ? "default" :
                            submission.status === "FAILED" ? "destructive" :
                            "secondary"
                          }
                          className="text-sm px-3 py-1"
                        >
                          {submission.status === "PASSED" ? "🎉 LULUS" :
                           submission.status === "FAILED" ? "❌ TIDAK LULUS" :
                           "⏳ Menunggu Penilaian"}
                        </Badge>
                        
                        {/* Status detail */}
                        <div className="text-right text-xs space-y-1">
                          <div className={`${status.autoCorrectPassed ? 'text-green-600' : 'text-red-600'} font-medium`}>
                            Auto: {Math.round(status.autoCorrectPercentage)}%
                          </div>
                          {status.hasTeacherScores && (
                            <div className={`${status.teacherGradePassed ? 'text-green-600' : 'text-red-600'} font-medium`}>
                              Guru: {Math.round(status.teacherPercentage)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="space-y-6 p-6">
                    {submission.answers.map((answer, answerIndex) => (
                      <div key={answer.id} className="space-y-4 pb-6 border-b last:border-0 bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold text-gray-800">
                              Pertanyaan {answerIndex + 1}:
                            </Label>
                            {/* Status koreksi otomatis dengan design yang lebih cantik */}
                            {answer.isCorrect !== null && (
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-600">Koreksi Otomatis:</span>
                                {answer.isCorrect ? (
                                  <Badge variant="default" className="flex items-center gap-2 bg-green-500 hover:bg-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    Benar
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4" />
                                    Salah
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-gray-700">{answer.question?.question || "Pertanyaan tidak tersedia"}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-base font-medium text-gray-800">Jawaban Siswa:</Label>
                          <div className={`p-4 rounded-lg whitespace-pre-wrap border-2 ${
                            answer.isCorrect === true ? 'bg-green-50 border-green-300 text-green-800' :
                            answer.isCorrect === false ? 'bg-red-50 border-red-300 text-red-700' :
                            'bg-gray-50 border-gray-300 text-gray-700'
                          }`}>
                            {answer.answerText || "Jawaban tidak tersedia"}
                          </div>
                          
                          {/* Jawaban yang diharapkan dengan design yang lebih cantik */}
                          {answer.question?.expectedAnswer && answer.isCorrect === false && (
                            <div className="mt-3 space-y-2">
                              <Label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Jawaban yang diharapkan:
                              </Label>
                              <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-blue-800 font-medium">
                                {answer.question.expectedAnswer}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor={`score-${answer.id}`} className="text-base font-medium text-gray-800">
                              Nilai Manual (0-100)
                            </Label>
                            <div className="flex items-center gap-3">
                              <Input
                                id={`score-${answer.id}`}
                                type="number"
                                min="0"
                                max="100"
                                value={answer.score || ""}
                                onChange={(e) => handleScoreChange(submission.id, answer.id, e.target.value)}
                                className="text-lg font-medium"
                                placeholder="0-100"
                              />
                              {/* Saran nilai berdasarkan koreksi otomatis */}
                              {answer.isCorrect !== null && answer.score === null && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleScoreChange(
                                    submission.id, 
                                    answer.id, 
                                    answer.isCorrect ? "100" : "0"
                                  )}
                                  className="text-xs whitespace-nowrap bg-blue-50 hover:bg-blue-100 border-blue-300"
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Saran: {answer.isCorrect ? "100" : "0"}
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor={`feedback-${answer.id}`} className="text-base font-medium text-gray-800">
                              Feedback untuk Siswa
                            </Label>
                            <Textarea
                              id={`feedback-${answer.id}`}
                              value={answer.feedback || ""}
                              onChange={(e) => handleFeedbackChange(submission.id, answer.id, e.target.value)}
                              placeholder={
                                answer.isCorrect === true 
                                  ? "Berikan pujian atau masukan tambahan..." 
                                  : answer.isCorrect === false
                                  ? "Berikan penjelasan mengapa jawaban salah..."
                                  : "Berikan feedback untuk siswa..."
                              }
                              className="w-full resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end pt-6 border-t">
                      <Button 
                        onClick={() => handleSaveScores(submission.id)}
                        disabled={saving}
                        className="px-8 py-3 text-lg font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        size="lg"
                      >
                        {saving ? (
                          <>
                            <RefreshCcw className="h-5 w-5 mr-2 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Award className="h-5 w-5 mr-2" />
                            Simpan Penilaian Percobaan ke-{submission.attemptNumber}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 