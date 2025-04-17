"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  AssistanceRequirement, 
  SubmissionStatus, 
  StudentQuizProgress 
} from "../../types";
import { studentQuizProgressSchema } from "../../lib/validations/quiz-assistance";

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

// Inisialisasi atau dapatkan kemajuan kuis siswa
export async function getOrCreateQuizProgress(quizId: string, studentId: string) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.STUDENT && access.userId !== studentId) {
    return { success: false, message: "Anda tidak memiliki akses untuk fitur ini" };
  }
  
  try {
    // Periksa apakah quiz ada
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel1: true,
        assistanceLevel2: true,
        assistanceLevel3: true
      }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Cari atau buat kemajuan kuis
    let progress = await prisma.studentQuizProgress.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId
        }
      }
    });
    
    if (!progress) {
      // Buat kemajuan baru jika belum ada
      progress = await prisma.studentQuizProgress.create({
        data: {
          quizId,
          studentId,
          currentAttempt: 0,
          maxAttempts: 4,
          assistanceRequired: AssistanceRequirement.NONE,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false
        }
      });
    }
    
    // Tambahkan info bantuan yang tersedia
    const assistanceInfo = {
      hasLevel1: Boolean(quiz.assistanceLevel1),
      hasLevel2: Boolean(quiz.assistanceLevel2),
      hasLevel3: Boolean(quiz.assistanceLevel3),
      level1Id: quiz.assistanceLevel1?.id,
      level2Id: quiz.assistanceLevel2?.id,
      level3Id: quiz.assistanceLevel3?.id
    };
    
    return { 
      success: true, 
      data: { 
        ...progress, 
        assistanceInfo 
      } 
    };
  } catch (error) {
    console.error("Error getting quiz progress:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil data kemajuan kuis" };
  }
}

// Perbarui status kemajuan kuis setelah submisi dinilai
export async function updateQuizProgressAfterGrading(quizId: string, studentId: string, passed: boolean) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.TEACHER) {
    return { success: false, message: "Hanya guru yang dapat mengakses fitur ini" };
  }
  
  try {
    // Dapatkan kemajuan kuis
    let progress = await prisma.studentQuizProgress.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId
        }
      }
    });
    
    if (!progress) {
      // Buat kemajuan baru jika belum ada
      progress = await prisma.studentQuizProgress.create({
        data: {
          quizId,
          studentId,
          currentAttempt: 1,
          lastAttemptPassed: passed,
          maxAttempts: 4,
          assistanceRequired: passed ? AssistanceRequirement.NONE : AssistanceRequirement.ASSISTANCE_LEVEL1,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false
        }
      });
    } else {
      // Perbarui kemajuan yang ada
      let newAssistanceRequired = AssistanceRequirement.NONE;
      
      if (!passed) {
        // Tentukan level bantuan yang diperlukan berdasarkan nomor percobaan saat ini
        switch (progress.currentAttempt) {
          case 1:
            // Jika percobaan pertama gagal, siswa harus mengerjakan bantuan level 1
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL1;
            break;
          case 2:
            // Jika percobaan kedua gagal, siswa harus mengerjakan bantuan level 2
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL2;
            break;
          case 3:
            // Jika percobaan ketiga gagal, siswa harus melihat PDF bantuan level 3
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL3;
            break;
          case 4:
            // Jika percobaan keempat gagal, siswa dinyatakan tidak lulus
            newAssistanceRequired = AssistanceRequirement.NONE;
            // Tandai sebagai gagal di percobaan terakhir
            await prisma.studentQuizProgress.update({
              where: { id: progress.id },
              data: { finalStatus: "failed" }
            });
            break;
          default:
            newAssistanceRequired = AssistanceRequirement.NONE;
        }
      } else {
        // Jika lulus, tidak perlu bantuan lagi dan tandai sebagai lulus
        await prisma.studentQuizProgress.update({
          where: { id: progress.id },
          data: { finalStatus: "passed" }
        });
      }
      
      // Update status bantuan terpisah dari finalStatus
      progress = await prisma.studentQuizProgress.update({
        where: {
          id: progress.id
        },
        data: {
          lastAttemptPassed: passed,
          assistanceRequired: newAssistanceRequired
        }
      });
      
      console.log(`Memperbarui progress: attempt=${progress.currentAttempt}, passed=${passed}, assistance=${newAssistanceRequired}`);
    }
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/teacher/submissions`);
    
    return { success: true, data: progress };
  } catch (error) {
    console.error("Error updating quiz progress:", error);
    return { success: false, message: "Terjadi kesalahan saat memperbarui kemajuan kuis" };
  }
}

// Tandai bantuan level 1 sebagai selesai
export async function markLevel1Completed(quizId: string, studentId: string) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.STUDENT && access.userId !== studentId) {
    return { success: false, message: "Anda tidak memiliki akses untuk fitur ini" };
  }
  
  try {
    const progress = await prisma.studentQuizProgress.update({
      where: {
        quizId_studentId: {
          quizId,
          studentId
        }
      },
      data: {
        level1Completed: true,
        assistanceRequired: AssistanceRequirement.NONE
      }
    });
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${quizId}`);
    
    return { success: true, data: progress };
  } catch (error) {
    console.error("Error marking level 1 as completed:", error);
    return { success: false, message: "Terjadi kesalahan saat menandai bantuan level 1 sebagai selesai" };
  }
}

