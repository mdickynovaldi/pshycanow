"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  SubmissionStatus 
} from "@/types";
import { 
  assistanceLevel1Schema, 
  assistanceLevel1SubmissionSchema,
    
} from "@/lib/validations/quiz-assistance";
import * as z from "zod";


// Helper untuk memeriksa akses
async function checkAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  return { success: true, userId: session.user.id, role: session.user.role };
}

// Fungsi untuk membuat bantuan level 1
export async function createAssistanceLevel1(
  data: z.infer<typeof assistanceLevel1Schema>,
  quizId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.TEACHER) {
    return { success: false, message: "Hanya guru yang dapat mengakses fitur ini" };
  }
  
  try {
    // Validasi data
    const validatedData = assistanceLevel1Schema.parse(data);
    
    // Periksa apakah kuis ada
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { assistanceLevel1: true }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Buat atau perbarui bantuan level 1
    let assistance;
    
    if (quiz.assistanceLevel1) {
      // Perbarui bantuan yang ada
      assistance = await prisma.quizAssistanceLevel1.update({
        where: { id: quiz.assistanceLevel1.id },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          questions: {
            deleteMany: {},
            create: validatedData.questions.map((q) => ({
              question: q.question,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || undefined
            }))
          }
        },
        include: {
          questions: true
        }
      });
    } else {
      // Buat bantuan baru
      assistance = await prisma.quizAssistanceLevel1.create({
        data: {
          quizId,
          title: validatedData.title,
          description: validatedData.description,
          questions: {
            create: validatedData.questions.map((q) => ({
              question: q.question,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || undefined
            }))
          }
        },
        include: {
          questions: true
        }
      });
    }
    
    // Revalidasi halaman terkait
    revalidatePath(`/teacher/quizzes/${quizId}/edit`);
    
    return { success: true, data: assistance };
  } catch (error) {
    console.error("Error creating assistance level 1:", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validasi gagal", errors: error.errors };
    }
    
    return { success: false, message: "Terjadi kesalahan saat membuat bantuan level 1" };
  }
}

// Fungsi untuk mendapatkan bantuan level 1
export async function getAssistanceLevel1(
  assistanceId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const assistance = await prisma.quizAssistanceLevel1.findUnique({
      where: { id: assistanceId },
      include: {
        questions: true,
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    if (!assistance) {
      return { success: false, message: "Bantuan level 1 tidak ditemukan" };
    }
    
    return { success: true, data: assistance };
  } catch (error) {
    console.error("Error getting assistance level 1:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil bantuan level 1" };
  }
}

// Fungsi untuk mengirimkan bantuan level 1
export async function submitAssistanceLevel1(
  data: z.infer<typeof assistanceLevel1SubmissionSchema>,
  assistanceId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.STUDENT) {
    return { success: false, message: "Hanya siswa yang dapat mengakses fitur ini" };
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
    
    // Periksa apakah nilai mencukupi (semua harus benar)
    const scorePercentage = (score / totalQuestions) * 100;
    const passed = scorePercentage >= 100; // Semua jawaban harus benar
    
    // Simpan submisi dengan model yang benar
    const submission = await prisma.assistanceLevel1Submission.create({
      data: {
        assistanceId,
        studentId: access.userId,
        status: passed ? SubmissionStatus.PASSED : SubmissionStatus.PENDING,
        answers: {
          create: answersData
        }
      },
      include: {
        answers: true
      }
    });
    
    // Update progress pembelajaran siswa
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId: access.userId,
          quizId: assistance.quizId
        }
      }
    });
    
    if (progress) {
      await prisma.studentQuizProgress.update({
        where: {
          id: progress.id
        },
        data: {
          level1Completed: passed,
          lastAttemptPassed: passed
        }
      });
    } else {
      // Jika belum ada progress, buat baru
      await prisma.studentQuizProgress.create({
        data: {
          studentId: access.userId,
          quizId: assistance.quizId,
          level1Completed: passed,
          lastAttemptPassed: passed,
          currentAttempt: 0
        }
      });
    }
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${assistance.quizId}/assistance/level1`);
    revalidatePath(`/student/quizzes/${assistance.quizId}`);
    
    // Kirim data yang diperlukan untuk UI
    return { 
      success: true, 
      data: {
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        assistanceId: submission.assistanceId,
        studentId: submission.studentId,
        answers: submission.answers,
        // Tambahan data untuk frontend
        score,
        totalQuestions,
        scorePercentage,
        passed,
        correctAnswers,
        explanations
      }
    };
  } catch (error) {
    console.error("Error submitting assistance level 1:", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validasi gagal", errors: error.errors };
    }
    
    return { success: false, message: "Terjadi kesalahan saat mengirimkan bantuan level 1" };
  }
}

// Fungsi untuk mendapatkan submisi bantuan level 1 terbaru
export async function getLatestLevel1Submission(
  assistanceId: string,
  studentId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const submission = await prisma.assistanceLevel1Submission.findFirst({
      where: {
        assistanceId,
        studentId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: true,
        assistance: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!submission) {
      return { success: false, message: "Submisi tidak ditemukan" };
    }

    // Hitung skor dari jawaban yang benar jika submission.score null
    const calculatedScore = submission.score ?? submission.answers.filter(a => a.isCorrect).length;
    const calculatedTotalQuestions = submission.assistance.questions.length;

    return {
      success: true,
      data: {
        ...submission,
        score: calculatedScore,
        totalQuestions: calculatedTotalQuestions,
      },
    };
  } catch (error) {
    console.error("Error getting latest level 1 submission:", error);
    return { success: false, message: "Gagal mengambil submisi terakhir" };
  }
} 