"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { 
  AssistanceLevel1SubmissionInput,
  AssistanceLevel2SubmissionInput,
  assistanceLevel1SubmissionSchema,
  assistanceLevel2SubmissionSchema
} from "@/lib/validations/quiz-assistance";
import { SubmissionStatus, AssistanceRequirement } from "@/types";

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
          currentAttempt: 1,
          maxAttempts: 4,
          lastAttemptPassed: false,
          assistanceRequired: AssistanceRequirement.NONE
        }
      });
    }
    
    return { success: true, data: progress };
  } catch (error) {
    console.error("Error getting student progress:", error);
    return { success: false, message: "Terjadi kesalahan saat mendapatkan progress kuis" };
  }
}

// === LEVEL 1 ASSISTANCE (YES/NO QUIZ) ===

// Mendapatkan bantuan level 1
export async function getAssistanceLevel1(quizId: string) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan progress kuis
    const progressResult = await getStudentProgress(access.userId!, quizId);
    
    if (!progressResult.success) {
      return { success: false, message: progressResult.message };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah bantuan level 1 memang diperlukan
    if (progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL1) {
      return { success: false, message: "Anda tidak memerlukan bantuan level 1 saat ini" };
    }
    
    // Dapatkan kuis dan bantuan level 1
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel1: {
          select: {
            id: true,
            questions: {
              select: {
                id: true,
                text: true,
                correctAnswer: true,
                explanation: true
              }
            }
          }
        }
      }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    if (!quiz.assistanceLevel1) {
      return { success: false, message: "Bantuan level 1 tidak tersedia untuk kuis ini" };
    }
    
    return { 
      success: true, 
      data: {
        id: quiz.assistanceLevel1.id,
        quizId: quiz.id,
        quizTitle: quiz.title,
        questions: quiz.assistanceLevel1.questions,
      }
    };
  } catch (error) {
    console.error("Error fetching assistance level 1:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil bantuan level 1" };
  }
}

// Mengirim jawaban bantuan level 1
export async function submitAssistanceLevel1Answers(data: AssistanceLevel1SubmissionInput) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = assistanceLevel1SubmissionSchema.safeParse(data);
  
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
    
    if (!progressResult.success) {
      return { success: false, message: progressResult.message };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah bantuan level 1 memang diperlukan
    if (progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL1) {
      return { success: false, message: "Anda tidak memerlukan bantuan level 1 saat ini" };
    }
    
    // Dapatkan kuis dan bantuan level 1
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel1: {
          select: {
            id: true,
            questions: {
              select: {
                id: true,
                correctAnswer: true
              }
            }
          }
        }
      }
    });
    
    if (!quiz || !quiz.assistanceLevel1) {
      return { success: false, message: "Bantuan level 1 tidak ditemukan" };
    }
    
    // Validasi jawaban
    const questions = quiz.assistanceLevel1.questions;
    const correctAnswers = questions.filter(q => {
      const userAnswer = answers.find(a => a.questionId === q.id);
      return userAnswer && userAnswer.answer === q.correctAnswer;
    }).length;
    
    const totalQuestions = questions.length;
    const allCorrect = correctAnswers === totalQuestions;
    
    // Simpan submisi
    const submission = await prisma.assistanceLevel1Submission.create({
      data: {
        assistanceId: quiz.assistanceLevel1.id,
        studentId: access.userId!,
        answers: {
          create: answers.map(answer => ({
            questionId: answer.questionId,
            answer: answer.answer,
            isCorrect: questions.find(q => q.id === answer.questionId)?.correctAnswer === answer.answer
          }))
        },
        correctAnswers,
        totalQuestions,
        passed: allCorrect
      }
    });
    
    // Update progress jika lulus
    if (allCorrect) {
      await prisma.studentQuizProgress.update({
        where: { id: progress.id },
        data: {
          level1Completed: true,
          assistanceRequired: AssistanceRequirement.NONE
        }
      });
    } else {
      // Jika gagal, naikkan ke level 2
      await prisma.studentQuizProgress.update({
        where: { id: progress.id },
        data: {
          assistanceRequired: AssistanceRequirement.ASSISTANCE_LEVEL2
        }
      });
    }
    
    revalidatePath(`/student/quizzes/${quizId}`);
    
    return { 
      success: true, 
      data: {
        submission,
        passed: allCorrect,
        correctAnswers,
        totalQuestions
      }
    };
  } catch (error) {
    console.error("Error submitting assistance level 1 answers:", error);
    return { success: false, message: "Terjadi kesalahan saat mengirim jawaban" };
  }
}

