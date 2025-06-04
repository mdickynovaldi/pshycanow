"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 

  AssistanceLevel2SubmissionInput,
  assistanceLevel1SubmissionSchema,
  assistanceLevel2SubmissionSchema
} from "@/lib/validations/quiz-assistance";
import { SubmissionStatus, AssistanceRequirement } from "@/types";
import { z } from "zod";

// Helper untuk memeriksa apakah pengguna adalah siswa
async function checkStudentAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  if (session.user.role !== UserRole.STUDENT) {
    return { success: false, message: "Hanya siswa yang dapat mengakses fitur ini" };
  }
  
  return { success: true, userId: session.user.id };
}

// Helper untuk memeriksa apakah pengguna adalah guru
async function checkTeacherAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    return { success: false, message: "Hanya guru yang dapat mengakses fitur ini" };
  }
  
  return { success: true, userId: session.user.id };
}

// Helper untuk mendapatkan progress kuis siswa
async function getStudentProgress(studentId: string, quizId: string) {
  try {
    let progress = await prisma.studentQuizProgress.findFirst({
      where: {
        studentId,
        quizId
      }
    });
    
    // Jika belum ada, buat record baru
    if (!progress) {
      progress = await prisma.studentQuizProgress.create({
        data: {
          studentId,
          quizId,
          currentAttempt: 0,
          assistanceRequired: AssistanceRequirement.NONE,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false,
        }
      });
    }
    
    // Set nextStep berdasarkan status bantuan jika tidak ada
    if (!progress.nextStep && progress.level2Completed && progress.assistanceRequired === AssistanceRequirement.NONE) {
      // Jika level 2 sudah selesai dan tidak ada bantuan yang diperlukan, 
      // atur nextStep untuk mencoba kuis utama lagi
      await prisma.studentQuizProgress.update({
        where: { id: progress.id },
        data: { nextStep: "TRY_MAIN_QUIZ_AGAIN" }
      });
      
      // Refresh progress data
      progress = await prisma.studentQuizProgress.findFirst({
        where: {
          studentId,
          quizId
        }
      });
    }
    
    return { success: true, data: progress };
  } catch (error) {
    console.error("Error getting student progress:", error);
    return { success: false, message: "Terjadi kesalahan saat mendapatkan progress kuis", data: null };
  }
}

// === LEVEL 1 ASSISTANCE (YES/NO QUIZ) ===

// Mendapatkan bantuan level 1
export async function getAssistanceLevel1(quizId: string, skipValidation = false) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    console.log(`[getAssistanceLevel1] Mencoba mendapatkan bantuan level 1 untuk kuis ${quizId}`);
    
    // Dapatkan progress kuis
    const progressResult = await getStudentProgress(access.userId!, quizId);
    
    if (!progressResult.success || !progressResult.data) {
      console.log(`[getAssistanceLevel1] Gagal mendapatkan progress: ${progressResult.message}`);
      return { success: false, message: progressResult.message || "Gagal mendapatkan progress siswa" };
    }
    
    const progress = progressResult.data;
    console.log(`[getAssistanceLevel1] Progress siswa:`, {
      currentAttempt: progress.currentAttempt,
      assistanceRequired: progress.assistanceRequired
    });
    
    // Tambahkan kembali validasi ketat untuk memastikan siswa hanya bisa akses setelah gagal
    if (!skipValidation && progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL1) {
      console.log(`[getAssistanceLevel1] Siswa belum memerlukan bantuan level 1. Status: ${progress.assistanceRequired}`);
      return { success: false, message: "Anda perlu gagal terlebih dahulu pada percobaan pertama kuis utama untuk dapat mengakses bantuan level 1" };
    }
    
    // Dapatkan kuis dan bantuan level 1
    const quizWithAssistance1 = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel1: { 
          include: { 
            questions: true
          }
        }
      }
    });
    
    if (!quizWithAssistance1) {
      console.log(`[getAssistanceLevel1] Kuis dengan ID ${quizId} tidak ditemukan`);
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    if (!quizWithAssistance1.assistanceLevel1) {
      console.log(`[getAssistanceLevel1] Bantuan level 1 tidak dikonfigurasi untuk kuis ${quizId}`);
      return { success: false, message: "Bantuan level 1 tidak tersedia untuk kuis ini" };
    }
    
    console.log(`[getAssistanceLevel1] Berhasil mendapatkan bantuan level 1 dengan ID ${quizWithAssistance1.assistanceLevel1.id} (${quizWithAssistance1.assistanceLevel1.questions.length} pertanyaan)`);
    
    return { 
      success: true, 
      data: {
        id: quizWithAssistance1.assistanceLevel1.id,
        quizId: quizWithAssistance1.id, 
        quizTitle: quizWithAssistance1.title, 
        questions: quizWithAssistance1.assistanceLevel1.questions,
      }
    };
  } catch (error) {
    console.error("Error fetching assistance level 1:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil bantuan level 1" };
  }
}

