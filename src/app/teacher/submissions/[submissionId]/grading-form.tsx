"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeftIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getSubmissionDetail, gradeQuizSubmission } from "@/lib/actions/quiz-submission-actions";
import { SubmissionStatus } from "@/types";
import { submissionGradingSchema } from "@/lib/validations/quiz-submission";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import ManualAssistanceControl from "./manual-assistance-control";

interface QuestionData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  quizId: string;
  text: string;
  imageUrl: string | null;
  expectedAnswer: string | null;
}

interface AnswerData {
  submissionId: string;
  questionId: string;
  answerText: string;
  score?: number | null;
  feedback?: string | null;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  question: QuestionData;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface QuizData {
  id: string;
  title: string;
}

interface StudentProgress {
  currentAttempt: number;
  lastAttemptPassed: boolean | null;
  overrideSystemFlow?: boolean;
  manuallyAssignedLevel?: string | null;
  finalStatus?: string;
}

interface SubmissionData {
  id: string;
  studentId: string;
  quizId: string;
  status: SubmissionStatus;
  submittedAt?: string | Date | null;
  answers: AnswerData[];
  student: StudentData;
  quiz: QuizData;
}

export default function GradingForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [answerGrades, setAnswerGrades] = useState<Record<string, boolean>>({});
  const [answerFeedbacks, setAnswerFeedbacks] = useState<Record<string, string>>({});
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State untuk manual assistance control
  const [initialOverride, setInitialOverride] = useState(false);
  const [initialLevel, setInitialLevel] = useState<string | null>(null);
  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null);
  
  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setIsLoading(true);
        
        const response = await getSubmissionDetail(submissionId);
        
        if (response.success && response.data) {
          const submissionData = response.data as unknown as SubmissionData;
          setSubmission(submissionData);
          
          // Pastikan nilai submittedAt valid
          if (submissionData.submittedAt) {
            try {
              const submittedDate = new Date(submissionData.submittedAt);
              if (isNaN(submittedDate.getTime())) {
                console.warn("Invalid submission date detected:", submissionData.submittedAt);
                // Set to a valid date or null
                submissionData.submittedAt = null;
              }
            } catch (err) {
              console.warn("Error parsing submission date:", err);
              submissionData.submittedAt = null;
            }
          }
          
          // Inisialisasi state penilaian untuk setiap jawaban
          const initialGrades: Record<string, boolean> = {};
          const initialFeedbacks: Record<string, string> = {};
          
          submissionData.answers.forEach((answer) => {
            initialGrades[answer.id] = false; // Default: jawaban tidak benar
            initialFeedbacks[answer.id] = ""; // Default: tidak ada feedback
          });
          
          setAnswerGrades(initialGrades);
          setAnswerFeedbacks(initialFeedbacks);
          
          // Jika data progress siswa tersedia, ambil pengaturan override
          try {
            const progressResponse = await fetch(`/api/student/quiz-progress?quizId=${response.data.quizId}&studentId=${response.data.studentId}`);
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              if (progressData.success && progressData.data) {
                const progress = progressData.data as StudentProgress;
                setInitialOverride(progress.overrideSystemFlow || false);
                setInitialLevel(progress.manuallyAssignedLevel || null);
                setStudentProgress(progress);
                console.log("Loaded progress data:", progress);
              }
            }
          } catch (err) {
            console.error("Failed to load student progress:", err);
          }
        } else {
          setError(response.message || "Gagal memuat detail submisi");
        }
      } catch (err) {
        console.error("Error loading submission detail:", err);
        setError("Terjadi kesalahan saat memuat detail submisi");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSubmission();
  }, [submissionId]);
  
  // Debug: Monitor changes to answerGrades state
  useEffect(() => {
    // Hapus console.log untuk mengurangi operasi yang tidak perlu
  }, [answerGrades]);
  
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return "?";
    
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2) || "?";
  };
  
  const handleAnswerFeedbackChange = (answerId: string, value: string) => {
    setAnswerFeedbacks(prev => ({
      ...prev,
      [answerId]: value
    }));
  };
  
  const handleAnswerGradeChange = (answerId: string, isCorrect: boolean) => {
    console.log(`Setting answer ${answerId} to ${isCorrect ? 'benar' : 'salah'}`);
    setAnswerGrades(prev => {
      const newGrades = {
        ...prev,
        [answerId]: isCorrect === true
      };
      console.log('Updated grades state:', newGrades);
      return newGrades;
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const gradingData = {
        submissionId,
        answers: Object.keys(answerGrades).map(answerId => ({
          answerId,
          isCorrect: answerGrades[answerId],
          feedback: answerFeedbacks[answerId]
        })),
        feedback: generalFeedback
      };
      
      // Validasi dengan Zod
      const validationResult = submissionGradingSchema.safeParse(gradingData);
      
      if (!validationResult.success) {
        console.error("Validation errors:", validationResult.error.format());
        setError("Validasi data gagal. Pastikan semua data penilaian sudah benar.");
        return;
      }
      
      const response = await gradeQuizSubmission(gradingData);
      
      if (response.success) {
        alert("Submisi berhasil dinilai!");
        router.push("/teacher/submissions");
      } else {
        setError(response.message || "Gagal menilai submisi");
      }
    } catch (err) {
      console.error("Error grading submission:", err);
      setError("Terjadi kesalahan saat menilai submisi");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle status lulus/tidak lulus kuis utama
  const handleToggleQuizStatus = async (isPassed: boolean | null) => {
    if (!submission?.studentId || !submission?.quizId) return;
    
    try {
      const response = await fetch('/api/teacher/toggle-quiz-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: submission.studentId,
          quizId: submission.quizId,
          isPassed
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(
          isPassed === true 
            ? "Status siswa diubah menjadi LULUS" 
            : isPassed === false
              ? "Status siswa diubah menjadi TIDAK LULUS"
              : "Status siswa diubah menjadi ON GOING"
        );
        
        // Update state progress siswa
        setStudentProgress((prev: StudentProgress | null) => prev ? {
          ...prev,
          lastAttemptPassed: isPassed,
          finalStatus: isPassed === true 
            ? "passed" 
            : isPassed === false 
              ? "failed" 
              : "ongoing"
        } : null);
        
      } else {
        alert("Gagal mengubah status kuis: " + (data.message || "Terjadi kesalahan"));
      }
    } catch (error) {
      console.error("Error toggling quiz status:", error);
      alert("Terjadi kesalahan saat mengubah status kuis");
    }
  };
  
  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !submission) {
    return (
      <div className="container py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Detail submisi tidak dapat dimuat"}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => router.push("/teacher/submissions")} variant="outline">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Kembali ke Daftar Submisi
        </Button>
      </div>
    );
  }
  
  // Cek jika submisi sudah dinilai
  if (submission.status !== SubmissionStatus.PENDING) {
    return (
      <div className="container py-8">
        <Alert className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500 text-yellow-800 dark:text-yellow-300">
          <AlertTitle>Submisi Sudah Dinilai</AlertTitle>
          <AlertDescription>
            Submisi ini sudah dinilai sebelumnya dan tidak dapat dinilai ulang.
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => router.push("/teacher/submissions")} variant="outline">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Kembali ke Daftar Submisi
        </Button>
        
        {/* Status Kuis Utama */}
        <div className="mt-6 mb-4">
          <h2 className="text-xl font-bold mb-4">Status Kuis Utama</h2>
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center mb-4">
                <span className="text-sm mr-2">Status saat ini:</span>
                <span className={
                  studentProgress?.lastAttemptPassed === true
                    ? "text-green-600 font-medium text-sm" 
                    : studentProgress?.lastAttemptPassed === false 
                      ? "text-red-600 font-medium text-sm" 
                      : "text-blue-600 font-medium text-sm"
                }>
                  {studentProgress?.lastAttemptPassed === true
                    ? "Lulus" 
                    : studentProgress?.lastAttemptPassed === false 
                      ? "Tidak Lulus" 
                      : "On Going"}
                </span>
                
                {submission.submittedAt && !isNaN(new Date(submission.submittedAt).getTime()) && (
                  <span className="text-xs text-muted-foreground ml-2">
                    • Dikumpulkan: {formatDistanceToNow(new Date(submission.submittedAt), { 
                      addSuffix: true, 
                      locale: id
                    })}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  variant={studentProgress?.lastAttemptPassed === true ? "default" : "outline"} 
                  className="flex-1"
                  onClick={() => handleToggleQuizStatus(true)}
                >
                  <CheckIcon className="h-3.5 w-3.5 mr-1" />
                  Lulus
                </Button>
                <Button 
                  size="sm"
                  variant={studentProgress?.lastAttemptPassed === null ? "secondary" : "outline"} 
                  className="flex-1"
                  onClick={() => handleToggleQuizStatus(null)}
                >
                  <span className="inline-block h-3.5 w-3.5 mr-1">⏱️</span>
                  On Going
                </Button>
                <Button 
                  size="sm"
                  variant={studentProgress?.lastAttemptPassed === false ? "destructive" : "outline"} 
                  className="flex-1"
                  onClick={() => handleToggleQuizStatus(false)}
                >
                  <XMarkIcon className="h-3.5 w-3.5 mr-1" />
                  Tidak Lulus
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Kontrol manual bantuan masih bisa diakses meskipun submisi sudah dinilai */}
        <div>
          <h2 className="text-xl font-bold mb-4">Pengaturan Alur Pembelajaran</h2>
          <ManualAssistanceControl 
            studentId={submission.studentId}
            quizId={submission.quizId}
            submissionId={submissionId}
            initialOverride={initialOverride}
            initialLevel={initialLevel}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push("/teacher/submissions")} 
          className="h-8 w-8"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nilai Submisi</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {submission.quiz.title}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Siswa</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center">
                <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage src={submission.student.image || ""} alt={submission.student.name || "Student"} />
                  <AvatarFallback>{getInitials(submission.student.name || "")}</AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-semibold">{submission.student.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{submission.student.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Percobaan: {studentProgress?.currentAttempt || 0}/4 
                    {submission.submittedAt && !isNaN(new Date(submission.submittedAt).getTime()) ? (
                      <>
                        {' • '}
                        Dikumpulkan: {formatDistanceToNow(new Date(submission.submittedAt), { 
                          addSuffix: true, 
                          locale: id
                        })}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              
              {/* Status Kelulusan Toggle */}
              <div className="mt-4 pt-4 border-t">
                <p className="mb-2 font-medium">Status Kuis Utama</p>
                <div className="flex items-center space-x-2">
                  <span className="text-sm mr-2">Status saat ini:</span>
                  <span className={
                    studentProgress?.lastAttemptPassed === true
                      ? "text-green-600 font-medium text-sm" 
                      : studentProgress?.lastAttemptPassed === false 
                        ? "text-red-600 font-medium text-sm" 
                        : "text-blue-600 font-medium text-sm"
                  }>
                    {studentProgress?.lastAttemptPassed === true
                      ? "Lulus" 
                      : studentProgress?.lastAttemptPassed === false 
                        ? "Tidak Lulus" 
                        : "On Going"}
                  </span>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm"
                    variant={studentProgress?.lastAttemptPassed === true ? "default" : "outline"} 
                    className="flex-1 h-7"
                    onClick={() => handleToggleQuizStatus(true)}
                  >
                    <CheckIcon className="h-3.5 w-3.5 mr-1" />
                    Lulus
                  </Button>
                  <Button 
                    size="sm"
                    variant={studentProgress?.lastAttemptPassed === null ? "secondary" : "outline"} 
                    className="flex-1 h-7"
                    onClick={() => handleToggleQuizStatus(null)}
                  >
                    <span className="inline-block h-3.5 w-3.5 mr-1">⏱️</span>
                    On Going
                  </Button>
                  <Button 
                    size="sm"
                    variant={studentProgress?.lastAttemptPassed === false ? "destructive" : "outline"} 
                    className="flex-1 h-7"
                    onClick={() => handleToggleQuizStatus(false)}
                  >
                    <XMarkIcon className="h-3.5 w-3.5 mr-1" />
                    Tidak Lulus
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <ManualAssistanceControl 
            studentId={submission.studentId}
            quizId={submission.quizId}
            submissionId={submissionId}
            initialOverride={initialOverride}
            initialLevel={initialLevel}
          />
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-6">
          {submission.answers.map((answer: AnswerData, index: number) => (
            <Card key={answer.id}>
              <CardHeader>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Pertanyaan {index + 1}
                </div>
                <CardTitle className="text-lg">{answer.question.text}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {answer.question.imageUrl && (
                  <div className="mb-4">
                    <Image
                      src={answer.question.imageUrl}
                      alt={`Gambar untuk pertanyaan ${index + 1}`}
                      width={600}
                      height={400}
                      className="rounded-md max-h-[300px] w-auto object-contain"
                    />
                  </div>
                )}
                
                <div>
                  <div className="text-sm font-medium mb-2">Jawaban Siswa:</div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                    {answer.answerText}
                  </div>
                </div>
                
                {answer.question.expectedAnswer && (
                  <div>
                    <div className="text-sm font-medium mb-2">Jawaban yang Diharapkan:</div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-blue-800 dark:text-blue-300">
                      {answer.question.expectedAnswer}
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative border border-blue-300 rounded w-fit h-fit">
                      <Checkbox 
                        id={`correct-${answer.id}`}
                        checked={answerGrades[answer.id] || false}
                        onCheckedChange={(checked) => {
                          handleAnswerGradeChange(answer.id, Boolean(checked));
                        }}
                        className="h-5 w-5"
                      />
                    </div>
                    <Label 
                      htmlFor={`correct-${answer.id}`}
                      className="font-medium cursor-pointer"
                    >
                      Tandai jawaban ini benar {answerGrades[answer.id] ? '✓' : ''}
                    </Label>
                  </div>
                  
                  <div>
                    <Label htmlFor={`feedback-${answer.id}`} className="mb-2 block">
                      Umpan balik untuk jawaban ini:
                    </Label>
                    <Textarea
                      id={`feedback-${answer.id}`}
                      placeholder="Berikan umpan balik untuk siswa (opsional)"
                      value={answerFeedbacks[answer.id]}
                      onChange={(e) => handleAnswerFeedbackChange(answer.id, e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Umpan Balik Umum</CardTitle>
          </CardHeader>
          
          <CardContent>
            <Textarea
              placeholder="Berikan umpan balik umum untuk siswa (opsional)"
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-between mt-8 gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/teacher/submissions")}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Penilaian"}
          </Button>
        </div>
      </form>
    </div>
  );
} 