"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  AssistanceRequirement, 
  SubmissionStatus, 
} from "../../types";
import { Prisma } from '@prisma/client';

// Definisi interface untuk session user
interface ExtendedUser {
  id: string;
  role: UserRole;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

// Helper untuk memeriksa akses
async function checkAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  // Type assertion dengan interface yang tepat
  const userId = (session.user as ExtendedUser).id;
  const userRole = (session.user as ExtendedUser).role;
  
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
        studentId_quizId: {
          studentId,
          quizId
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

// Perbarui status kemajuan kuis setelah submisi dinilai (oleh GURU)
export async function updateQuizProgressAfterGrading(
  quizId: string, 
  studentId: string, 
  passed: boolean, 

) {
  const access = await checkAccess();
  if (!access.success) {
    return { success: false, message: access.message };
  }
  if (access.role !== UserRole.TEACHER) { // Hanya guru yang bisa menilai
    return { success: false, message: "Hanya guru yang dapat mengakses fitur ini." };
  }

  try {
    const progress = await prisma.studentQuizProgress.findUnique({
      where: { studentId_quizId: { studentId, quizId } },
    });

    if (!progress) {
      console.error(`updateQuizProgressAfterGrading: Progress tidak ditemukan untuk quizId=${quizId}, studentId=${studentId}`);
      return { success: false, message: "Kemajuan kuis siswa tidak ditemukan." };
    }

    const quiz = await prisma.quiz.findUnique({ 
      where: { id: quizId },
      // Pastikan Anda punya field maxAttempts di model Quiz Anda
      // select: { maxAttempts: true, classId: true } // Pilih hanya field yang dibutuhkan
    });
    // const maxAttempts = quiz?.maxAttempts || 4; // Ambil dari model Quiz atau default
    // Untuk sementara, kita hardcode maxAttempts jika tidak ada di model Quiz
    // Sebaiknya tambahkan field maxAttempts: Int? @default(4) ke model Quiz Anda
    const maxAttempts = 4; 

    const updatedData: Prisma.StudentQuizProgressUpdateInput = { 
      lastAttemptPassed: passed,
      // Jika Anda memiliki field untuk menyimpan skor dari guru di StudentQuizProgress:
      // lastScoreFromTeacher: score, 
    };

    if (!passed) {
      updatedData.failedAttempts = (progress.failedAttempts || 0) + 1;
      const currentFailedAttemptNumber = progress.currentAttempt; 

      if (currentFailedAttemptNumber >= maxAttempts) {
        updatedData.finalStatus = "FAILED";
        updatedData.assistanceRequired = AssistanceRequirement.NONE;
        updatedData.nextStep = "QUIZ_FAILED_MAX_ATTEMPTS";
      } else {
        switch (currentFailedAttemptNumber) {
          case 1:
            if (await hasAssistance(quizId, 1) && !progress.level1Completed) {
              updatedData.assistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL1;
              updatedData.nextStep = "COMPLETE_ASSISTANCE_LEVEL1";
            } else {
              updatedData.assistanceRequired = AssistanceRequirement.NONE;
              updatedData.nextStep = "TAKE_MAIN_QUIZ_NOW";
            }
            break;
          case 2:
            if (!progress.level1Completed && (await hasAssistance(quizId, 1))) {
              updatedData.assistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL1;
              updatedData.nextStep = "COMPLETE_ASSISTANCE_LEVEL1";
            } else if (await hasAssistance(quizId, 2) && !progress.level2Completed) {
              updatedData.assistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL2;
              updatedData.nextStep = "COMPLETE_ASSISTANCE_LEVEL2";
            } else {
              updatedData.assistanceRequired = AssistanceRequirement.NONE;
              updatedData.nextStep = "TAKE_MAIN_QUIZ_NOW";
            }
            break;
          case 3:
            if (!progress.level1Completed && (await hasAssistance(quizId, 1))){
              updatedData.assistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL1;
              updatedData.nextStep = "COMPLETE_ASSISTANCE_LEVEL1";
            } else if (!progress.level2Completed && (await hasAssistance(quizId, 2))) {
              updatedData.assistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL2;
              updatedData.nextStep = "COMPLETE_ASSISTANCE_LEVEL2";
            } else if (await hasAssistance(quizId, 3) && !progress.level3Completed) {
              updatedData.assistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL3;
              updatedData.nextStep = "VIEW_ASSISTANCE_LEVEL3";
            } else {
              updatedData.assistanceRequired = AssistanceRequirement.NONE;
              updatedData.nextStep = "TAKE_MAIN_QUIZ_NOW";
            }
            break;
          default:
            updatedData.finalStatus = "FAILED";
            updatedData.assistanceRequired = AssistanceRequirement.NONE;
            updatedData.nextStep = "QUIZ_FAILED_MAX_ATTEMPTS";
            break;
        }
        if (updatedData.assistanceRequired && updatedData.assistanceRequired !== AssistanceRequirement.NONE) {
          updatedData.finalStatus = null; // Hapus finalStatus jika masih ada alur bantuan
        }
      }
    } else { 
      updatedData.finalStatus = "PASSED";
      updatedData.assistanceRequired = AssistanceRequirement.NONE;
      updatedData.nextStep = "QUIZ_PASSED";
    }
    
    if (updatedData.finalStatus === "PASSED" || updatedData.finalStatus === "FAILED" || 
        (passed && updatedData.assistanceRequired === AssistanceRequirement.NONE)) {
      updatedData.overrideSystemFlow = false; 
      updatedData.manuallyAssignedLevel = null; 
    }

    const updatedProgress = await prisma.studentQuizProgress.update({
      where: { id: progress.id },
      data: updatedData,
    });

    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/teacher/submissions`); 
    // Conditional revalidation based on quiz.classId
    if (quiz?.classId) {
      revalidatePath(`/teacher/classes/${quiz.classId}/quizzes/${quizId}`); 
    }

    return { success: true, data: updatedProgress };
  } catch (error) {
    console.error("Error updating quiz progress after grading:", error);
    // Tambahkan tipe Prisma.PrismaClientKnownRequestError jika Anda ingin menangani error Prisma secara spesifik
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Terjadi kesalahan saat memperbarui kemajuan kuis setelah penilaian." };
  }
}

// Helper function (perlu ada di file yang sama atau diimpor)
async function hasAssistance(quizId: string, level: 1 | 2 | 3): Promise<boolean> {
    const quizData = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { 
            assistanceLevel1: level === 1 ? { select: { id: true } } : undefined,
            assistanceLevel2: level === 2 ? { select: { id: true } } : undefined,
            assistanceLevel3: level === 3 ? { select: { id: true } } : undefined,
        }
    });
    if (!quizData) return false;
    if (level === 1) return !!quizData.assistanceLevel1;
    if (level === 2) return !!quizData.assistanceLevel2;
    if (level === 3) return !!quizData.assistanceLevel3;
    return false;
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
        studentId_quizId: {
          studentId,
          quizId
        }
      },
      data: {
        level1Completed: true,
        manuallyAssignedLevel: AssistanceRequirement.NONE.toString(),
        nextStep: "TAKE_MAIN_QUIZ_NOW",
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
        studentId_quizId: {
          studentId,
          quizId
        }
      },
      data: {
        level2Completed: true,
        manuallyAssignedLevel: AssistanceRequirement.NONE.toString(),
        nextStep: "TAKE_MAIN_QUIZ_NOW",
      }
    });
    
    // Revalidasi halaman terkait
    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/teacher/assistances`);
    
    return { success: true, data: progress };
  } catch (error) {
    console.error("Error marking level 2 as completed:", error);
    // Tambahkan tipe Prisma.PrismaClientKnownRequestError jika Anda ingin menangani error Prisma secara spesifik
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Terjadi kesalahan saat menandai bantuan level 2 selesai." };
  }
}

// Fungsi untuk menandai bantuan level 3 sebagai selesai
export async function markLevel3Completed(quizId: string, studentId: string) {
  const access = await checkAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  if (access.role !== UserRole.STUDENT || access.userId !== studentId) {
    return { success: false, message: "Anda tidak memiliki izin untuk tindakan ini." };
  }
  
  try {
    let progress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId,
          quizId,
        },
      },
    });

    if (!progress) {
      console.warn(`markLevel3Completed: Progress tidak ditemukan untuk quizId=${quizId}, studentId=${studentId}. Mencoba membuat atau mengambil progress.`);
      const creationResult = await getOrCreateQuizProgress(quizId, studentId);
      if (!creationResult.success || !creationResult.data) {
        return { success: false, message: creationResult.message || "Gagal membuat atau mengambil progress siswa."};
      }
      // Setelah getOrCreateQuizProgress, progress seharusnya sudah ada di DB.
      // Kita ambil lagi untuk memastikan objek yang bersih dan bertipe StudentQuizProgress.
      progress = await prisma.studentQuizProgress.findUnique({
        where: {
          studentId_quizId: {
            studentId,
            quizId,
          },
        },
      });

      if (!progress) {
        // Ini kondisi yang sangat tidak diharapkan jika getOrCreateQuizProgress berhasil
        console.error("markLevel3Completed: Gagal mengambil progress setelah getOrCreateQuizProgress berhasil.");
        return { success: false, message: "Terjadi kesalahan internal saat mengambil data progress siswa." };
      }
    }
    
    if (progress.level3Completed) {
      return { success: true, data: progress, message: "Bantuan level 3 sudah pernah diselesaikan." };
    }

    const updatedProgress = await prisma.studentQuizProgress.update({
      where: { id: progress.id }, // progress di sini dijamin tidak null
      data: {
        level3Completed: true,
        assistanceRequired: AssistanceRequirement.NONE,
        nextStep: "TAKE_MAIN_QUIZ_NOW",
        manuallyAssignedLevel: null, 
        overrideSystemFlow: false, 
      },
    });

    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/student/quizzes/${quizId}/assistance/level3`);
    
    return { success: true, data: updatedProgress };
  } catch (error) {
    console.error("Error marking level 3 as completed:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Terjadi kesalahan saat menandai bantuan level 3 selesai." };
  }
}

// Fungsi baru untuk siswa mengirimkan jawaban Bantuan Level 1
export async function submitAssistanceLevel1(
  quizId: string,
  studentId: string,
  userAnswers: Array<{ questionId: string; answer: boolean }>
) {
  const access = await checkAccess();
  if (!access.success || access.userId !== studentId) {
    return { success: false, message: access.message || "Akses ditolak." };
  }

  if (access.role !== UserRole.STUDENT) {
    return { success: false, message: "Hanya siswa yang dapat mengirimkan bantuan." };
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel1: {
          include: {
            questions: {
              orderBy: { createdAt: 'asc' } // atau urutan lain yang konsisten
            }
          }
        }
      }
    });

    if (!quiz?.assistanceLevel1 || !quiz.assistanceLevel1.questions) {
      return { success: false, message: "Bantuan Level 1 tidak ditemukan untuk kuis ini." };
    }

    const questions = quiz.assistanceLevel1.questions;
    if (questions.length === 0) {
      // Jika tidak ada pertanyaan, anggap selesai secara otomatis
      const progressOnNoQuestions = await prisma.studentQuizProgress.update({
        where: { studentId_quizId: { studentId, quizId } },
        data: {
          level1Completed: true,
          assistanceRequired: AssistanceRequirement.NONE,
          nextStep: "TRY_MAIN_QUIZ_AGAIN",
          // Jika ada field manuallyAssignedLevel yang spesifik ke L1, reset di sini
          // manuallyAssignedLevel: AssistanceRequirement.NONE 
        },
      });
      await prisma.quizSubmission.create({
        data: {
          quizId,
          studentId,
          assistanceLevel: 1,
          status: SubmissionStatus.PASSED, // Lulus otomatis jika tidak ada soal
          score: 100,
          submittedAnswers: [],
          attemptNumber: 1
        },
      });
      revalidatePath(`/student/quizzes/${quizId}`);
      return { success: true, data: { allCorrect: true, progress: progressOnNoQuestions } };
    }

    let allCorrect = true;
    let correctCount = 0;

    for (const q of questions) {
      const userAnswer = userAnswers.find(ua => ua.questionId === q.id);
      if (userAnswer && userAnswer.answer === q.correctAnswer) {
        correctCount++;
      } else {
        allCorrect = false;
      }
    }
    
    const score = (correctCount / questions.length) * 100;

    // Buat entri submisi
    await prisma.quizSubmission.create({
      data: {
        quizId,
        studentId,
        assistanceLevel: 1,
        status: allCorrect ? SubmissionStatus.PASSED : SubmissionStatus.FAILED,
        score: score,
        // Simpan jawaban dalam format JSON
        submittedAnswers: userAnswers,
        attemptNumber: 1
      },
    });

    let updatedProgress;
    if (allCorrect) {
      updatedProgress = await prisma.studentQuizProgress.update({
        where: {
          studentId_quizId: { studentId, quizId }
        },
        data: {
          level1Completed: true,
          assistanceRequired: AssistanceRequirement.NONE,
          nextStep: "TAKE_MAIN_QUIZ_NOW",
          manuallyAssignedLevel: null,
          overrideSystemFlow: false,
        }
      });
    } else {
      // Jika tidak semua benar, siswa tetap harus menyelesaikan Bantuan Level 1
      updatedProgress = await prisma.studentQuizProgress.findUnique({
         where: { studentId_quizId: { studentId, quizId } }
      });
      // Tidak ada perubahan pada progress jika gagal, siswa harus mencoba lagi Bantuan Level 1.
      // `assistanceRequired` tetap ASSISTANCE_LEVEL1 dan `nextStep` tetap COMPLETE_ASSISTANCE_LEVEL1
      // Ini diasumsikan sudah di-set sebelumnya ketika siswa gagal kuis utama percobaan 1.
    }

    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/student/quizzes/${quizId}/assistance/level1`); // Jika ada halaman detail bantuan

    return { 
      success: true, 
      data: { 
        allCorrect, 
        score,
        progress: updatedProgress 
      } 
    };

  } catch (error) {
    console.error("Error submitting assistance level 1:", error);
    let message = "Terjadi kesalahan saat mengirimkan Bantuan Level 1.";
    if (error instanceof Error && (error as { code?: string }).code === 'P2002') { // Unique constraint violation
        message = "Submisi untuk bantuan ini sudah ada atau terjadi duplikasi data."
    } else if (error instanceof Error) {
        message = error.message;
    }
    return { success: false, message };
  }
}

