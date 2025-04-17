"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  AssistanceRequirement, 
  SubmissionStatus 
} from "../../types";
import { 
  assistanceLevel2Schema, 
  assistanceLevel2SubmissionSchema,
  assistanceGradingSchema
} from "../../lib/validations/quiz-assistance";
import * as z from "zod";
import { markLevel2Completed } from "./quiz-progress-actions";

// Helper untuk memeriksa akses
async function checkAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  // Type assertion karena NextAuth session.user seharusnya memiliki id dan role yang ditambahkan
  // di callback pada auth.ts
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  
  return { success: true, userId, role: userRole };
}

// Fungsi untuk membuat bantuan level 2
export async function createAssistanceLevel2(
  data: z.infer<typeof assistanceLevel2Schema>,
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
    const validatedData = assistanceLevel2Schema.parse(data);
    
    // Periksa apakah kuis ada
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { assistanceLevel2: true }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Buat atau perbarui bantuan level 2
    let assistance;
    
    if (quiz.assistanceLevel2) {
      // Perbarui bantuan yang ada
      assistance = await prisma.quizAssistanceLevel2.update({
        where: { id: quiz.assistanceLevel2.id },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          questions: {
            deleteMany: {},
            create: validatedData.questions.map((question) => ({
              question: question.question,
              hint: question.hint || "",
              correctAnswer: question.correctAnswer
            }))
          }
        },
        include: {
          questions: true
        }
      });
    } else {
      // Buat bantuan baru
      assistance = await prisma.quizAssistanceLevel2.create({
        data: {
          quizId,
          title: validatedData.title,
          description: validatedData.description,
          questions: {
            create: validatedData.questions.map((question) => ({
              question: question.question,
              hint: question.hint || "",
              correctAnswer: question.correctAnswer
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
    console.error("Error creating assistance level 2:", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validasi gagal", errors: error.errors };
    }
    
    return { success: false, message: "Terjadi kesalahan saat membuat bantuan level 2" };
  }
}

// Fungsi untuk mendapatkan bantuan level 2
export async function getAssistanceLevel2(
  assistanceId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const assistance = await prisma.quizAssistanceLevel2.findUnique({
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
      return { success: false, message: "Bantuan level 2 tidak ditemukan" };
    }
    
    return { success: true, data: assistance };
  } catch (error) {
    console.error("Error getting assistance level 2:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil bantuan level 2" };
  }
}

// Fungsi untuk mengirimkan bantuan level 2
export async function submitAssistanceLevel2(
  data: z.infer<typeof assistanceLevel2SubmissionSchema>,
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
    const validatedData = assistanceLevel2SubmissionSchema.parse(data);
    
    // Periksa apakah bantuan level 2 ada
    const assistance = await prisma.quizAssistanceLevel2.findUnique({
      where: { id: assistanceId },
      include: {
        questions: true,
        quiz: true
      }
    });
    
    if (!assistance) {
      return { success: false, message: "Bantuan level 2 tidak ditemukan" };
    }
    
    // Simpan submisi
    const submission = await prisma.assistanceLevel2Submission.create({
      data: {
        assistanceId,
        studentId: access.userId as string,
        status: SubmissionStatus.PENDING,
        // Buat koneksi untuk answers
        answers: {
          create: validatedData.answers.map(answer => ({
            answerText: answer.answerText,
            questionId: answer.questionId
          }))
        }
      }
    });
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${assistance.quizId}/assistance/level2`);
    revalidatePath(`/student/quizzes/${assistance.quizId}`);
    revalidatePath(`/teacher/assistances`);
    
    return { success: true, data: submission };
  } catch (error) {
    console.error("Error submitting assistance level 2:", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validasi gagal", errors: error.errors };
    }
    
    return { success: false, message: "Terjadi kesalahan saat mengirimkan bantuan level 2" };
  }
}

// Fungsi untuk menilai submisi bantuan level 2
export async function gradeAssistanceLevel2(
  data: z.infer<typeof assistanceGradingSchema>,
  submissionId: string
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
    const validatedData = assistanceGradingSchema.parse(data);
    
    // Periksa apakah submisi ada
    const submission = await prisma.assistanceLevel2Submission.findUnique({
      where: { id: submissionId },
      include: {
        assistance: {
          include: {
            quiz: true
          }
        }
      }
    });
    
    if (!submission) {
      return { success: false, message: "Submisi tidak ditemukan" };
    }
    
    // Perbarui submisi dengan feedback
    const updatedSubmission = await prisma.assistanceLevel2Submission.update({
      where: { id: submissionId },
      data: {
        feedback: validatedData.feedback,
        // Tentukan status berdasarkan apakah semua jawaban benar
        status: validatedData.answers.every(a => a.isCorrect) 
          ? SubmissionStatus.PASSED 
          : SubmissionStatus.FAILED,
        // Tidak bisa menggunakan gradedAt karena tidak ada di schema Prisma
      }
    });
    
    // Jika semua jawaban benar, tandai level 2 sebagai selesai
    if (validatedData.answers.every(a => a.isCorrect)) {
      await markLevel2Completed(
        submission.assistance.quizId, 
        submission.studentId
      );
    }
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${submission.assistance.quizId}/assistance/level2`);
    revalidatePath(`/student/quizzes/${submission.assistance.quizId}`);
    revalidatePath(`/teacher/assistances`);
    revalidatePath(`/teacher/assistances/${submissionId}`);
    
    return { success: true, data: updatedSubmission };
  } catch (error) {
    console.error("Error grading assistance level 2:", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validasi gagal", errors: error.errors };
    }
    
    return { success: false, message: "Terjadi kesalahan saat menilai bantuan level 2" };
  }
}

// Fungsi untuk mendapatkan submisi bantuan level 2 terbaru
export async function getLatestLevel2Submission(
  assistanceId: string,
  studentId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const submissions = await prisma.assistanceLevel2Submission.findMany({
      where: {
        assistanceId,
        studentId: studentId || (access.userId as string) || ""
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1
    });
    
    if (submissions.length === 0) {
      return { success: true, data: null };
    }
    
    // Dapatkan bantuan level 2 untuk informasi tambahan
    const assistance = await prisma.quizAssistanceLevel2.findUnique({
      where: { id: assistanceId },
      include: {
        questions: true
      }
    });
    
    if (!assistance) {
      return { success: false, message: "Bantuan level 2 tidak ditemukan" };
    }
    
    const submission = submissions[0];
    
    // Petakan jawaban dari format database ke format yang diharapkan frontend
    // Pastikan data ini kompatibel dengan AssistanceLevel2Submission di frontend
    return { 
      success: true, 
      data: {
        ...submission,
        hints: assistance.questions.reduce((acc, question) => {
          acc[question.id] = question.hint || "";
          return acc;
        }, {} as Record<string, string>),
        correctAnswers: assistance.questions.reduce((acc, question) => {
          acc[question.id] = question.correctAnswer;
          return acc;
        }, {} as Record<string, string>)
      }
    };
  } catch (error) {
    console.error("Error getting latest level 2 submission:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil submisi bantuan level 2 terbaru" };
  }
}

// Fungsi untuk mendapatkan semua submisi level 2 yang perlu dinilai
export async function getPendingLevel2Submissions() {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.TEACHER) {
    return { success: false, message: "Hanya guru yang dapat mengakses fitur ini" };
  }
  
  try {
    const submissions = await prisma.assistanceLevel2Submission.findMany({
      where: {
        status: SubmissionStatus.PENDING
      },
      include: {
        assistance: {
          include: {
            quiz: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error("Error getting pending level 2 submissions:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil submisi level 2 yang perlu dinilai" };
  }
} 