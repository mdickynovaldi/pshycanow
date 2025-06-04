/**
 * Helper functions untuk mengintegrasikan assistance tracking
 * dengan sistem quiz yang sudah ada
 */

import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@prisma/client";

/**
 * Update assistance accessibility berdasarkan failed attempts setelah quiz submission
 */
export async function updateAssistanceAccessibilityAfterQuizSubmission(
  studentId: string,
  quizId: string,
  submissionStatus: SubmissionStatus,
  currentAttempt: number
) {
  try {
    // Hitung failed attempts
    let failedAttempts = 0;
    if (submissionStatus === SubmissionStatus.FAILED) {
      failedAttempts = currentAttempt;
    } else if (submissionStatus === SubmissionStatus.PENDING) {
      // Untuk pending, failed attempts adalah attempt sebelumnya
      failedAttempts = currentAttempt - 1;
    }

    // Update progress tracking
    await prisma.studentQuizProgress.upsert({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
      update: {
        currentAttempt,
        failedAttempts,
        lastAttemptPassed: submissionStatus === SubmissionStatus.PASSED,
        level1Accessible: failedAttempts >= 1,
        level2Accessible: failedAttempts >= 2,
        level3Accessible: failedAttempts >= 3,
        // Reset mustRetakeMainQuiz jika user baru submit kuis utama
        mustRetakeMainQuiz: false,
        nextStep: null,
      },
      create: {
        studentId,
        quizId,
        currentAttempt,
        failedAttempts,
        lastAttemptPassed: submissionStatus === SubmissionStatus.PASSED,
        level1Accessible: failedAttempts >= 1,
        level2Accessible: failedAttempts >= 2,
        level3Accessible: failedAttempts >= 3,
        mustRetakeMainQuiz: false,
        nextStep: null,
      },
    });

    return true;
  } catch (error) {
    console.error("Error updating assistance accessibility:", error);
    return false;
  }
}

/**
 * Cek apakah user harus mengerjakan bantuan berdasarkan failed attempts
 */
export async function getRequiredAssistanceLevel(
  studentId: string,
  quizId: string
): Promise<1 | 2 | 3 | null> {
  try {
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
    });

    if (!progress) return null;

    // User harus mengerjakan bantuan jika sudah gagal beberapa kali
    // dan belum menyelesaikan bantuan level tersebut
    if (progress.failedAttempts >= 3 && !progress.level3Completed) {
      return 3;
    } else if (progress.failedAttempts >= 2 && !progress.level2Completed) {
      return 2;
    } else if (progress.failedAttempts >= 1 && !progress.level1Completed) {
      return 1;
    }

    return null;
  } catch (error) {
    console.error("Error getting required assistance level:", error);
    return null;
  }
}

/**
 * Cek apakah user dapat mengerjakan kuis utama
 */
export async function canTakeMainQuiz(
  studentId: string,
  quizId: string
): Promise<{
  canTake: boolean;
  mustRetake: boolean;
  reason?: string;
}> {
  try {
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
    });

    if (!progress) {
      // User baru, bisa mengerjakan kuis
      return { canTake: true, mustRetake: false };
    }

    // Jika sudah lulus, tidak perlu mengerjakan lagi
    if (progress.lastAttemptPassed === true) {
      return { 
        canTake: false, 
        mustRetake: false, 
        reason: "Quiz sudah berhasil diselesaikan" 
      };
    }

    // Jika user sudah menyelesaikan bantuan, wajib mengerjakan kuis utama
    if (progress.mustRetakeMainQuiz && progress.canTakeMainQuiz) {
      return { canTake: true, mustRetake: true };
    }

    // Jika user belum menyelesaikan bantuan yang diperlukan
    const requiredLevel = await getRequiredAssistanceLevel(studentId, quizId);
    if (requiredLevel) {
      return { 
        canTake: false, 
        mustRetake: false, 
        reason: `Harus menyelesaikan bantuan level ${requiredLevel} terlebih dahulu` 
      };
    }

    // Default: bisa mengerjakan kuis
    return { canTake: true, mustRetake: false };
  } catch (error) {
    console.error("Error checking if can take main quiz:", error);
    return { canTake: false, mustRetake: false, reason: "Terjadi kesalahan sistem" };
  }
}

/**
 * Middleware untuk mengecek akses ke halaman bantuan
 */
