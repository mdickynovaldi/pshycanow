"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  AssistanceRequirement
} from "@/types";
import { 
  assistanceLevel3Schema
} from "@/lib/validations/quiz-assistance";
import * as z from "zod";
import { markLevel3Completed } from "./quiz-progress-actions";

// Helper untuk memeriksa akses
async function checkAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  return { success: true, userId: session.user.id, role: session.user.role };
}

// Fungsi untuk membuat/mengupdate bantuan level 3
export async function createAssistanceLevel3(
  data: z.infer<typeof assistanceLevel3Schema>,
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
    const validatedData = assistanceLevel3Schema.parse(data);
    
    // Periksa apakah kuis ada
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { assistanceLevel3: true }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Buat atau perbarui bantuan level 3
    let assistance;
    
    if (quiz.assistanceLevel3) {
      // Perbarui bantuan yang ada
      assistance = await prisma.quizAssistanceLevel3.update({
        where: { id: quiz.assistanceLevel3.id },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          pdfUrl: validatedData.pdfUrl
        }
      });
    } else {
      // Buat bantuan baru
      assistance = await prisma.quizAssistanceLevel3.create({
        data: {
          quizId,
          title: validatedData.title,
          description: validatedData.description,
          pdfUrl: validatedData.pdfUrl
        }
      });
    }
    
    // Revalidasi halaman terkait
    revalidatePath(`/teacher/quizzes/${quizId}/edit`);
    
    return { success: true, data: assistance };
  } catch (error) {
    console.error("Error creating assistance level 3:", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Validasi gagal", errors: error.errors };
    }
    
    return { success: false, message: "Terjadi kesalahan saat membuat bantuan level 3" };
  }
}

// Fungsi untuk mendapatkan bantuan level 3
export async function getAssistanceLevel3(
  assistanceId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const assistance = await prisma.quizAssistanceLevel3.findUnique({
      where: { id: assistanceId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    if (!assistance) {
      return { success: false, message: "Bantuan level 3 tidak ditemukan" };
    }
    
    return { success: true, data: assistance };
  } catch (error) {
    console.error("Error getting assistance level 3:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil bantuan level 3" };
  }
}

// Fungsi untuk mendapatkan bantuan level 3 berdasarkan ID kuis
export async function getAssistanceLevel3ByQuizId(
  quizId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const assistance = await prisma.quizAssistanceLevel3.findUnique({
      where: { quizId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    if (!assistance) {
      return { success: false, message: "Bantuan level 3 tidak ditemukan" };
    }
    
    return { success: true, data: assistance };
  } catch (error) {
    console.error("Error getting assistance level 3:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil bantuan level 3" };
  }
}

// Fungsi untuk menandai bantuan level 3 sebagai selesai
export async function completeAssistanceLevel3(
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
    // Periksa apakah bantuan level 3 ada
    const assistance = await prisma.quizAssistanceLevel3.findUnique({
      where: { id: assistanceId },
      include: {
        quiz: true
      }
    });
    
    if (!assistance) {
      return { success: false, message: "Bantuan level 3 tidak ditemukan" };
    }
    
    // Periksa apakah sudah pernah menyelesaikan
    const existingCompletion = await prisma.assistanceLevel3Completion.findFirst({
      where: {
        assistanceId,
        studentId: access.userId
      }
    });
    
    if (existingCompletion) {
      return { success: true, message: "Bantuan level 3 sudah pernah diselesaikan", data: existingCompletion };
    }
    
    // Catat penyelesaian
    const completion = await prisma.assistanceLevel3Completion.create({
      data: {
        assistanceId,
        studentId: access.userId
      }
    });
    
    // Tandai sebagai selesai di kemajuan kuis
    await markLevel3Completed(assistance.quizId, access.userId);
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${assistance.quizId}/assistance/level3`);
    revalidatePath(`/student/quizzes/${assistance.quizId}`);
    
    return { success: true, data: completion };
  } catch (error) {
    console.error("Error completing assistance level 3:", error);
    return { success: false, message: "Terjadi kesalahan saat menyelesaikan bantuan level 3" };
  }
}

// Fungsi untuk memeriksa status penyelesaian bantuan level 3
export async function checkLevel3CompletionStatus(
  assistanceId: string
) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Periksa apakah sudah pernah menyelesaikan
    const existingCompletion = await prisma.assistanceLevel3Completion.findFirst({
      where: {
        assistanceId,
        studentId: access.userId
      }
    });
    
    return { 
      success: true, 
      data: {
        completed: Boolean(existingCompletion),
        completionRecord: existingCompletion
      }
    };
  } catch (error) {
    console.error("Error checking level 3 completion status:", error);
    return { success: false, message: "Terjadi kesalahan saat memeriksa status penyelesaian bantuan level 3" };
  }
} 