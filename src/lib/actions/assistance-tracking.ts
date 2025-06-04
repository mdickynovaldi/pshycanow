/**
 * Library functions untuk tracking penyelesaian bantuan kuis
 * dan menentukan kapan user dapat mengerjakan kuis utama
 */

import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@prisma/client";

/**
 * Interface untuk status bantuan
 */
export interface AssistanceStatus {
  level1Completed: boolean;
  level2Completed: boolean;
  level3Completed: boolean;
  level1Accessible: boolean;
  level2Accessible: boolean;
  level3Accessible: boolean;
  mustRetakeMainQuiz: boolean;
  canTakeMainQuiz: boolean;
  nextStep: string | null;
}

/**
 * Mengupdate status penyelesaian bantuan level 1
 */
export async function markAssistanceLevel1Completed(
  studentId: string,
  quizId: string,
  submissionId: string
): Promise<boolean> {
  try {
    // Update submission sebagai completed
    await prisma.assistanceLevel1Submission.update({
      where: { id: submissionId },
      data: {
        isCompleted: true,
        status: SubmissionStatus.PASSED,
      },
    });

    // Update progress tracking
    await prisma.studentQuizProgress.upsert({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
      update: {
        level1Completed: true,
        level1CompletedAt: new Date(),
        mustRetakeMainQuiz: true,
        canTakeMainQuiz: true,
        nextStep: "TRY_MAIN_QUIZ_AGAIN",
      },
      create: {
        studentId,
        quizId,
        level1Completed: true,
        level1CompletedAt: new Date(),
        mustRetakeMainQuiz: true,
        canTakeMainQuiz: true,
        nextStep: "TRY_MAIN_QUIZ_AGAIN",
      },
    });

    return true;
  } catch (error) {
    console.error("Error marking assistance level 1 as completed:", error);
    return false;
  }
}

/**
 * Mengupdate status penyelesaian bantuan level 2
 */
export async function markAssistanceLevel2Completed(
  studentId: string,
  quizId: string,
  submissionId: string,
  isApproved: boolean = false
): Promise<boolean> {
  try {
    // Update submission sebagai completed
    await prisma.assistanceLevel2Submission.update({
      where: { id: submissionId },
      data: {
        isCompleted: true,
        isApproved,
        status: isApproved ? SubmissionStatus.PASSED : SubmissionStatus.PENDING,
      },
    });

    // Update progress tracking hanya jika approved
    if (isApproved) {
      await prisma.studentQuizProgress.upsert({
        where: {
          studentId_quizId: {
            studentId,
            quizId,
          },
        },
        update: {
          level2Completed: true,
          level2CompletedAt: new Date(),
          mustRetakeMainQuiz: true,
          canTakeMainQuiz: true,
          nextStep: "TRY_MAIN_QUIZ_AGAIN",
        },
        create: {
          studentId,
          quizId,
          level2Completed: true,
          level2CompletedAt: new Date(),
          mustRetakeMainQuiz: true,
          canTakeMainQuiz: true,
          nextStep: "TRY_MAIN_QUIZ_AGAIN",
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error marking assistance level 2 as completed:", error);
    return false;
  }
}

/**
 * Mengupdate status penyelesaian bantuan level 3
 */
export async function markAssistanceLevel3Completed(
  studentId: string,
  quizId: string,
  assistanceId: string,
  readingTime?: number
): Promise<boolean> {
  try {
    // Update completion record
    await prisma.assistanceLevel3Completion.upsert({
      where: {
        assistanceId_studentId: {
          assistanceId,
          studentId,
        },
      },
      update: {
        isCompleted: true,
        readingTime,
      },
      create: {
        assistanceId,
        studentId,
        isCompleted: true,
        readingTime,
      },
    });

    // Update progress tracking
    await prisma.studentQuizProgress.upsert({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
      update: {
        level3Completed: true,
        level3CompletedAt: new Date(),
        mustRetakeMainQuiz: true,
        canTakeMainQuiz: true,
        nextStep: "TRY_MAIN_QUIZ_AGAIN",
      },
      create: {
        studentId,
        quizId,
        level3Completed: true,
        level3CompletedAt: new Date(),
        mustRetakeMainQuiz: true,
        canTakeMainQuiz: true,
        nextStep: "TRY_MAIN_QUIZ_AGAIN",
      },
    });

    return true;
  } catch (error) {
    console.error("Error marking assistance level 3 as completed:", error);
    return false;
  }
}

/**
 * Mengecek status bantuan dan menentukan apakah user dapat mengerjakan kuis utama
 */
export async function getAssistanceStatus(
  studentId: string,
  quizId: string
): Promise<AssistanceStatus> {
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
        level1Completed: false,
        level2Completed: false,
        level3Completed: false,
        level1Accessible: false,
        level2Accessible: false,
        level3Accessible: false,
        mustRetakeMainQuiz: false,
        canTakeMainQuiz: true,
        nextStep: null,
      };
    }

    // Tentukan accessibility berdasarkan failed attempts
    const level1Accessible = progress.failedAttempts >= 1 && !progress.level1Completed;
    const level2Accessible = progress.failedAttempts >= 2 && !progress.level2Completed;
    const level3Accessible = progress.failedAttempts >= 3 && !progress.level3Completed;

    // Tentukan apakah user wajib mengerjakan kuis utama
    const mustRetakeMainQuiz = progress.level1Completed || progress.level2Completed || progress.level3Completed;

    // Tentukan apakah user dapat mengerjakan kuis utama
    const canTakeMainQuiz = progress.canTakeMainQuiz;

    return {
      level1Completed: progress.level1Completed,
      level2Completed: progress.level2Completed,
      level3Completed: progress.level3Completed,
      level1Accessible,
      level2Accessible,
      level3Accessible,
      mustRetakeMainQuiz,
      canTakeMainQuiz,
      nextStep: progress.nextStep,
    };
  } catch (error) {
    console.error("Error getting assistance status:", error);
    return {
      level1Completed: false,
      level2Completed: false,
      level3Completed: false,
      level1Accessible: false,
      level2Accessible: false,
      level3Accessible: false,
      mustRetakeMainQuiz: false,
      canTakeMainQuiz: true,
      nextStep: null,
    };
  }
}

/**
 * Reset flag mustRetakeMainQuiz setelah user mulai kuis utama
 */
export async function resetMustRetakeMainQuizFlag(
  studentId: string,
  quizId: string
): Promise<boolean> {
  try {
    await prisma.studentQuizProgress.update({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
      data: {
        mustRetakeMainQuiz: false,
        nextStep: null,
      },
    });

    return true;
  } catch (error) {
    console.error("Error resetting mustRetakeMainQuiz flag:", error);
    return false;
  }
}

/**
 * Mengupdate accessibility level bantuan berdasarkan failed attempts
 */
export async function updateAssistanceAccessibility(
  studentId: string,
  quizId: string,
  failedAttempts: number
): Promise<boolean> {
  try {
    await prisma.studentQuizProgress.upsert({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
      update: {
        failedAttempts,
        level1Accessible: failedAttempts >= 1,
        level2Accessible: failedAttempts >= 2,
        level3Accessible: failedAttempts >= 3,
      },
      create: {
        studentId,
        quizId,
        failedAttempts,
        level1Accessible: failedAttempts >= 1,
        level2Accessible: failedAttempts >= 2,
        level3Accessible: failedAttempts >= 3,
      },
    });

    return true;
  } catch (error) {
    console.error("Error updating assistance accessibility:", error);
    return false;
  }
}