// Tandai bantuan level 2 sebagai selesai (oleh guru)
export async function markLevel2Completed(quizId: string, studentId: string) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.TEACHER) {
    return { success: false, message: "Hanya guru yang dapat mengakses fitur ini" };
  }
  
  try {
    const progress = await prisma.studentQuizProgress.update({
      where: {
        quizId_studentId: {
          quizId,
          studentId
        }
      },
      data: {
        level2Completed: true,
        assistanceRequired: AssistanceRequirement.NONE
      }
    });
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/teacher/assistances`);
    
    return { success: true, data: progress };
  } catch (error) {
    console.error("Error marking level 2 as completed:", error);
    return { success: false, message: "Terjadi kesalahan saat menandai bantuan level 2 sebagai selesai" };
  }
}

// Tandai bantuan level 3 sebagai selesai
export async function markLevel3Completed(quizId: string, studentId: string) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.STUDENT && access.userId !== studentId) {
    return { success: false, message: "Anda tidak memiliki akses untuk fitur ini" };
  }
  
  try {
    // Dapatkan bantuan level 3
    const assistance = await prisma.quizAssistanceLevel3.findUnique({
      where: { quizId }
    });
    
    if (!assistance) {
      return { success: false, message: "Bantuan level 3 tidak ditemukan" };
    }
    
    // Catat penyelesaian bantuan level 3
    await prisma.assistanceLevel3Completion.create({
      data: {
        assistanceId: assistance.id,
        studentId
      }
    });
    
    // Perbarui kemajuan kuis
    const progress = await prisma.studentQuizProgress.update({
      where: {
        quizId_studentId: {
          quizId,
          studentId
        }
      },
      data: {
        level3Completed: true,
        assistanceRequired: AssistanceRequirement.NONE
      }
    });
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${quizId}`);
    
    return { success: true, data: progress };
  } catch (error) {
    console.error("Error marking level 3 as completed:", error);
    return { success: false, message: "Terjadi kesalahan saat menandai bantuan level 3 sebagai selesai" };
  }
}