// Fungsi baru untuk siswa mengirimkan jawaban Bantuan Level 2 (Esai)
export async function submitAssistanceLevel2(
  quizId: string,
  studentId: string,
  // Asumsi userEssayAnswers adalah array jawaban esai per pertanyaan
  // Jika hanya satu esai besar, parameternya bisa berupa essayText: string
  userEssayAnswers: Array<{ questionId: string; answerText: string }>
) {
  const access = await checkAccess();
  if (!access.success || access.userId !== studentId) {
    return { success: false, message: access.message || "Akses ditolak." };
  }

  if (access.role !== UserRole.STUDENT) {
    return { success: false, message: "Hanya siswa yang dapat mengirimkan bantuan." };
  }

  try {
    // 1. Dapatkan QuizAssistanceLevel2 untuk validasi dan mendapatkan ID pertanyaan (jika perlu)
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel2: {
          include: {
            questions: true // Untuk mendapatkan ID pertanyaan jika kita ingin menyimpan jawaban per pertanyaan
          }
        }
      }
    });

    if (!quiz?.assistanceLevel2) {
      return { success: false, message: "Bantuan Level 2 tidak ditemukan untuk kuis ini." };
    }
    const assistanceId = quiz.assistanceLevel2.id;

    // 2. Buat entri di AssistanceLevel2Submission
    // Ini adalah tabel spesifik untuk submisi Bantuan Level 2 Anda
    const newAssistanceSubmission = await prisma.assistanceLevel2Submission.create({
      data: {
        assistanceId: assistanceId,
        studentId: studentId,
        status: SubmissionStatus.PENDING, // Atau PASSED jika tidak ada review guru sama sekali, PENDING jika guru bisa lihat
        // Jika Anda ingin menyimpan jawaban esai per pertanyaan:
        answers: {
          create: userEssayAnswers.map(ans => ({
            questionId: ans.questionId, // Pastikan ans.questionId valid dan ada di AssistanceQuestionEssay
            answerText: ans.answerText,
            // isCorrect dan feedback akan null karena tidak ada auto-grading
          })),
        },
        // Jika Bantuan Level 2 hanya satu esai dan Anda punya field `essayAnswer` di AssistanceLevel2Submission:
        // essayAnswer: userEssayAnswers[0]?.answerText, // Ambil dari parameter yang sesuai
      },
      include: { answers: true } // Untuk mengembalikan jawaban yang dibuat
    });

    // 3. Buat entri umum di QuizSubmission untuk konsistensi alur (opsional tapi direkomendasikan)
    // Ini akan membantu getStudentQuizStatus untuk melihat submisi bantuan dengan cara yang seragam.
    await prisma.quizSubmission.create({
      data: {
        quizId,
        studentId,
        assistanceLevel: 2,
        status: SubmissionStatus.PASSED, // Dianggap lulus dari perspektif alur siswa
        attemptNumber: 1, // Percobaan pertama untuk bantuan ini
        score: null, // Tidak ada skor otomatis untuk esai
        // Simpan referensi ke submisi spesifik L2 dengan format ringkas
        submittedAnswers: userEssayAnswers.map(a => ({ questionId: a.questionId, answerText: a.answerText.substring(0, 100) })),
      },
    });

    // 4. Perbarui StudentQuizProgress
    const updatedProgress = await prisma.studentQuizProgress.update({
      where: {
        studentId_quizId: { studentId, quizId }
      },
      data: {
        level2Completed: true, // Tandai selesai
        assistanceRequired: AssistanceRequirement.NONE,
        nextStep: "TAKE_MAIN_QUIZ_NOW",
        manuallyAssignedLevel: null,
        overrideSystemFlow: false,
      }
    });

    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/student/quizzes/${quizId}/assistance/level2`);

    return { 
      success: true, 
      data: { 
        assistanceSubmission: newAssistanceSubmission,
        progress: updatedProgress 
      } 
    };

  } catch (error) {
    console.error("Error submitting assistance level 2:", error);
    let message = "Terjadi kesalahan saat mengirimkan Bantuan Level 2.";
    if (error instanceof Error) {
        message = error.message;
    }
    // Handle P2003 (Foreign key constraint failed) jika questionId di userEssayAnswers tidak valid
    if (error instanceof Error && (error as { code?: string }).code === 'P2003') {
        message = "Salah satu ID pertanyaan esai tidak valid. Gagal menyimpan jawaban."
    }
    return { success: false, message };
  }
}

// Fungsi baru untuk siswa menandai Bantuan Level 3 sebagai diakses/selesai
export async function accessAssistanceLevel3(
  quizId: string,
  studentId: string
) {
  const access = await checkAccess();
  if (!access.success || access.userId !== studentId) {
    return { success: false, message: access.message || "Akses ditolak." };
  }

  if (access.role !== UserRole.STUDENT) {
    return { success: false, message: "Hanya siswa yang dapat mengakses bantuan." };
  }

  try {
    // 1. Dapatkan QuizAssistanceLevel3 untuk mendapatkan ID-nya
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel3: true
      }
    });

    if (!quiz?.assistanceLevel3) {
      return { success: false, message: "Bantuan Level 3 tidak ditemukan untuk kuis ini." };
    }
    const assistanceId = quiz.assistanceLevel3.id;

    // 2. Buat entri di AssistanceLevel3Completion (atau update jika sudah ada untuk idempotency)
    // Menggunakan upsert untuk menghindari error jika siswa mengakses berkali-kali
    const completionRecord = await prisma.assistanceLevel3Completion.upsert({
      where: {
        assistanceId_studentId: {
          assistanceId: assistanceId,
          studentId: studentId,
        }
      },
      update: { 
        // Tidak ada field khusus untuk diupdate di sini, 
        // tapi upsert memerlukan update object.
        // createdAt akan tetap dari pembuatan awal.
      },
      create: {
        assistanceId: assistanceId,
        studentId: studentId,
      }
    });

    // 3. Buat entri umum di QuizSubmission untuk konsistensi alur (opsional tapi direkomendasikan)
    await prisma.quizSubmission.create({
      data: {
        quizId,
        studentId,
        assistanceLevel: 3,
        status: SubmissionStatus.PASSED, // Dianggap lulus/selesai dari perspektif alur siswa
        attemptNumber: 1, // Percobaan pertama/satu-satunya untuk bantuan ini
        score: null, // Tidak ada skor
        submittedAnswers: [{ message: "Bantuan Level 3 telah diakses." }],
      },
    });

    // 4. Perbarui StudentQuizProgress
    const updatedProgress = await prisma.studentQuizProgress.update({
      where: {
        studentId_quizId: { studentId, quizId }
      },
      data: {
        level3Completed: true, // Tandai selesai
        assistanceRequired: AssistanceRequirement.NONE,
        nextStep: "TAKE_MAIN_QUIZ_NOW",
        manuallyAssignedLevel: null,
        overrideSystemFlow: false,
      }
    });

    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/student/quizzes/${quizId}/assistance/level3`);

    return { 
      success: true, 
      data: { 
        completionRecord,
        progress: updatedProgress 
      } 
    };

  } catch (error) {
    console.error("Error accessing assistance level 3:", error);
    let message = "Terjadi kesalahan saat mengakses Bantuan Level 3.";
    if (error instanceof Error) {
        message = error.message;
    }
    return { success: false, message };
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
        studentId_quizId: {
          studentId: effectiveStudentId,
          quizId
        }
      }
    });
    
    // Validasi akses
    if (!progress && access.role === UserRole.STUDENT) {
      // Periksa apakah siswa terdaftar di kelas
      if (quiz.classId) {
        const enrollment = await prisma.classEnrollment.findFirst({
          where: {
            classId: quiz.classId,
            studentId: effectiveStudentId
          }
        });
        
        if (!enrollment) {
          return { success: false, message: "Anda tidak terdaftar di kelas yang terkait dengan kuis ini" };
        }
      }
    }
    
    if (!progress) {
      // Buat kemajuan baru jika belum ada
      progress = await prisma.studentQuizProgress.create({
        data: {
          quizId,
          studentId: effectiveStudentId,
          currentAttempt: 1,
          failedAttempts: 0, // Pastikan ini diinisialisasi dengan 0
          level1Completed: false,
          level2Completed: false,
          level3Completed: false
        }
      });
      console.log("Created new progress:", progress);
    } else {
      // Periksa apakah bantuan yang diperlukan sudah diselesaikan
      if (progress.manuallyAssignedLevel !== null) {
        let canProceed = false;
        
        switch (progress.manuallyAssignedLevel) {
          case "NONE":
            canProceed = true;
            break;
          case "ASSISTANCE_LEVEL1":
            canProceed = progress.level1Completed;
            break;
          case "ASSISTANCE_LEVEL2":
            canProceed = progress.level2Completed;
            break;
          case "ASSISTANCE_LEVEL3":
            canProceed = progress.level3Completed;
            break;
        }
        
        if (!canProceed) {
          console.log(`Siswa harus menyelesaikan bantuan ${progress.manuallyAssignedLevel} terlebih dahulu`);
          return { 
            success: false, 
            message: `Anda harus menyelesaikan bantuan ${progress.manuallyAssignedLevel} terlebih dahulu` 
          };
        }
      }
      
      // Perbarui nomor percobaan - hanya untuk kuis utama
      // Bantuan level 1, 2, atau 3 tidak dihitung sebagai percobaan
      if (progress.manuallyAssignedLevel === null) {
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
export async function getStudentQuizStatus(quizId: string, studentIdParam: string = "") {
  const access = await checkAccess();
  if (!access.success) return { success: false, message: access.message };

  const studentId = studentIdParam || (access.userId as string);
  if (!studentId) {
    return { success: false, message: "ID siswa tidak valid." };
  }

  try {
    const quizData = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        assistanceLevel1: { select: { id: true } },
        assistanceLevel2: { select: { id: true } },
        assistanceLevel3: { select: { id: true } },
        // class: true, // Jika perlu validasi enrollment lagi
        // Anda perlu menambahkan maxAttempts dan passingScore ke model Quiz jika belum ada
        // questions: { select: { _count: true } } // Untuk total pertanyaan jika perlu
      }
    });

    if (!quizData) return { success: false, message: "Kuis tidak ditemukan." };
    // const maxAttempts = quizData.maxAttempts || 4; // Uncomment jika ada field maxAttempts di Quiz
    // const passingScore = quizData.passingScore || 70; // Uncomment jika ada field passingScore di Quiz
    const maxAttempts = 4; // Placeholder, tambahkan field maxAttempts ke model Quiz
    const passingScore = 70; // Placeholder, tambahkan field passingScore ke model Quiz


    // Validasi enrollment siswa jika diperlukan (jika belum dilakukan di hulu)
    // ...

    let progress = await prisma.studentQuizProgress.findUnique({
      where: { studentId_quizId: { studentId, quizId } }
    });

    if (!progress) {
      progress = await prisma.studentQuizProgress.create({
        data: {
          studentId,
          quizId,
          currentAttempt: 0, 
          failedAttempts: 0,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false,
          assistanceRequired: AssistanceRequirement.NONE, 
          nextStep: "START_MAIN_QUIZ", 
          overrideSystemFlow: false,
          // finalStatus: null, // Tidak perlu di-set eksplisit, defaultnya null
          // lastAttemptPassed: null, // Defaultnya null
        }
      });
    }

    // Ambil submisi terakhir untuk kompabilitas
    const lastMainQuizSubmission = await prisma.quizSubmission.findFirst({
      where: { quizId, studentId, assistanceLevel: null }, 
      orderBy: { createdAt: 'desc' } 
    });
    
    // Ambil semua submisi untuk menampilkan history lengkap
    const allMainQuizSubmissions = await prisma.quizSubmission.findMany({
      where: { quizId, studentId, assistanceLevel: null },
      orderBy: { createdAt: 'desc' }
    });

    let uiNextStep = progress.nextStep;
    let uiAssistanceRequired = progress.assistanceRequired;
    let canTakeMainQuiz = false;

    if (progress.overrideSystemFlow && progress.manuallyAssignedLevel) {
      uiAssistanceRequired = progress.manuallyAssignedLevel as AssistanceRequirement;
      if (uiAssistanceRequired === AssistanceRequirement.NONE) {
        uiNextStep = "TRY_MAIN_QUIZ_AGAIN"; 
        canTakeMainQuiz = (progress.currentAttempt || 0) < maxAttempts && 
                           lastMainQuizSubmission?.status !== SubmissionStatus.PENDING &&
                           progress.finalStatus !== "PASSED" && progress.finalStatus !== "FAILED";
      } else {
        const manuallyAssigned = progress.manuallyAssignedLevel as AssistanceRequirement;
        if (manuallyAssigned === AssistanceRequirement.ASSISTANCE_LEVEL1 && !progress.level1Completed) {
          uiNextStep = "COMPLETE_ASSISTANCE_LEVEL1";
        } else if (manuallyAssigned === AssistanceRequirement.ASSISTANCE_LEVEL2 && !progress.level2Completed) {
          uiNextStep = "COMPLETE_ASSISTANCE_LEVEL2";
        } else if (manuallyAssigned === AssistanceRequirement.ASSISTANCE_LEVEL3 && !progress.level3Completed) {
          uiNextStep = "VIEW_ASSISTANCE_LEVEL3";
        } else {
          uiNextStep = "TRY_MAIN_QUIZ_AGAIN";
           canTakeMainQuiz = (progress.currentAttempt || 0) < maxAttempts && 
                           lastMainQuizSubmission?.status !== SubmissionStatus.PENDING &&
                           progress.finalStatus !== "PASSED" && progress.finalStatus !== "FAILED";
        }
      }
    } else { 
      if (progress.finalStatus === "PASSED") {
        uiNextStep = "QUIZ_PASSED";
      } else if (progress.finalStatus === "FAILED") {
        uiNextStep = "QUIZ_FAILED_MAX_ATTEMPTS";
      } else if (lastMainQuizSubmission?.status === SubmissionStatus.PENDING) {
        uiNextStep = "AWAITING_GRADING";
      } else if (progress.assistanceRequired && progress.assistanceRequired !== AssistanceRequirement.NONE) {
        uiNextStep = progress.nextStep; 
      } else { 
        uiNextStep = progress.nextStep; 
        canTakeMainQuiz = (progress.currentAttempt || 0) < maxAttempts;
      }
    }
    
    // Ambil detail submisi bantuan terakhir jika perlu untuk UI (misal, feedback guru)
    // Ini opsional dan bisa ditambahkan jika UI memerlukan info spesifik dari submisi bantuan
    // const latestLevel1SubmissionInfo = quizData.assistanceLevel1 ? await prisma.assistanceLevel1Submission.findFirst({
    //     where: { assistanceId: quizData.assistanceLevel1.id, studentId }, orderBy: { createdAt: 'desc' }
    // }) : null;
    // const latestLevel2SubmissionInfo = quizData.assistanceLevel2 ? await prisma.assistanceLevel2Submission.findFirst({
    //     where: { assistanceId: quizData.assistanceLevel2.id, studentId }, orderBy: { createdAt: 'desc' }
    // }) : null;

    const resultData = {
      currentAttempt: progress.currentAttempt || 0,
      failedAttempts: progress.failedAttempts || 0,
      lastAttemptPassed: progress.lastAttemptPassed,
      finalStatus: progress.finalStatus,
      level1Completed: progress.level1Completed,
      level2Completed: progress.level2Completed,
      level3Completed: progress.level3Completed,
      overrideSystemFlow: progress.overrideSystemFlow || false,
      manuallyAssignedLevel: progress.manuallyAssignedLevel,
      
      assistanceRequired: uiAssistanceRequired || AssistanceRequirement.NONE,
      nextStep: uiNextStep,
      canTakeQuiz: canTakeMainQuiz,

      maxAttempts: maxAttempts,
      passingScore: passingScore, 
      
      // Tetap memberikan data submisi terakhir untuk kompabilitas
      lastMainQuizSubmission: lastMainQuizSubmission ? {
          status: lastMainQuizSubmission.status,
          score: lastMainQuizSubmission.score,
          correctAnswers: lastMainQuizSubmission.correctAnswers,
          totalQuestions: lastMainQuizSubmission.totalQuestions,
      } : null,
      
      // Memberikan semua submisi untuk menampilkan history lengkap
      allMainQuizSubmissions: allMainQuizSubmissions.map(submission => ({
          id: submission.id,
          status: submission.status,
          score: submission.score,
          correctAnswers: submission.correctAnswers,
          totalQuestions: submission.totalQuestions,
          createdAt: submission.createdAt,
          attemptNumber: submission.attemptNumber,
      })),

      assistanceStatus: {
        level1: {
          available: !!quizData.assistanceLevel1,
          completed: progress.level1Completed,
        },
        level2: {
          available: !!quizData.assistanceLevel2,
          completed: progress.level2Completed, 
        },
        level3: {
          available: !!quizData.assistanceLevel3,
          completed: progress.level3Completed,
        }
      }
    };

    return { success: true, data: resultData };

  } catch (error) {
    console.error("Error getting student quiz status:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Terjadi kesalahan saat mengambil status kuis siswa." };
  }
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
        studentId_quizId: {
          studentId,
          quizId
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
          level1Completed: false,
          level2Completed: false,
          level3Completed: false,
          overrideSystemFlow: true,
          level3AccessGranted: granted,
          manuallyAssignedLevel: (granted ? AssistanceRequirement.ASSISTANCE_LEVEL3 : AssistanceRequirement.NONE).toString()
        }
      });
    } else {
      // Perbarui progress yang ada
      await prisma.studentQuizProgress.update({
        where: { id: progress.id },
        data: {
          level3AccessGranted: granted,
          overrideSystemFlow: true,
          manuallyAssignedLevel: (granted ? AssistanceRequirement.ASSISTANCE_LEVEL3 : AssistanceRequirement.NONE).toString()
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