// === LEVEL 2 ASSISTANCE (ESSAY QUIZ) ===

// Mendapatkan bantuan level 2
export async function getAssistanceLevel2(quizId: string) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan progress kuis
    const progressResult = await getStudentProgress(access.userId!, quizId);
    
    if (!progressResult.success) {
      return { success: false, message: progressResult.message };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah bantuan level 2 memang diperlukan
    if (progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL2) {
      return { success: false, message: "Anda tidak memerlukan bantuan level 2 saat ini" };
    }
    
    // Dapatkan kuis dan bantuan level 2
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel2: {
          select: {
            id: true,
            questions: {
              select: {
                id: true,
                text: true,
                hint: true
              }
            }
          }
        }
      }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    if (!quiz.assistanceLevel2) {
      return { success: false, message: "Bantuan level 2 tidak tersedia untuk kuis ini" };
    }
    
    return { 
      success: true, 
      data: {
        id: quiz.assistanceLevel2.id,
        quizId: quiz.id,
        quizTitle: quiz.title,
        questions: quiz.assistanceLevel2.questions,
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
    
    if (!progressResult.success) {
      return { success: false, message: progressResult.message };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah bantuan level 2 memang diperlukan
    if (progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL2) {
      return { success: false, message: "Anda tidak memerlukan bantuan level 2 saat ini" };
    }
    
    // Dapatkan kuis dan bantuan level 2
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel2: {
          select: {
            id: true,
            questions: true
          }
        }
      }
    });
    
    if (!quiz || !quiz.assistanceLevel2) {
      return { success: false, message: "Bantuan level 2 tidak ditemukan" };
    }
    
    // Simpan submisi
    const submission = await prisma.assistanceLevel2Submission.create({
      data: {
        assistanceId: quiz.assistanceLevel2.id,
        studentId: access.userId!,
        status: SubmissionStatus.PENDING,
        answers: {
          create: answers.map(answer => ({
            questionId: answer.questionId,
            answerText: answer.answer
          }))
        }
      }
    });
    
    // Update progress (belum selesai, menunggu penilaian)
    await prisma.studentQuizProgress.update({
      where: { id: progress.id },
      data: {
        level2Submitted: true
      }
    });
    
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
export async function getAssistanceLevel3(quizId: string) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan progress kuis
    const progressResult = await getStudentProgress(access.userId!, quizId);
    
    if (!progressResult.success) {
      return { success: false, message: progressResult.message };
    }
    
    const progress = progressResult.data;
    
    // Periksa apakah siswa bisa mengakses bantuan level 3:
    // 1. Jika assistanceRequired adalah ASSISTANCE_LEVEL3, atau
    // 2. Jika level3AccessGranted diatur ke true oleh guru
    if (progress.assistanceRequired !== AssistanceRequirement.ASSISTANCE_LEVEL3 && 
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
    
    if (!progressResult.success) {
      return { success: false, message: progressResult.message };
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
        id: submission.assistance.quiz.class.id,
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
    // Dapatkan submisi
    const submission = await prisma.assistanceLevel2Submission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true
          }
        },
        assistance: {
          include: {
            quiz: {
              select: {
                id: true,
                class: {
                  select: {
                    id: true
                  }
                }
              }
            }
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
        id: submission.assistance.quiz.class.id,
        teacherId: access.userId!
      }
    });
    
    if (!teachesClass) {
      return { success: false, message: "Anda tidak memiliki akses ke submisi ini" };
    }
    
    // Update submisi
    const updatedSubmission = await prisma.assistanceLevel2Submission.update({
      where: { id: submissionId },
      data: {
        status: passed ? SubmissionStatus.PASSED : SubmissionStatus.FAILED,
        feedback
      }
    });
    
    // Update progress siswa
    const progress = await prisma.studentQuizProgress.findFirst({
      where: {
        studentId: submission.student.id,
        quizId: submission.assistance.quiz.id
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