// Menambah counter percobaan kuis
export async function incrementQuizAttempt(quizId: string, studentId: string = "") {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Pastikan studentId valid - gunakan string kosong sebagai fallback aman
  const effectiveStudentId: string = studentId || (access.userId as string) || "";
  
  if (!effectiveStudentId) {
    return { success: false, message: "ID siswa tidak valid" };
  }
  
  console.log(`Incrementing quiz attempt for quizId=${quizId}, studentId=${effectiveStudentId}`);
  
  try {
    // Dapatkan kuis
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Cari progress kuis siswa
    let progress = await prisma.studentQuizProgress.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId: effectiveStudentId
        }
      }
    });
    
    // Validasi akses
    if (!progress && access.role === UserRole.STUDENT) {
      // Periksa apakah siswa terdaftar di kelas
      const enrollment = await prisma.classEnrollment.findFirst({
        where: {
          classId: quiz.classId,
          studentId: effectiveStudentId
        }
      });
      
      if (!enrollment) {
        return { success: false, message: "Anda tidak terdaftar di kelas ini" };
      }
    }
    
    if (!progress) {
      // Buat kemajuan baru jika belum ada
      progress = await prisma.studentQuizProgress.create({
        data: {
          quizId,
          studentId: effectiveStudentId,
          currentAttempt: 1,
          maxAttempts: 4,
          assistanceRequired: AssistanceRequirement.NONE,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false
        }
      });
      console.log("Created new progress:", progress);
    } else {
      // Periksa apakah bantuan yang diperlukan sudah diselesaikan
      if (progress.assistanceRequired !== AssistanceRequirement.NONE) {
        let canProceed = false;
        
        switch (progress.assistanceRequired) {
          case AssistanceRequirement.ASSISTANCE_LEVEL1:
            canProceed = progress.level1Completed;
            break;
          case AssistanceRequirement.ASSISTANCE_LEVEL2:
            canProceed = progress.level2Completed;
            break;
          case AssistanceRequirement.ASSISTANCE_LEVEL3:
            canProceed = progress.level3Completed;
            break;
        }
        
        if (!canProceed) {
          console.log(`Siswa harus menyelesaikan bantuan ${progress.assistanceRequired} terlebih dahulu`);
          return { 
            success: false, 
            message: `Anda harus menyelesaikan bantuan ${progress.assistanceRequired} terlebih dahulu` 
          };
        }
      }
      
      // Perbarui nomor percobaan - hanya untuk kuis utama
      // Bantuan level 1, 2, atau 3 tidak dihitung sebagai percobaan
      if (progress.assistanceRequired === AssistanceRequirement.NONE) {
        progress = await prisma.studentQuizProgress.update({
          where: {
            id: progress.id
          },
          data: {
            currentAttempt: progress.currentAttempt + 1
          }
        });
        console.log("Updated progress (incrementing attempt):", progress);
      } else {
        console.log("Bantuan sedang digunakan, tidak menambah counter percobaan");
      }
    }
    
    return { success: true, data: progress };
  } catch (error) {
    console.error("Error incrementing quiz attempt:", error);
    return { success: false, message: "Terjadi kesalahan saat memperbarui percobaan kuis" };
  }
}

