"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";


import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  UserIcon, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCcw, 
  PenSquare, 
  PlusCircle,
  Eye,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AssistanceLevel {
  id: string;
  status: string;
  answers: number;
  submittedAt: Date;
}

interface Level3Data {
  completed: boolean;
}

interface StudentProgress {
  currentAttempt: number;
  lastAttemptPassed: boolean | null;
  assistanceRequired: string;
  overrideSystemFlow: boolean;
  manuallyAssignedLevel: string | null;
  level1Completed?: boolean;
  level2Completed?: boolean;
  level3Completed?: boolean;
  failedAttempts?: number;
  latestSubmissionStatus?: string;
  level1?: AssistanceLevel | null;
  level2?: AssistanceLevel | null;
  level3?: Level3Data | null;
  level3AccessGranted?: boolean;
  finalStatus?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  progress?: StudentProgress;
}

interface QuestionData {
  id: string;
  question: string;
}

interface SubmissionAnswer {
  id: string;
  answerText: string;
  question?: QuestionData;
}

interface Level2AnswersData {
  answers: SubmissionAnswer[];
}

export default function StudentControl({ quizId }: { quizId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedL2Answers, setSelectedL2Answers] = useState<Level2AnswersData | null>(null);
  const [loadingL2Answers, setLoadingL2Answers] = useState(false);
  const router = useRouter();

  // Dapatkan daftar siswa yang mengikuti kelas yang berisi kuis ini
  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      try {
        const response = await fetch(`/api/teacher/quiz-students?quizId=${quizId}`);
        
        if (!response.ok) {
          throw new Error("Gagal mendapatkan daftar siswa");
        }
        
        const data = await response.json();
        
        if (data.success) {
          setStudents(data.data);
        } else {
          setError(data.message || "Terjadi kesalahan");
        }
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Gagal memuat data siswa");
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudents();
  }, [quizId]);
  
  // Filter siswa berdasarkan searchTerm
  const filteredStudents = searchTerm
    ? students.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : students;
  
  // Dapatkan status alur siswa yang dipilih
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    
    if (!student.progress) {
      // Coba dapatkan progress terbaru
      try {
        const response = await fetch(`/api/student/quiz-progress?quizId=${quizId}&studentId=${student.id}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const progressData = data.data as StudentProgress;
            
            // Update data siswa di state
            setStudents(prevStudents => 
              prevStudents.map(s => 
                s.id === student.id 
                  ? { 
                      ...s, 
                      progress: {
                        currentAttempt: progressData.currentAttempt,
                        lastAttemptPassed: progressData.lastAttemptPassed,
                        assistanceRequired: progressData.assistanceRequired,
                        overrideSystemFlow: progressData.overrideSystemFlow || false,
                        manuallyAssignedLevel: progressData.manuallyAssignedLevel || "NONE"
                      }
                    }
                  : s
              )
            );
          }
        }
      } catch (err) {
        console.error("Error fetching student progress:", err);
      }
    }
  };
  

  

  
  // Toggle status lulus/tidak lulus kuis utama
  const handleToggleQuizStatus = async (studentId: string, isPassed: boolean | null) => {
    try {
      const response = await fetch('/api/teacher/toggle-quiz-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          quizId,
          isPassed
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(
          isPassed === true 
            ? "Status siswa diubah menjadi LULUS" 
            : isPassed === false
              ? "Status siswa diubah menjadi TIDAK LULUS"
              : "Status siswa diubah menjadi ON GOING"
        );
        
        // Update data di state
        setStudents(prevStudents => 
          prevStudents.map(student => 
            student.id === studentId 
              ? { 
                  ...student, 
                  progress: {
                    ...student.progress,
                    lastAttemptPassed: isPassed,
                    finalStatus: isPassed === true 
                      ? "passed" 
                      : isPassed === false 
                        ? "failed" 
                        : "ongoing"
                  } as StudentProgress
                }
              : student
          )
        );
        
        if (selectedStudent?.id === studentId) {
          setSelectedStudent(prev => prev ? {
            ...prev,
            progress: {
              ...prev.progress,
              lastAttemptPassed: isPassed,
              finalStatus: isPassed === true 
                ? "passed" 
                : isPassed === false 
                  ? "failed" 
                  : "ongoing"
            } as StudentProgress
          } : null);
        }
      } else {
        toast.error(data.message || "Gagal mengubah status kuis");
      }
    } catch (error) {
      console.error("Error toggling quiz status:", error);
      toast.error("Terjadi kesalahan saat mengubah status kuis");
    }
  };
  
  // Tampilkan status alur bantuan
  const getAssistanceLabel = (level: string | null | undefined) => {
    switch (level) {
      case "ASSISTANCE_LEVEL1":
        return "Bantuan Level 1";
      case "ASSISTANCE_LEVEL2":
        return "Bantuan Level 2";
      case "ASSISTANCE_LEVEL3":
        return "Bantuan Level 3";
      case "NONE":
      default:
        return "Kuis Utama";
    }
  };
  
  // Tampilkan ikon status
  const getStatusIcon = (progress: StudentProgress | undefined) => {
    if (!progress) return null;
    
    if (progress.lastAttemptPassed) {
      return <CheckCircle className="h-5 w-5 text-green-500" aria-label="Lulus" />;
    } else if (progress.currentAttempt === 0) {
      return <PlusCircle className="h-5 w-5 text-blue-500" aria-label="Belum mengerjakan" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" aria-label="Belum lulus" />;
    }
  };
  
  // Tampilkan jawaban bantuan level 2
  const handleViewLevel2Answers = async (submissionId: string) => {
    if (!submissionId) return;
    
    setLoadingL2Answers(true);
    
    try {
      const response = await fetch(`/api/teacher/assistance-level2-answers?submissionId=${submissionId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedL2Answers(data.data as Level2AnswersData);
        } else {
          toast.error("Gagal memuat jawaban bantuan level 2");
        }
      } else {
        toast.error("Gagal memuat jawaban bantuan level 2");
      }
    } catch (error) {
      console.error("Error loading level 2 answers:", error);
      toast.error("Terjadi kesalahan saat memuat jawaban");
    } finally {
      setLoadingL2Answers(false);
    }
  };
  
  // Fungsi untuk mendapatkan status bantuan level 1
  const getLevel1Status = (student: Student) => {
    if (!student.progress?.level1) return "Belum dikerjakan";
    
    if (student.progress.level1.status === "PASSED") {
      return "Lulus";
    } else if (student.progress.level1.status === "FAILED") {
      return "Gagal";
    } else {
      return "Menunggu penilaian";
    }
  };
  
  // Fungsi untuk mendapatkan warna status bantuan level 1
  const getLevel1StatusColor = (student: Student) => {
    if (!student.progress?.level1) return "text-muted-foreground";
    
    if (student.progress.level1.status === "PASSED") {
      return "text-green-600";
    } else if (student.progress.level1.status === "FAILED") {
      return "text-red-600";
    } else {
      return "text-amber-600";
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCcw className="animate-spin h-8 w-8 text-primary" />
        <span className="ml-2">Memuat data siswa...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Kontrol Alur Pembelajaran Siswa</h2>
        <div className="relative w-64">
          <Input
            type="text"
            placeholder="Cari siswa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>Daftar Siswa</CardTitle>
              <CardDescription>Pilih siswa untuk mengatur alur pembelajaran</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Siswa</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-center font-semibold">Percobaan</TableHead>
                      <TableHead className="font-semibold">Bantuan Level 1</TableHead>
                      <TableHead className="font-semibold">Bantuan Level 2</TableHead>
                      <TableHead className="font-semibold">Level Bantuan</TableHead>
                      <TableHead className="text-center font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <UserIcon className="h-8 w-8 text-muted-foreground/50" />
                            <p>Tidak ada siswa untuk ditampilkan</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map(student => (
                        <TableRow 
                          key={student.id}
                          className={`${selectedStudent?.id === student.id ? "bg-muted/50" : ""} hover:bg-muted/30 cursor-pointer transition-colors`}
                          onClick={() => handleSelectStudent(student)}
                        >
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <span className="rounded-full bg-blue-100 p-2">
                                <UserIcon className="h-4 w-4 text-blue-600" />
                              </span>
                              <div>
                                <p className="font-medium text-sm">{student.name}</p>
                                <p className="text-xs text-muted-foreground">{student.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(student.progress)}
                              {student.progress && (
                                <div className="flex flex-col">
                                  <span className="text-xs">
                                    {student.progress.failedAttempts ? 
                                      <span className="text-red-600 font-medium">
                                        {student.progress.failedAttempts} kali gagal
                                      </span> : null
                                    }
                                  </span>
                                  <div className="flex mt-1 gap-1">
                                    <Button
                                      variant={student.progress.lastAttemptPassed ? "default" : "outline"}
                                      size="sm"
                                      className="h-6 text-[10px] px-1.5 min-w-[60px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleQuizStatus(student.id, true);
                                      }}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Lulus
                                    </Button>
                                    <Button
                                      variant={student.progress.lastAttemptPassed === null ? "secondary" : "outline"} 
                                      size="sm"
                                      className="h-6 text-[10px] px-1.5 min-w-[60px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleQuizStatus(student.id, null);
                                      }}
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      On Going
                                    </Button>
                                    <Button
                                      variant={student.progress.lastAttemptPassed === false ? "destructive" : "outline"} 
                                      size="sm"
                                      className="h-6 text-[10px] px-1.5 min-w-[60px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleQuizStatus(student.id, false);
                                      }}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Tidak
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {student.progress?.currentAttempt || 0} / 4
                          </TableCell>
                          <TableCell>
                            {student.progress?.level1 ? (
                              <div>
                                <p className={`text-xs font-medium ${getLevel1StatusColor(student)}`}>
                                  {getLevel1Status(student)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(student.progress.level1.submittedAt).toLocaleDateString()}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Belum dikerjakan</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.progress?.level2 ? (
                              <div className="flex items-center space-x-1">
                                <p className="text-xs font-medium">
                                  {student.progress.level2.status === "PASSED" ? (
                                    <span className="text-green-600">Lulus</span>
                                  ) : student.progress.level2.status === "FAILED" ? (
                                    <span className="text-red-600">Gagal</span>
                                  ) : (
                                    <span className="text-amber-600">Pending</span>
                                  )}
                                </p>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation(); 
                                    handleViewLevel2Answers(student.progress?.level2?.id || '');
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Belum dikerjakan</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.progress?.overrideSystemFlow ? (
                              <span className="text-amber-600 font-medium">
                                {getAssistanceLabel(student.progress.manuallyAssignedLevel)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {getAssistanceLabel(student.progress?.assistanceRequired)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-2 h-7"
                                onClick={() => handleSelectStudent(student)}
                              >
                                <PenSquare className="h-3.5 w-3.5 mr-1" />
                                Atur
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-2 h-7 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/teacher/students/${student.id}/quizzes/${quizId}/submissions`);
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                                Nilai
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Kontrol Alur Pembelajaran</CardTitle>
              <CardDescription>
                {selectedStudent ? `Atur akses untuk ${selectedStudent.name}` : 'Pilih siswa untuk mengatur akses'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedStudent ? (
                <div className="space-y-6">
                  {/* Detail status siswa */}
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="font-semibold text-sm">Status Siswa</h3>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <div className="text-muted-foreground">Percobaan:</div>
                      <div className="font-medium">
                        <span className={`${selectedStudent.progress?.currentAttempt === 4 ? "text-red-600" : "text-blue-600"}`}>
                          {selectedStudent.progress?.currentAttempt || 0}
                        </span>
                        <span className="text-muted-foreground"> / 4</span>
                      </div>
                      
                      {/* <div className="text-muted-foreground">Percobaan Gagal:</div>
                      <div className="font-medium text-red-600">{selectedStudent.progress?.failedAttempts || 0}</div> */}
                      
                      <div className="text-muted-foreground">Status Kuis:</div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          selectedStudent.progress?.lastAttemptPassed === true
                            ? "text-green-600" 
                            : selectedStudent.progress?.lastAttemptPassed === false 
                              ? "text-red-600" 
                              : selectedStudent.progress?.lastAttemptPassed === null
                                ? "text-blue-600"
                                : "text-muted-foreground"
                        }`}>
                          {selectedStudent.progress?.lastAttemptPassed === true
                            ? "Lulus" 
                            : selectedStudent.progress?.lastAttemptPassed === false 
                              ? "Tidak Lulus" 
                              : selectedStudent.progress?.lastAttemptPassed === null
                                ? "On Going"
                                : "Belum Dinilai"}
                        </span>
                      </div>
                      
                      {/* <div className="col-span-2 mt-2">
                        <div className="flex gap-1.5">
                          <Button 
                            size="sm"
                            variant={selectedStudent.progress?.lastAttemptPassed === true ? "default" : "outline"} 
                            className="flex-1 h-8"
                            onClick={() => handleToggleQuizStatus(selectedStudent.id, true)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            Lulus
                          </Button>
                          <Button 
                            size="sm"
                            variant={selectedStudent.progress?.lastAttemptPassed === null ? "secondary" : "outline"} 
                            className="flex-1 h-8"
                            onClick={() => handleToggleQuizStatus(selectedStudent.id, null)}
                          >
                            <Clock className="h-4 w-4 mr-1.5" />
                            On Going
                          </Button>
                          <Button 
                            size="sm"
                            variant={selectedStudent.progress?.lastAttemptPassed === false ? "destructive" : "outline"} 
                            className="flex-1 h-8"
                            onClick={() => handleToggleQuizStatus(selectedStudent.id, false)}
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Tidak
                          </Button>
                        </div>
                      </div> */}
                      
                      <div className="text-muted-foreground">Bantuan Level 1:</div>
                      <div className={`font-medium ${selectedStudent.progress?.level1Completed ? "text-green-600" : "text-red-600"}`}>
                        {selectedStudent.progress?.level1Completed ? "Lulus" : "Belum Lulus"}
                      </div>
                      
                      <div className="text-muted-foreground">Bantuan Level 2:</div>
                      <div className={`font-medium ${selectedStudent.progress?.level2Completed ? "text-green-600" : "text-red-600"}`}>
                        {selectedStudent.progress?.level2Completed ? "Lulus" : "Belum Lulus"}
                      </div>
                      
                      <div className="text-muted-foreground">Bantuan Level 3:</div>
                      <div className={`font-medium ${selectedStudent.progress?.level3Completed ? "text-green-600" : "text-red-600"}`}>
                        {selectedStudent.progress?.level3Completed ? "Selesai" : "Belum Selesai"}
                      </div>
                    </div>
                  </div>
                  
                  {/* <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="override-system" className="font-medium">
                        Override Alur Otomatis
                      </Label>
                      <Switch 
                        id="override-system"
                        checked={overrideSystem} 
                        onCheckedChange={setOverrideSystem}
                        disabled={searching}
                      />
                    </div>
                    
                    <div className={`space-y-4 transition-opacity duration-200 ${overrideSystem ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                      <Label className="block font-medium">Tetapkan Level:</Label>
                      <RadioGroup value={assistanceLevel} onValueChange={setAssistanceLevel} className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="NONE" id="none" />
                          <Label htmlFor="none" className={`${assistanceLevel === "NONE" ? "font-medium" : ""}`}>Kuis Utama</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="ASSISTANCE_LEVEL1" id="level1" />
                          <Label htmlFor="level1" className={`${assistanceLevel === "ASSISTANCE_LEVEL1" ? "font-medium" : ""}`}>Bantuan Level 1</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="ASSISTANCE_LEVEL2" id="level2" />
                          <Label htmlFor="level2" className={`${assistanceLevel === "ASSISTANCE_LEVEL2" ? "font-medium" : ""}`}>Bantuan Level 2</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="ASSISTANCE_LEVEL3" id="level3" />
                          <Label htmlFor="level3" className={`${assistanceLevel === "ASSISTANCE_LEVEL3" ? "font-medium" : ""}`}>Bantuan Level 3</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div> */}
                  
                  {/* <Button 
                    onClick={handleSaveOverride}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Pengaturan"
                    )}
                  </Button>
                  
                  <div className="border-t pt-6 space-y-4">
                    <div className="flex flex-col gap-4">
                      <h3 className="font-medium text-base">Akses Langsung Bantuan</h3>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant={selectedStudent.progress?.level3AccessGranted ? "default" : "outline"} 
                          className="flex-1 h-9"
                          onClick={() => handleGrantLevel3Access(selectedStudent.id, true)}
                        >
                          <PlusCircle className="h-4 w-4 mr-1.5" />
                          Berikan Akses Level 3
                        </Button>
                        
                        <Button 
                          variant={!selectedStudent.progress?.level3AccessGranted ? "secondary" : "outline"} 
                          className="flex-1 h-9"
                          onClick={() => handleGrantLevel3Access(selectedStudent.id, false)}
                        >
                          <X className="h-4 w-4 mr-1.5" />
                          Cabut Akses Level 3
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-3">
                        <div className="rounded-full bg-muted w-2 h-2"></div>
                        <p className="text-sm">
                          Status akses level 3: 
                          <span className={`${selectedStudent.progress?.level3AccessGranted ? "text-green-600" : "text-red-600"} ml-1 font-medium`}>
                            {selectedStudent.progress?.level3AccessGranted ? "Diberikan" : "Tidak Diberikan"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div> */}
                  
                  {/* Tombol Penilaian */}
                  <div className="border-t pt-6 space-y-4">
                    <div className="flex flex-col gap-4">
                      <h3 className="font-medium text-base">Penilaian Siswa</h3>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full h-10"
                          onClick={() => router.push(`/teacher/quizzes/${quizId}/students/${selectedStudent.id}/submissions`)}
                        >
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            Penilaian Kuis Reguler
                          </span>
                        </Button>
                        
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700 text-white w-full h-10"
                          onClick={() => router.push(`/teacher/quizzes/${quizId}/students/${selectedStudent.id}/assistance-level2`)}
                        >
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
                            </svg>
                            Penilaian Bantuan Level 2
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <div className="rounded-full bg-blue-100 p-4 mb-4">
                    <UserIcon className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Belum Ada Siswa Dipilih</h3>
                  <p className="text-muted-foreground mb-6">
                    Pilih siswa dari tabel di sebelah kiri untuk melihat dan mengatur alur pembelajaran
                  </p>
                  <div className="flex justify-center">
                    <div className="flex flex-col gap-3 items-center">
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-sm text-muted-foreground">1. Klik tombol</span>
                        <span className="bg-white px-2 py-1 rounded-md text-sm font-medium shadow-sm">Atur</span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-sm text-muted-foreground">2. Tetapkan status kuis</span>
                        <div className="flex items-center gap-1">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">Lulus</span>
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-medium">On Going</span>
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md text-xs font-medium">Tidak</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-sm text-muted-foreground">3. Atur level bantuan</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modal untuk melihat jawaban level 2 */}
      {selectedL2Answers && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Jawaban Bantuan Level 2</CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setSelectedL2Answers(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {loadingL2Answers ? (
              <div className="flex justify-center py-4">
                <RefreshCcw className="animate-spin h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {selectedL2Answers.answers?.map((answer: SubmissionAnswer, index: number) => (
                  <div key={answer.id} className="border p-3 rounded-md">
                    <p className="font-medium text-sm">Pertanyaan {index + 1}:</p>
                    <p className="text-sm mb-2">{answer.question?.question || "Pertanyaan"}</p>
                    <div className="bg-muted p-2 rounded text-sm">
                      <p>{answer.answerText}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 