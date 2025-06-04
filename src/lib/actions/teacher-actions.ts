"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Mereset percobaan kuis siswa yang gagal
 */
export async function resetStudentQuizAttempts(studentId: string, quizId: string) {
  try {
    const session = await getServerSession(authOptions);
    const teacherId = session?.user?.id;

    if (!teacherId) {
      return {
        success: false,
        message: "Anda harus login sebagai pengajar untuk mereset percobaan siswa"
      };
    }

    // Verifikasi bahwa pengajar memiliki akses ke kuis ini
    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId
      },
      include: {
        class: {
          select: {
            teacherId: true
          }
        }
      }
    });

    // Periksa apakah kuis dan kelasnya ada
    if (!quiz || !quiz.class || quiz.class.teacherId !== teacherId) {
      return {
        success: false,
        message: "Anda tidak memiliki akses untuk mereset percobaan kuis ini"
      };
    }

    // Dapatkan status kuis siswa
    const quizProgress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId: studentId,
          quizId: quizId
        }
      }
    });

    if (!quizProgress) {
      return {
        success: false,
        message: "Status kuis siswa tidak ditemukan"
      };
    }

    // Reset percobaan siswa
    await prisma.studentQuizProgress.update({
      where: {
        id: quizProgress.id
      },
      data: {
        currentAttempt: 0,
        lastAttemptPassed: false,
        failedAttempts: 0,
        assistanceRequired: "NONE",
        level1Completed: false,
        level2Completed: false,
        level3Completed: false,
      }
    });

    // Revalidasi halaman
    revalidatePath(`/teacher/dashboard`);
    revalidatePath(`/teacher/students/${studentId}`);
    revalidatePath(`/teacher/quizzes/${quizId}`);

    return {
      success: true,
      message: "Percobaan kuis siswa berhasil direset",
      data: {
        studentId,
        quizId
      }
    };
  } catch (error) {
    console.error("Error resetting student quiz attempts:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat mereset percobaan siswa"
    };
  }
} 