// Dapatkan status kemajuan kuis siswa dan bantuan yang diperlukan
export async function getStudentQuizStatus(quizId: string, studentId: string = "") {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  const effectiveStudentId = studentId || access.userId as string || "";
  
  if (!effectiveStudentId) {
    return { success: false, message: "ID siswa tidak valid" };
  }
  
  // Pastikan pengguna memiliki akses ke kuis ini
  if (access.role === UserRole.STUDENT) {
    // Periksa apakah kuis adalah bagian dari kelas yang diikuti oleh siswa
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { class: true }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    if (!quiz.class) {
      return { success: false, message: "Kuis ini tidak terhubung dengan kelas manapun" };
    }
    
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        classId: quiz.class.id,
        studentId: effectiveStudentId
      }
    });
    
    if (!enrollment) {
      return { success: false, message: "Anda tidak memiliki akses untuk kuis ini" };
    }
  }
  
  try {
    // Dapatkan kuis dengan semua bantuan yang tersedia
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel1: true,
        assistanceLevel2: true,
        assistanceLevel3: true
      }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Dapatkan kemajuan kuis
    let progress = await prisma.studentQuizProgress.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId: effectiveStudentId
        }
      }
    });
    
    if (!progress) {
      // Buat kemajuan baru jika belum ada
      progress = await prisma.studentQuizProgress.create({
        data: {
          quizId,
          studentId: effectiveStudentId,
          currentAttempt: 0,
          maxAttempts: 4,
          assistanceRequired: AssistanceRequirement.NONE,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false,
          overrideSystemFlow: false
        }
      });
    }
    
    // Dapatkan submisi kuis terbaru
    const latestSubmission = await prisma.quizSubmission.findFirst({
      where: {
        quizId,
        studentId: effectiveStudentId
      },
      orderBy: {
        attemptNumber: 'desc'
      }
    });
    
    // Dapatkan status bantuan level 1
    const level1Submissions = quiz.assistanceLevel1 ? await prisma.assistanceLevel1Submission.findMany({
      where: {
        assistanceId: quiz.assistanceLevel1.id,
        studentId: effectiveStudentId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1
    }) : [];
    
    const latestLevel1Submission = level1Submissions.length > 0 ? level1Submissions[0] : null;
    
    // Dapatkan status bantuan level 2
    const level2Submissions = quiz.assistanceLevel2 ? await prisma.assistanceLevel2Submission.findMany({
      where: {
        assistanceId: quiz.assistanceLevel2.id,
        studentId: effectiveStudentId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1
    }) : [];
    
    const latestLevel2Submission = level2Submissions.length > 0 ? level2Submissions[0] : null;
    
    // Dapatkan status bantuan level 3
    const level3Completed = quiz.assistanceLevel3 ? await prisma.assistanceLevel3Completion.findFirst({
      where: {
        assistanceId: quiz.assistanceLevel3.id,
        studentId: effectiveStudentId
      }
    }) : null;
    
    // Tentukan level bantuan berdasarkan pengaturan override dari guru jika ada
    let effectiveAssistanceRequired = progress.assistanceRequired;
    
    // Cek jika guru telah mengatur override
    if (progress.overrideSystemFlow && progress.manuallyAssignedLevel !== null) {
      console.log(`Menggunakan level bantuan yang ditetapkan manual oleh guru: ${progress.manuallyAssignedLevel}`);
      effectiveAssistanceRequired = progress.manuallyAssignedLevel;
    }
    
    // Buat status lengkap
    const quizStatus = {
      progress,
      latestSubmission,
      assistanceStatus: {
        level1: {
          available: Boolean(quiz.assistanceLevel1),
          completed: progress.level1Completed,
          latestSubmission: latestLevel1Submission,
          assistanceId: quiz.assistanceLevel1?.id,
          submitted: Boolean(latestLevel1Submission)
        },
        level2: {
          available: Boolean(quiz.assistanceLevel2),
          completed: progress.level2Completed,
          latestSubmission: latestLevel2Submission,
          assistanceId: quiz.assistanceLevel2?.id
        },
        level3: {
          available: Boolean(quiz.assistanceLevel3),
          completed: progress.level3Completed,
          completionRecord: level3Completed,
          assistanceId: quiz.assistanceLevel3?.id
        }
      },
      nextStep: determineNextStep(progress, latestSubmission),
      // Tambahkan informasi pengaturan override
      overrideSystemFlow: progress.overrideSystemFlow,
      manuallyAssignedLevel: progress.manuallyAssignedLevel,
      // Gunakan effectiveAssistanceRequired untuk level bantuan yang aktif
      assistanceRequired: effectiveAssistanceRequired,
      canTakeQuiz: (
        // Dapat mengambil kuis jika:
        // 1. Guru telah override ke kuis utama (NONE)
        (progress.overrideSystemFlow && progress.manuallyAssignedLevel === "NONE") || 
        // 2. Belum mencapai batas maksimum percobaan
        (progress.currentAttempt <= progress.maxAttempts &&
        // 3. Tidak ada status final atau status final bukan "failed"
        progress.finalStatus !== "failed" &&
        // 4. Tidak memerlukan bantuan atau bantuan telah selesai
        (effectiveAssistanceRequired === "NONE" ||
          (effectiveAssistanceRequired === "ASSISTANCE_LEVEL1" && progress.level1Completed) ||
          (effectiveAssistanceRequired === "ASSISTANCE_LEVEL2" && progress.level2Completed) ||
          (effectiveAssistanceRequired === "ASSISTANCE_LEVEL3" && progress.level3Completed)
        ))
      )
    };
    
    return { success: true, data: quizStatus };
  } catch (error) {
    console.error("Error getting student quiz status:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil status kuis siswa" };
  }
}