// Mengirim jawaban bantuan level 1
export async function submitAssistanceLevel1(
  data: z.infer<typeof assistanceLevel1SubmissionSchema>,
  assistanceId: string
) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Validasi data
    const validatedData = assistanceLevel1SubmissionSchema.parse(data);
    
    // Periksa apakah bantuan level 1 ada
    const assistance = await prisma.quizAssistanceLevel1.findUnique({
      where: { id: assistanceId },
      include: {
        questions: true,
        quiz: true
      }
    });
    
    if (!assistance) {
      return { success: false, message: "Bantuan level 1 tidak ditemukan" };
    }
    
    // Hitung skor dan persiapkan data
    let score = 0;
    const totalQuestions = assistance.questions.length;
    const correctAnswers: Record<string, boolean> = {};
    const explanations: Record<string, string> = {};
    
    // Menyimpan jawaban benar dan penjelasan untuk frontend
    assistance.questions.forEach(questionItem => {
      correctAnswers[questionItem.id] = questionItem.correctAnswer;
      if (questionItem.explanation) {
        explanations[questionItem.id] = questionItem.explanation;
      }
    });
    
    // Verifikasi jawaban dan buat data untuk disimpan
    const answersData = [];
    
    for (const answerItem of validatedData.answers) {
      const questionId = answerItem.questionId;
      const answer = answerItem.answer;
      
      const question = assistance.questions.find(q => q.id === questionId);
      const isCorrect = question ? answer === question.correctAnswer : false;
      
      if (isCorrect) {
        score++;
      }
      
      answersData.push({
        questionId: questionId,
        answer: answer,
        isCorrect: isCorrect
      });
    }
    
    const scorePercentage = Math.round((score / totalQuestions) * 100);
    const passingScore = 100; // Semua harus benar
    const allCorrect = score === totalQuestions;
    
    // Simpan submisi
    const submission = await prisma.assistanceLevel1Submission.create({
      data: {
        assistanceId: assistanceId,
        studentId: access.userId!,
        status: allCorrect ? SubmissionStatus.PASSED : SubmissionStatus.FAILED,
        score: scorePercentage
      }
    });
    
    // Simpan jawaban siswa
    for (const answer of answersData) {
      await prisma.assistanceAnswerYesNo.create({
        data: {
          submissionId: submission.id,
          questionId: answer.questionId,
          answer: answer.answer,
          isCorrect: answer.isCorrect
        }
      });
    }
    
    // Update progress siswa
    const quizId = assistance.quizId;
    
    // Dapatkan progress siswa
    const progressData = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId: access.userId!,
          quizId: quizId
        }
      }
    });
    
    if (!progressData) {
      return { success: false, message: "Data progress kuis tidak ditemukan" };
    }
    
    // Update progress berdasarkan hasil
    if (allCorrect) {
      // Jika semua jawaban benar, tandai level 1 selesai dan arahkan kembali ke kuis utama
      await prisma.studentQuizProgress.update({
        where: { id: progressData.id },
        data: {
          level1Completed: true,
          assistanceRequired: AssistanceRequirement.NONE,
          nextStep: "TRY_MAIN_QUIZ_AGAIN"
        }
      });
      
      // Log keberhasilan
      console.log(`Siswa ${access.userId} berhasil menyelesaikan bantuan level 1 untuk kuis ${quizId}. Mengarahkan kembali ke kuis utama.`);
    }
    
    // Revalidasi path terkait
    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/student/quizzes/${quizId}/assistance/level1`);
    
    return { 
      success: true, 
      data: {
        submissionId: submission.id,
        passed: allCorrect,
        score: scorePercentage,
        correctAnswers,
        explanations,
        passingScore,
        totalQuestions
      } 
    };
  } catch (error) {
    console.error("Error submitting assistance level 1:", error);
    return { success: false, message: "Terjadi kesalahan saat mengirimkan bantuan level 1" };
  }
}

// === LEVEL 2 ASSISTANCE (ESSAY QUIZ) ===

// Mendapatkan bantuan level 2
export async function getAssistanceLevel2(quizId: string, skipValidation = false) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan progress kuis
    const progressResult = await getStudentProgress(access.userId!, quizId);
    
    if (!progressResult.success || !progressResult.data) {
      return { success: false, message: progressResult.message || "Gagal mendapatkan progress siswa" };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah bantuan level 2 memang diperlukan
    if (!skipValidation && progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL2) {
      return { success: false, message: "Anda tidak memerlukan bantuan level 2 saat ini" };
    }
    
    // Dapatkan kuis dan bantuan level 2
    const quizWithAssistance2 = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel2: { 
          include: { 
            questions: true
          }
        }
      }
    });
    
    if (!quizWithAssistance2) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    if (!quizWithAssistance2.assistanceLevel2) {
      return { success: false, message: "Bantuan level 2 tidak tersedia untuk kuis ini" };
    }
    
    return { 
      success: true, 
      data: {
        id: quizWithAssistance2.assistanceLevel2.id,
        quizId: quizWithAssistance2.id, 
        quizTitle: quizWithAssistance2.title, 
        questions: quizWithAssistance2.assistanceLevel2.questions,
      }
    };
  } catch (error) {
    console.error("Error fetching assistance level 2:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil bantuan level 2" };
  }
}

// Mengirim jawaban bantuan level 2
export async function submitAssistanceLevel2Answers(data: AssistanceLevel2SubmissionInput) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = assistanceLevel2SubmissionSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Data tidak valid",
      errors: validationResult.error.format()
    };
  }
  
  const { quizId, answers } = validationResult.data;
  
  try {
    // Dapatkan progress kuis
    const progressResult = await getStudentProgress(access.userId!, quizId);
    
    if (!progressResult.success || !progressResult.data) {
      return { success: false, message: progressResult.message || "Gagal mendapatkan progress siswa" };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah bantuan level 2 memang diperlukan
    if (progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL2) {
      return { success: false, message: "Anda tidak memerlukan bantuan level 2 saat ini" };
    }
    
    // Dapatkan kuis dan bantuan level 2 untuk validasi
    const quizDataForL2Validation = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel2: {
          select: {
            id: true
            // questions tidak perlu di-load di sini karena jawaban essay tidak divalidasi otomatis saat submit
          }
        }
      }
    });

    if (!quizDataForL2Validation || !quizDataForL2Validation.assistanceLevel2) {
      return { success: false, message: "Bantuan level 2 tidak ditemukan untuk submisi" };
    }
    
    // Simpan submisi
    const submission = await prisma.assistanceLevel2Submission.create({
      data: {
        assistanceId: quizDataForL2Validation.assistanceLevel2.id,
        studentId: access.userId!,
        status: SubmissionStatus.PENDING,
        answers: {
          create: answers.map(answerData => ({
            questionId: answerData.questionId,
            answerText: answerData.answerText
          }))
        }
      }
    });
    
    // Update progress (belum selesai, menunggu penilaian)
    // 'level2Submitted' mungkin tidak ada, jadi kita tidak set itu di sini.
    // Status PENDING pada submission sudah cukup.
    // Progress akan diupdate setelah penilaian guru.
    
    revalidatePath(`/student/quizzes/${quizId}`);
    
    return { 
      success: true, 
      data: submission
    };
  } catch (error) {
    console.error("Error submitting assistance level 2 answers:", error);
    return { success: false, message: "Terjadi kesalahan saat mengirim jawaban" };
  }
}

// === LEVEL 3 ASSISTANCE (PDF MATERIAL) ===

// Mendapatkan bantuan level 3
export async function getAssistanceLevel3(quizId: string, skipValidation = false) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan progress kuis
    const progressResult = await getStudentProgress(access.userId!, quizId);
    
    if (!progressResult.success || !progressResult.data) {
      return { success: false, message: progressResult.message || "Gagal mendapatkan progress siswa" };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah siswa bisa mengakses bantuan level 3:
    // 1. Jika skipValidation=true, bypass pemeriksaan
    // 2. Jika assistanceRequired adalah ASSISTANCE_LEVEL3, atau
    // 3. Jika level3AccessGranted diatur ke true oleh guru
    if (!skipValidation && 
        progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL3 && 
        !progress.level3AccessGranted) {
      return { success: false, message: "Anda tidak memerlukan bantuan level 3 saat ini" };
    }
    
    // Dapatkan kuis dan bantuan level 3
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel3: true
      }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    if (!quiz.assistanceLevel3) {
      return { success: false, message: "Bantuan level 3 tidak tersedia untuk kuis ini" };
    }
    
    return { 
      success: true, 
      data: {
        id: quiz.assistanceLevel3.id,
        quizId: quiz.id,
        quizTitle: quiz.title,
        title: quiz.assistanceLevel3.title,
        description: quiz.assistanceLevel3.description,
        pdfUrl: quiz.assistanceLevel3.pdfUrl
      }
    };
  } catch (error) {
    console.error("Error fetching assistance level 3:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil bantuan level 3" };
  }
}

// Menyelesaikan bantuan level 3
export async function completeAssistanceLevel3(quizId: string) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan progress kuis
    const progressResult = await getStudentProgress(access.userId!, quizId);
    
    if (!progressResult.success || !progressResult.data) {
      return { success: false, message: progressResult.message || "Gagal mendapatkan progress siswa" };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah bantuan level 3 memang diperlukan
    if (progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL3) {
      return { success: false, message: "Anda tidak memerlukan bantuan level 3 saat ini" };
    }
    
    // Dapatkan kuis dan bantuan level 3
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel3: true
      }
    });
    
    if (!quiz || !quiz.assistanceLevel3) {
      return { success: false, message: "Bantuan level 3 tidak ditemukan" };
    }
    
    // Simpan completion record
    const completion = await prisma.assistanceLevel3Completion.create({
      data: {
        assistanceId: quiz.assistanceLevel3.id,
        studentId: access.userId!
      }
    });
    
    // Update progress
    await prisma.studentQuizProgress.update({
      where: { id: progress.id },
      data: {
        level3Completed: true,
        assistanceRequired: AssistanceRequirement.NONE
      }
    });
    
    revalidatePath(`/student/quizzes/${quizId}`);
    
    return { 
      success: true, 
      data: completion
    };
  } catch (error) {
    console.error("Error completing assistance level 3:", error);
    return { success: false, message: "Terjadi kesalahan saat menyelesaikan bantuan level 3" };
  }
}

// === TEACHER ACTIONS ===

// Mendapatkan daftar submisi level 2 yang perlu dinilai
export async function getPendingLevel2Submissions() {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan kelas-kelas yang diajar oleh guru
    const classes = await prisma.class.findMany({
      where: {
        teacherId: access.userId!
      },
      select: {
        id: true
      }
    });
    
    const classIds = classes.map(c => c.id);
    
    if (classIds.length === 0) {
      return { 
        success: true, 
        data: [],
        message: "Anda belum membuat kelas" 
      };
    }
    
    // Dapatkan kuis-kuis dari kelas yang diajar
    const quizzes = await prisma.quiz.findMany({
      where: {
        classId: {
          in: classIds
        }
      },
      select: {
        id: true,
        assistanceLevel2: {
          select: {
            id: true
          }
        }
      }
    });
    
    const assistanceLevel2Ids = quizzes
      .filter(q => q.assistanceLevel2)
      .map(q => q.assistanceLevel2!.id);
    
    if (assistanceLevel2Ids.length === 0) {
      return { 
        success: true, 
        data: [],
        message: "Tidak ada bantuan level 2 yang dikonfigurasi" 
      };
    }
    
    // Dapatkan submisi yang menunggu penilaian
    const submissions = await prisma.assistanceLevel2Submission.findMany({
      where: {
        assistanceId: {
          in: assistanceLevel2Ids
        },
        status: SubmissionStatus.PENDING
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        assistance: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                class: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error("Error fetching pending level 2 submissions:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil submisi" };
  }
}

// Mendapatkan detail submisi level 2
export async function getAssistanceLevel2Submission(submissionId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan submisi
    const submission = await prisma.assistanceLevel2Submission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        assistance: {
          include: {
            questions: true,
            quiz: {
              select: {
                id: true,
                title: true,
                class: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      }
    });
    
    if (!submission) {
      return { success: false, message: "Submisi tidak ditemukan" };
    }
    
    // Periksa apakah guru mengajar kelas tersebut
    const teachesClass = await prisma.class.findFirst({
      where: {
        id: submission.assistance.quiz.class?.id,
        teacherId: access.userId!
      }
    });
    
    if (!teachesClass) {
      return { success: false, message: "Anda tidak memiliki akses ke submisi ini" };
    }
    
    return { success: true, data: submission };
  } catch (error) {
    console.error("Error fetching level 2 submission:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil detail submisi" };
  }
}

// Menilai submisi level 2
export async function gradeAssistanceLevel2Submission(
  submissionId: string, 
  passed: boolean, 
  feedback: string,
  goToLevel3: boolean = false
) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan submisi dasar, termasuk assistanceId
    const submission = await prisma.assistanceLevel2Submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        assistanceId: true,
        studentId: true
      }
    });
    
    if (!submission) {
      return { success: false, message: "Submisi tidak ditemukan" };
    }

    // Dapatkan detail relasi assistance -> quiz -> class secara terpisah menggunakan submission.assistanceId
    const relatedAssistance = await prisma.quizAssistanceLevel2.findUnique({
        where: { id: submission.assistanceId },
        include: { 
            quiz: { 
                include: { 
                    class: { select: { id: true, teacherId: true } } 
                }
            }
        }
    });

    if (!relatedAssistance?.quiz?.class) {
        return { success: false, message: "Detail relasi kuis atau kelas tidak ditemukan untuk bantuan ini." };
    }
    
    // Periksa apakah guru mengajar kelas tersebut
    if (relatedAssistance.quiz.class.teacherId !== access.userId!) {
      return { success: false, message: "Anda tidak memiliki akses untuk menilai submisi dari kelas ini." };
    }
    
    // Update submisi
    const updatedSubmission = await prisma.assistanceLevel2Submission.update({
      where: { id: submission.id },
      data: {
        status: passed ? SubmissionStatus.PASSED : SubmissionStatus.FAILED,
        feedback
      }
    });
    
    // Update progress siswa
    const progress = await prisma.studentQuizProgress.findFirst({
      where: {
        studentId: submission.studentId,
        quizId: relatedAssistance.quiz.id
      }
    });
    
    if (progress) {
      if (passed) {
        // Jika lulus, reset assistance required
        await prisma.studentQuizProgress.update({
          where: { id: progress.id },
          data: {
            level2Completed: true,
            assistanceRequired: AssistanceRequirement.NONE
          }
        });
      } else if (goToLevel3) {
        // Jika tidak lulus dan guru memilih untuk mengarahkan ke level 3
        await prisma.studentQuizProgress.update({
          where: { id: progress.id },
          data: {
            level2Completed: false,
            assistanceRequired: AssistanceRequirement.ASSISTANCE_LEVEL3,
            level3AccessGranted: true
          }
        });
      } else {
        // Jika tidak lulus dan tetap di level 2
        await prisma.studentQuizProgress.update({
          where: { id: progress.id },
          data: {
            level2Completed: false,
            assistanceRequired: AssistanceRequirement.ASSISTANCE_LEVEL2
          }
        });
      }
    }
    
    revalidatePath(`/teacher/assistances`);
    revalidatePath(`/teacher/assistances/${submissionId}`);
    
    return { success: true, data: updatedSubmission };
  } catch (error) {
    console.error("Error grading level 2 submission:", error);
    return { success: false, message: "Terjadi kesalahan saat menilai submisi" };
  }
}

// Mendapatkan riwayat submisi level 2 untuk siswa
export async function getAssistanceLevel2SubmissionHistory(quizId: string) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan bantuan level 2 untuk kuis ini
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel2: true
      }
    });
    
    if (!quiz || !quiz.assistanceLevel2) {
      return { success: true, data: [] };
    }
    
    // Dapatkan semua submisi bantuan level 2 oleh siswa untuk bantuan ini
    const submissions = await prisma.assistanceLevel2Submission.findMany({
      where: {
        assistanceId: quiz.assistanceLevel2.id,
        studentId: access.userId!
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error("Error fetching level 2 submission history:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil riwayat submisi bantuan level 2" };
  }
} 