export async function checkAssistanceAccess(
  studentId: string,
  quizId: string,
  assistanceLevel: 1 | 2 | 3
): Promise<{
  hasAccess: boolean;
  isCompleted: boolean;
  reason?: string;
}> {
  try {
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
    });

    if (!progress) {
      return { 
        hasAccess: false, 
        isCompleted: false, 
        reason: "Belum pernah mengerjakan kuis" 
      };
    }

    // Cek apakah sudah diselesaikan
    let isCompleted = false;
    switch (assistanceLevel) {
      case 1:
        isCompleted = progress.level1Completed;
        break;
      case 2:
        isCompleted = progress.level2Completed;
        break;
      case 3:
        isCompleted = progress.level3Completed;
        break;
    }

    if (isCompleted) {
      return { hasAccess: true, isCompleted: true };
    }

    // Cek apakah dapat diakses berdasarkan failed attempts
    let hasAccess = false;
    switch (assistanceLevel) {
      case 1:
        hasAccess = progress.level1Accessible || progress.failedAttempts >= 1;
        break;
      case 2:
        hasAccess = progress.level2Accessible || progress.failedAttempts >= 2;
        break;
      case 3:
        hasAccess = progress.level3Accessible || progress.failedAttempts >= 3;
        break;
    }

    if (!hasAccess) {
      return { 
        hasAccess: false, 
        isCompleted: false, 
        reason: `Bantuan level ${assistanceLevel} belum tersedia. Diperlukan ${assistanceLevel} kali percobaan gagal.` 
      };
    }

    return { hasAccess: true, isCompleted: false };
  } catch (error) {
    console.error("Error checking assistance access:", error);
    return { 
      hasAccess: false, 
      isCompleted: false, 
      reason: "Terjadi kesalahan sistem" 
    };
  }
}

/**
 * Get comprehensive assistance status untuk ditampilkan di UI
 */
export async function getComprehensiveAssistanceStatus(
  studentId: string,
  quizId: string
) {
  try {
    const [progress, mainQuizAccess, requiredLevel] = await Promise.all([
      prisma.studentQuizProgress.findUnique({
        where: {
          studentId_quizId: {
            studentId,
            quizId,
          },
        },
      }),
      canTakeMainQuiz(studentId, quizId),
      getRequiredAssistanceLevel(studentId, quizId),
    ]);

    const [level1Access, level2Access, level3Access] = await Promise.all([
      checkAssistanceAccess(studentId, quizId, 1),
      checkAssistanceAccess(studentId, quizId, 2),
      checkAssistanceAccess(studentId, quizId, 3),
    ]);

    return {
      // Main quiz access
      canTakeMainQuiz: mainQuizAccess.canTake,
      mustRetakeMainQuiz: mainQuizAccess.mustRetake,
      mainQuizReason: mainQuizAccess.reason,

      // Assistance completion status
      level1Completed: progress?.level1Completed || false,
      level2Completed: progress?.level2Completed || false,
      level3Completed: progress?.level3Completed || false,

      // Assistance accessibility
      level1Accessible: level1Access.hasAccess,
      level2Accessible: level2Access.hasAccess,
      level3Accessible: level3Access.hasAccess,

      // Required assistance level
      requiredAssistanceLevel: requiredLevel,

      // Progress info
      currentAttempt: progress?.currentAttempt || 0,
      failedAttempts: progress?.failedAttempts || 0,
      lastAttemptPassed: progress?.lastAttemptPassed,

      // Next step
      nextStep: progress?.nextStep,

      // Timestamps
      level1CompletedAt: progress?.level1CompletedAt,
      level2CompletedAt: progress?.level2CompletedAt,
      level3CompletedAt: progress?.level3CompletedAt,
    };
  } catch (error) {
    console.error("Error getting comprehensive assistance status:", error);
    return null;
  }
}

/**
 * Auto-update assistance accessibility setelah quiz attempt
 * Panggil function ini setiap kali ada quiz submission baru
 */
export async function autoUpdateAssistanceAfterQuizAttempt(
  studentId: string,
  quizId: string,
  submissionStatus: SubmissionStatus,
  currentAttempt: number
) {
  // Update accessibility
  await updateAssistanceAccessibilityAfterQuizSubmission(
    studentId,
    quizId,
    submissionStatus,
    currentAttempt
  );

  // Get updated status
  const status = await getComprehensiveAssistanceStatus(studentId, quizId);
  
  return status;
}