// Tentukan langkah selanjutnya berdasarkan status kuis
function determineNextStep(progress: any, lastSubmission: any) {
  // Jika override diaktifkan, ikuti pengaturan manual dari guru
  if (progress.overrideSystemFlow && progress.manuallyAssignedLevel !== null) {
    if (progress.manuallyAssignedLevel === "NONE") {
      return "TAKE_QUIZ"; // Kuis utama
    } else if (progress.manuallyAssignedLevel === "ASSISTANCE_LEVEL1") {
      return "COMPLETE_ASSISTANCE_LEVEL1";
    } else if (progress.manuallyAssignedLevel === "ASSISTANCE_LEVEL2") {
      return "COMPLETE_ASSISTANCE_LEVEL2";
    } else if (progress.manuallyAssignedLevel === "ASSISTANCE_LEVEL3") {
      return "COMPLETE_ASSISTANCE_LEVEL3";
    }
  }

  // Jika assistanceRequired terisi, ikuti alur bantuan
  if (progress.assistanceRequired) {
    if (progress.assistanceRequired === "ASSISTANCE_LEVEL1" && !progress.level1Completed) {
      return "COMPLETE_ASSISTANCE_LEVEL1";
    } else if (progress.assistanceRequired === "ASSISTANCE_LEVEL2" && !progress.level2Completed) {
      return "COMPLETE_ASSISTANCE_LEVEL2";
    } else if (progress.assistanceRequired === "ASSISTANCE_LEVEL3" && !progress.level3Completed) {
      return "COMPLETE_ASSISTANCE_LEVEL3";
    }
  }
  
  // Jika telah mencapai batas percobaan atau gagal semua percobaan
  if (progress.currentAttempt >= progress.maxAttempts) {
    return "ASSISTANCE_REQUIRED";
  }
  
  // Jika belum ada submisi atau terakhir lulus, bisa mengerjakan kuis
  if (!lastSubmission || lastSubmission.status === "PASSED") {
    return "TAKE_QUIZ";
  }
  
  // Default (jika sudah ada submisi tapi belum lulus)
  return "TAKE_QUIZ"; 
}

// Berikan akses langsung ke bantuan level 3
export async function grantLevel3Access(quizId: string, studentId: string, granted: boolean = true) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.TEACHER) {
    return { success: false, message: "Hanya guru yang dapat mengakses fitur ini" };
  }
  
  try {
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId
        }
      }
    });
    
    if (!progress) {
      // Buat kemajuan baru jika belum ada
      await prisma.studentQuizProgress.create({
        data: {
          quizId,
          studentId,
          currentAttempt: 0,
          maxAttempts: 4,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false,
          overrideSystemFlow: false,
          level3AccessGranted: granted,
          assistanceRequired: granted ? AssistanceRequirement.ASSISTANCE_LEVEL3 : AssistanceRequirement.NONE
        }
      });
    } else {
      // Perbarui progress yang ada
      await prisma.studentQuizProgress.update({
        where: { id: progress.id },
        data: {
          level3AccessGranted: granted,
          assistanceRequired: granted ? AssistanceRequirement.ASSISTANCE_LEVEL3 : AssistanceRequirement.NONE
        }
      });
    }
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/teacher/students`);
    
    return { 
      success: true, 
      message: granted ? 
        "Akses ke bantuan level 3 telah diberikan" : 
        "Akses ke bantuan level 3 telah dicabut" 
    };
  } catch (error) {
    console.error("Error updating level 3 access:", error);
    return { success: false, message: "Terjadi kesalahan saat mengatur akses level 3" };
  }
} 