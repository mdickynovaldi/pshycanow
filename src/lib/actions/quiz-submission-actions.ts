"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { 

  SubmissionGradingInput, 

  submissionGradingSchema
} from "@/lib/validations/quiz-submission";
import { SubmissionStatus, AssistanceRequirement } from "@prisma/client";



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

// === STUDENT ACTIONS ===

// Memeriksa apakah siswa dapat mengakses kuis
async function canStudentAccessQuiz(studentId: string, quizId: string) {
  try {
    // Dapatkan kuis dan kelasnya
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { 
        id: true,
        classId: true
      }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Jika kuis tidak terhubung ke kelas, tidak dapat diakses
    if (!quiz.classId) {
      return { success: false, message: "Kuis tidak terhubung dengan kelas" };
    }
    
    // Periksa apakah siswa terdaftar di kelas tersebut
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        studentId: studentId,
        classId: quiz.classId
      }
    });
    
    if (!enrollment) {
      return { success: false, message: "Anda tidak terdaftar di kelas ini" };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error checking student access:", error);
    return { success: false, message: "Terjadi kesalahan saat memeriksa akses" };
  }
}

// Mendapatkan kuis untuk siswa
export async function getStudentQuiz(quizId: string) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Periksa apakah siswa dapat mengakses kuis
  const accessCheck = await canStudentAccessQuiz(access.userId!, quizId);
  if (!accessCheck.success) {
    return { success: false, message: accessCheck.message };
  }
  
  try {
    // Dapatkan kuis dengan pertanyaan
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            imageUrl: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Dapatkan informasi tentang upaya sebelumnya dan status progress
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId: access.userId!,
          quizId: quizId
        }
      }
    });
    
    const attempts = await prisma.quizSubmission.findMany({
      where: {
        quizId: quizId,
        studentId: access.userId!
      },
      orderBy: {
        attemptNumber: 'desc'
      },
      take: 1
    });
    
    const lastAttempt = attempts.length > 0 ? attempts[0] : null;
    const currentAttemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;
    const hasPendingAttempt = lastAttempt?.status === SubmissionStatus.PENDING;
    
    // VALIDASI UTAMA: Cek failedAttempts, bukan currentAttemptNumber
    const currentFailedAttempts = progress?.failedAttempts || 0;
    
    if (currentFailedAttempts >= 4) {
      return { 
        success: false, 
        message: "Anda telah mencapai batas maksimum 4 kali kegagalan untuk kuis ini dan tidak dapat mengerjakan kuis lagi" 
      };
    }
    
    return {
      success: true,
      data: {
        quiz,
        attemptInfo: {
          currentAttemptNumber,
          hasPendingAttempt,
          lastAttempt
        }
      }
    };
  } catch (error) {
    console.error("Error fetching student quiz:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil data kuis" };
  }
}

// Mendapatkan semua kuis yang tersedia untuk siswa
export async function getStudentAvailableQuizzes() {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan kelas-kelas yang diikuti siswa
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        studentId: access.userId!
      },
      select: {
        classId: true
      }
    });
    
    const classIds = enrollments.map(e => e.classId);
    
    if (classIds.length === 0) {
      return { 
        success: true, 
        data: [],
        message: "Anda belum terdaftar di kelas manapun" 
      };
    }
    
    // Dapatkan kuis-kuis dari kelas yang diikuti
    const quizzes = await prisma.quiz.findMany({
      where: {
        classId: {
          in: classIds
        }
      },
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Dapatkan informasi tentang percobaan untuk setiap kuis
    const quizzesWithAttempts = await Promise.all(
      quizzes.map(async (quiz) => {
        const attempts = await prisma.quizSubmission.findMany({
          where: {
            quizId: quiz.id,
            studentId: access.userId!
          },
          orderBy: {
            attemptNumber: 'desc'
          }
        });
        
        const lastAttempt = attempts.length > 0 ? attempts[0] : null;
        const attemptCount = attempts.length;
        const hasPendingAttempt = lastAttempt?.status === SubmissionStatus.PENDING;
        const hasPassed = attempts.some(a => a.status === SubmissionStatus.PASSED);
        
        // Cari submission yang lulus dan ambil skor terbaiknya
        const passedAttempt = attempts.find(a => a.status === SubmissionStatus.PASSED);
        const bestScore = hasPassed && passedAttempt ? passedAttempt.score : null;
        
        return {
          ...quiz,
          attemptInfo: {
            attemptCount,
            hasPendingAttempt,
            hasPassed,
            lastAttempt,
            passedAttempt,
            bestScore
          }
        };
      })
    );
    
    return { success: true, data: quizzesWithAttempts };
  } catch (error) {
    console.error("Error fetching student quizzes:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil data kuis" };
  }
}





/**
 * Mengirimkan jawaban kuis siswa
 */
export async function submitQuizAnswers(formData: FormData) {
  try {
    // Dapatkan session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return {
        success: false,
        message: "Anda harus login untuk submit jawaban kuis"
      };
    }

    // Validasi input
    const quizId = formData.get("quizId") as string;
    if (!quizId) {
      return {
        success: false,
        message: "ID kuis tidak ditemukan"
      };
    }

    console.log("Processing quiz submission for quizId:", quizId, "userId:", userId);

    // Dapatkan data kuis
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { 
        questions: true,
        class: true,
        assistanceLevel1: { select: { id: true } },
        assistanceLevel2: { select: { id: true } },
        assistanceLevel3: { select: { id: true } }
      }
    });

    if (!quiz) {
      return {
        success: false,
        message: "Kuis tidak ditemukan"
      };
    }

    // Proses jawaban
    const answersData = [];
    
    // Loop melalui semua pertanyaan dalam kuis
    for (const question of quiz.questions) {
      const studentAnswer = formData.get(`answer-${question.id}`) as string;
      
      // Jika jawaban tidak kosong, tambahkan ke array jawaban
      if (studentAnswer !== null && studentAnswer !== undefined) {
        answersData.push({
          questionId: question.id,
          studentAnswer: studentAnswer.trim()
        });
      }
    }
    
    // Periksa apakah ada jawaban yang diberikan
    if (answersData.length === 0) {
      return {
        success: false,
        message: "Tidak ada jawaban yang diberikan"
      };
    }
    
    // Periksa apakah semua pertanyaan telah dijawab
    if (answersData.length !== quiz.questions.length) {
      return {
        success: false,
        message: "Semua pertanyaan harus dijawab"
      };
    }
    
    // Dapatkan progress siswa saat ini SEBELUM increment
    const currentProgress = await prisma.studentQuizProgress.findUnique({
      where: {
        studentId_quizId: {
          studentId: userId,
          quizId: quizId
        }
      }
    });
    
    // Hitung attempt number yang seharusnya (sebelum increment)
    const attemptNumber = currentProgress ? currentProgress.currentAttempt + 1 : 1;
    
    // VALIDASI UTAMA: Cek failedAttempts BUKAN currentAttempt/attemptNumber
    const currentFailedAttempts = currentProgress?.failedAttempts || 0;
    
    console.log(`Current attempt will be: ${attemptNumber}, existing currentAttempt: ${currentProgress?.currentAttempt || 0}, currentFailedAttempts: ${currentFailedAttempts}`);
    
    // Validasi maksimum FAILED ATTEMPTS (bukan total attempts)
    if (currentFailedAttempts >= 4) {
      return {
        success: false,
        message: "Anda telah mencapai batas maksimum 4 kali kegagalan untuk kuis ini dan tidak dapat mengerjakan kuis lagi"
      };
    }
    
    // Update percobaan saat ini di StudentQuizProgress (HANYA SATU KALI)
    try {
      const { incrementQuizAttempt } = await import('./quiz-progress-actions');
      const incrementResult = await incrementQuizAttempt(quizId, userId);
      console.log("Increment result:", incrementResult);
    } catch (error) {
      console.error("Error incrementing quiz attempt:", error);
      // Lanjutkan meskipun ada error, karena ini tidak kritis
    }

    // Simpan submisi dengan attempt number yang sudah dihitung sebelumnya
    const submission = await prisma.quizSubmission.create({
      data: {
        quizId,
        studentId: userId,
        status: "PENDING", // Status awal, akan diubah nanti
        attemptNumber: attemptNumber, // Gunakan attemptNumber yang sudah dihitung
        feedback: null
      }
    });

    console.log("Created submission:", submission.id, "with attemptNumber:", attemptNumber);
    
    // Koreksi otomatis - mengevaluasi jawaban dengan tepat berdasarkan expectedAnswer
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    let allCorrect = true; // Flag untuk menentukan apakah semua jawaban benar
    
    // Simpan jawaban dan lakukan koreksi otomatis
    for (const answer of answersData) {
      const currentQuestion = quiz.questions.find(q => q.id === answer.questionId);
      let isCorrectValue = false; // Default: jawaban salah
      
      if (currentQuestion) {
        if (currentQuestion.expectedAnswer && currentQuestion.expectedAnswer.trim() !== "") {
          // Koreksi otomatis dengan membandingkan jawaban dengan expectedAnswer
          isCorrectValue = currentQuestion.expectedAnswer.trim().toLowerCase() === answer.studentAnswer.trim().toLowerCase();
          if (isCorrectValue) {
            correctCount++;
          } else {
            allCorrect = false; // Ada jawaban yang salah
          }
        } else {
          // Jika tidak ada expectedAnswer, tidak bisa menentukan benar/salah
          isCorrectValue = false;
          allCorrect = false; // Tidak ada expectedAnswer berarti tidak dianggap benar
        }
      }

      console.log(`Menyimpan jawaban untuk pertanyaan ${answer.questionId}: "${answer.studentAnswer}". Expected: "${currentQuestion?.expectedAnswer || 'N/A'}". Auto-corrected: ${isCorrectValue}`);
      
      await prisma.submissionAnswer.create({
        data: {
          submissionId: submission.id,
          questionId: answer.questionId,
          answerText: answer.studentAnswer,
          isCorrect: isCorrectValue 
        }
      });
    }
    
    // Hitung skor persentase
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    // Tentukan status kelulusan - PASSED jika skor >= 70% ATAU semua jawaban benar
    const finalStatus = (score >= 70 || allCorrect) ? SubmissionStatus.PASSED : SubmissionStatus.FAILED;
    
    // Update status submission dengan hasil koreksi otomatis
    await prisma.quizSubmission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        score: score,
        correctAnswers: correctCount,
        totalQuestions: totalQuestions,
        feedback: (score >= 70 || allCorrect)
          ? `Selamat! Anda lulus dengan skor ${score}%. ${allCorrect ? 'Semua jawaban benar!' : 'Skor Anda mencapai passing grade 70%.'}`
          : `Anda benar ${correctCount} dari ${totalQuestions} pertanyaan (${score}%). Passing grade adalah 70%. Silakan coba lagi.`
      }
    });
    
    console.log(`Submission ${submission.id} status: ${finalStatus}, Score: ${score}%, All Correct: ${allCorrect}, Passed: ${score >= 70 || allCorrect}`);
    
    // Perbarui status kemajuan kuis siswa berdasarkan hasil
    const studentProgress = await prisma.studentQuizProgress.findUnique({
      where: { studentId_quizId: { studentId: userId, quizId } }
    });
    
    if (studentProgress) {
      let newAssistanceRequired: AssistanceRequirement = AssistanceRequirement.NONE;
      let newNextStep = "TRY_MAIN_QUIZ_AGAIN";
      let newFinalStatus = null;
      
      // Pastikan failedAttempts memiliki nilai default yang benar
      const currentFailedAttempts = studentProgress.failedAttempts || 0;
      console.log(`Current failed attempts: ${currentFailedAttempts}, Score: ${score}%, Passed: ${score >= 70 || allCorrect}, Attempt number: ${attemptNumber}`);
      
      if (score >= 70 || allCorrect) {
        // Jika lulus (skor >= 70% atau semua benar), tandai sebagai lulus
        newFinalStatus = SubmissionStatus.PASSED;
        newNextStep = "QUIZ_PASSED";
      } else {
        // Jika tidak lulus, tentukan level bantuan yang diperlukan
        // GUNAKAN failedAttempts yang akan di-increment untuk menentukan level bantuan
        const nextFailedAttempts = currentFailedAttempts + 1;
        
        if (nextFailedAttempts === 1) {
          // Kegagalan pertama -> cek bantuan level 1
          if (quiz.assistanceLevel1) {
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL1;
            newNextStep = "COMPLETE_ASSISTANCE_LEVEL1";
          } else {
            newNextStep = "TAKE_MAIN_QUIZ_NOW";
          }
        } else if (nextFailedAttempts === 2) {
          // Kegagalan kedua -> cek bantuan level 2
          if (quiz.assistanceLevel2) {
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL2;
            newNextStep = "COMPLETE_ASSISTANCE_LEVEL2";
          } else if (quiz.assistanceLevel1 && !studentProgress.level1Completed) {
            // Jika level 2 tidak tersedia tapi level 1 belum selesai, arahkan ke level 1
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL1;
            newNextStep = "COMPLETE_ASSISTANCE_LEVEL1";
          }
        } else if (nextFailedAttempts === 3) {
          // Kegagalan ketiga -> cek bantuan level 3
          if (quiz.assistanceLevel3) {
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL3;
            newNextStep = "VIEW_ASSISTANCE_LEVEL3";
          } else if (quiz.assistanceLevel2 && !studentProgress.level2Completed) {
            // Jika level 3 tidak tersedia tapi level 2 belum selesai, arahkan ke level 2
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL2;
            newNextStep = "COMPLETE_ASSISTANCE_LEVEL2";
          } else if (quiz.assistanceLevel1 && !studentProgress.level1Completed) {
            // Jika level 2 & 3 tidak tersedia tapa level 1 belum selesai, arahkan ke level 1
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL1;
            newNextStep = "COMPLETE_ASSISTANCE_LEVEL1";
          }
        } else if (nextFailedAttempts >= 4) {
          // Kegagalan keempat -> siswa harus ke bantuan level 3 dulu (jika tersedia)
          // HANYA dinyatakan failed jika level 3 tidak tersedia atau sudah selesai
          if (quiz.assistanceLevel3 && !studentProgress.level3Completed) {
            newAssistanceRequired = AssistanceRequirement.ASSISTANCE_LEVEL3;
            newNextStep = "VIEW_ASSISTANCE_LEVEL3";
            console.log("4th failed attempt: Directing to assistance level 3");
          } else {
            // Sudah 4x gagal DAN sudah melalui semua bantuan yang tersedia
            newFinalStatus = SubmissionStatus.FAILED;
            newNextStep = "QUIZ_FAILED_MAX_ATTEMPTS";
            console.log("4th failed attempt: All assistance completed, marking as FAILED");
          }
        }
      }
      
      // Hitung failedAttempts yang baru
      const newFailedAttempts = (score >= 70 || allCorrect) ? currentFailedAttempts : (currentFailedAttempts + 1);
      console.log(`Updating failedAttempts from ${currentFailedAttempts} to ${newFailedAttempts}`);
      
      // Update progress dengan status terbaru
      await prisma.studentQuizProgress.update({
        where: { id: studentProgress.id },
        data: {
          lastAttemptPassed: (score >= 70 || allCorrect),
          assistanceRequired: newAssistanceRequired,
          nextStep: newNextStep,
          finalStatus: newFinalStatus,
          failedAttempts: newFailedAttempts,
          lastSubmissionId: submission.id  // Store the reference to the latest submission
        }
      });
    } else {
      console.error("StudentProgress not found after incrementQuizAttempt - this should not happen");
      
      // Sebagai fallback, buat progress record jika tidak ada
      await prisma.studentQuizProgress.upsert({
        where: { studentId_quizId: { studentId: userId, quizId } },
        update: {
          lastAttemptPassed: (score >= 70 || allCorrect),
          failedAttempts: (score >= 70 || allCorrect) ? 0 : 1,
          lastSubmissionId: submission.id // Store the reference to the latest submission
        },
        create: {
          studentId: userId,
          quizId: quizId,
          currentAttempt: attemptNumber,
          lastAttemptPassed: (score >= 70 || allCorrect),
          failedAttempts: (score >= 70 || allCorrect) ? 0 : 1,
          level1Completed: false,
          level2Completed: false,
          level3Completed: false,
          lastSubmissionId: submission.id // Store the reference to the latest submission
        }
      });
    }
    
    // Revalidasi path terkait
    revalidatePath(`/student/quizzes`);
    revalidatePath(`/student/quizzes/${quizId}`);

    const responseMessage = (score >= 70 || allCorrect)
      ? "Selamat! Anda lulus dengan skor 70% atau lebih."
      : `Anda benar ${correctCount} dari ${totalQuestions} pertanyaan (${score}%). Passing grade adalah 70%. Silakan coba lagi.`;

    return {
      success: true,
      message: responseMessage,
      data: {
        submissionId: submission.id,
        attemptNumber: attemptNumber,
        score: score,
        status: finalStatus,
        allCorrect: allCorrect,
        passed: (score >= 70 || allCorrect),
        correctCount: correctCount,
        totalQuestions: totalQuestions
      }
    };
  } catch (error) {
    console.error("Error submitting quiz answers:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat mengirim jawaban kuis"
    };
  }
}

// Mendapatkan riwayat submisi kuis siswa
export async function getStudentSubmissionHistory(quizId: string) {
  console.log('🔍 getStudentSubmissionHistory called with quizId:', quizId);
  
  const access = await checkStudentAccess();
  console.log('🔐 Student access check result:', access);
  
  if (!access.success) {
    console.error('❌ Access denied:', access.message);
    return { success: false, message: access.message };
  }
  
  try {
    console.log('🔍 getStudentSubmissionHistory - Query params:', {
      quizId,
      studentId: access.userId,
      assistanceLevel: null
    });
    
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: quizId,
        studentId: access.userId!,
        assistanceLevel: null // Hanya ambil submission kuis utama (bukan submission bantuan)
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        attemptNumber: 'desc'
      }
    });
    
    console.log('📊 getStudentSubmissionHistory - Found submissions:', submissions.length);
    submissions.forEach((submission, index) => {
      console.log(`  ${index + 1}. ID: ${submission.id}, Attempt: ${submission.attemptNumber}, Status: ${submission.status}, assistanceLevel: ${submission.assistanceLevel}`);
    });
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error("Error fetching submission history:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil riwayat submisi" };
  }
}

// Mendapatkan status kuis untuk siswa
export async function getStudentQuizStatus(quizId: string, studentId?: string) {
  try {
    let userIdToQuery: string;
    if (!studentId) {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== UserRole.STUDENT) {
        return { success: false, message: "Akses ditolak atau sesi tidak valid" };
      }
      userIdToQuery = session.user.id;
    } else {
      userIdToQuery = studentId;
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return { success: false, message: "Kuis tidak ditemukan" };

    const studentProgressDb = await prisma.studentQuizProgress.findFirst({
      where: { studentId: userIdToQuery, quizId },
    });

    const MAX_QUIZ_ATTEMPTS = 4;
    
    // Definisikan tipe untuk data progress yang akan digunakan
    interface ProgressInternal {
      currentAttempt: number;
      lastAttemptPassed: boolean | null;
      level1Completed: boolean;
      level2Completed: boolean;
      level3Completed: boolean;
      assistanceRequired: AssistanceRequirement | null;
      finalStatus: SubmissionStatus | null;
      failedAttempts: number;
    }

    let progressData: ProgressInternal;

    if (!studentProgressDb) {
      progressData = {
        currentAttempt: 1,
        lastAttemptPassed: null,
        level1Completed: false,
        level2Completed: false,
        level3Completed: false,
        assistanceRequired: null,
        finalStatus: null,
        failedAttempts: 0,
      };
    } else {
      progressData = {
        currentAttempt: studentProgressDb.currentAttempt,
        lastAttemptPassed: studentProgressDb.lastAttemptPassed,
        level1Completed: studentProgressDb.level1Completed,
        level2Completed: studentProgressDb.level2Completed,
        level3Completed: studentProgressDb.level3Completed,
        assistanceRequired: studentProgressDb.assistanceRequired,
        finalStatus: studentProgressDb.finalStatus as SubmissionStatus | null,
        failedAttempts: studentProgressDb.failedAttempts || 0,
      };
    }

    const assistanceStatus = {
      level1: {
        required: progressData.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL1,
        completed: progressData.level1Completed,
        available: await hasAssistanceLevel1(quizId),
      },
      level2: {
        required: progressData.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL2,
        submitted: false,
        completed: progressData.level2Completed,
        available: await hasAssistanceLevel2(quizId),
      },
      level3: {
        required: progressData.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL3,
        completed: progressData.level3Completed,
        available: await hasAssistanceLevel3(quizId),
      },
    };

    return {
      success: true,
      data: {
        quizId,
        currentAttempt: progressData.currentAttempt,
        maxAttempts: MAX_QUIZ_ATTEMPTS,
        lastAttemptPassed: progressData.lastAttemptPassed,
        attemptsRemaining: Math.max(0, MAX_QUIZ_ATTEMPTS - (progressData.failedAttempts || 0)),
        assistanceRequired: progressData.assistanceRequired,
        assistanceStatus,
        lastSubmission: null, // lastSubmission tidak lagi diambil dari progress.lastSubmissionId
        canTakeQuiz: (
          (progressData.failedAttempts || 0) < 4 &&
          progressData.finalStatus !== SubmissionStatus.FAILED &&
          progressData.finalStatus !== SubmissionStatus.PASSED && // Tidak bisa mengerjakan lagi jika sudah lulus
          (progressData.assistanceRequired === null ||
            (progressData.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL1 && progressData.level1Completed) ||
            (progressData.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL2 && progressData.level2Completed) ||
            (progressData.assistanceRequired === AssistanceRequirement.ASSISTANCE_LEVEL3 && progressData.level3Completed)
          )
        ),
        finalStatus: progressData.finalStatus,
        failedAttempts: progressData.failedAttempts || 0,
      },
    };
  } catch (error) {
    console.error("Error getting student quiz status:", error);
    return { success: false, message: "Terjadi kesalahan saat mendapatkan status kuis" };
  }
}

// Fungsi helper untuk memeriksa apakah bantuan tersedia
async function hasAssistanceLevel1(quizId: string): Promise<boolean> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { assistanceLevel1: { select: { id: true } } }
  });
  return !!quiz?.assistanceLevel1;
}

async function hasAssistanceLevel2(quizId: string): Promise<boolean> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { assistanceLevel2: { select: { id: true } } }
  });
  return !!quiz?.assistanceLevel2;
}

async function hasAssistanceLevel3(quizId: string): Promise<boolean> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { assistanceLevel3: { select: { id: true } } }
  });
  return !!quiz?.assistanceLevel3;
}

// === TEACHER ACTIONS ===

// Mendapatkan daftar submisi yang perlu dinilai dengan raw SQL untuk menangani perbedaan skema
export async function getPendingSubmissionsWithRawSQL() {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    console.log("getPendingSubmissionsWithRawSQL dipanggil oleh guru ID:", access.userId);
    
    // Dapatkan semua kelas milik guru
    const classes = await prisma.class.findMany({
      where: {
        teacherId: access.userId!
      },
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`Guru memiliki ${classes.length} kelas:`, classes.map(c => c.name));
    const classIds = classes.map(c => c.id);
    
    if (classIds.length === 0) {
      console.log("Guru tidak memiliki kelas");
      return { 
        success: true, 
        data: [],
        message: "Anda belum memiliki kelas" 
      };
    }
    
    // TAMBAHAN: Cek siswa yang terdaftar di kelas-kelas ini
    const enrolledStudents = await prisma.classEnrollment.findMany({
      where: {
        classId: {
          in: classIds
        }
      },
      include: {
        student: true
      }
    });
    
    console.log(`Total ${enrolledStudents.length} siswa terdaftar di kelas-kelas ini`);
    
    // Dapatkan kuis dari kelas-kelas tersebut
    const quizzes = await prisma.quiz.findMany({
      where: {
        classId: {
          in: classIds
        }
      },
      select: {
        id: true,
        title: true,
        classId: true
      }
    });
    
    console.log(`Ditemukan ${quizzes.length} kuis dari kelas-kelas guru:`, 
                quizzes.map(q => ({ id: q.id, title: q.title })));
    
    const quizIds = quizzes.map(q => q.id);
    
    if (quizIds.length === 0) {
      console.log("Tidak ada kuis yang dibuat di kelas-kelas guru");
      return { 
        success: true, 
        data: [],
        message: "Belum ada kuis yang dibuat" 
      };
    }
    
    // PERUBAHAN: Tambahkan pemeriksaan semua submisi untuk debugging
    const allSubmissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: {
          in: quizIds
        }
      },
      select: {
        id: true,
        quizId: true,
        studentId: true,
        status: true,
        attemptNumber: true
      }
    });
    
    console.log(`SEMUA SUBMISI (${allSubmissions.length}):`, 
                allSubmissions.map(s => ({ id: s.id, status: s.status, attempt: s.attemptNumber })));
    
    console.log("Mencari submisi dengan status PENDING untuk kuis:", quizIds);
    
    // Gunakan cara yang lebih langsung untuk pencarian
    console.log("Sekarang mencoba dengan pendekatan Prisma normal...");
    
    // Langsung gunakan pendekatan Prisma normal
    const pendingSubmissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: {
          in: quizIds
        }
      },
      include: {
        quiz: {
          include: {
            class: true
          }
        },
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Batasi jumlah hasil untuk performa
    });
    
    console.log(`Menemukan ${pendingSubmissions.length} submisi`);
    
    // Format data untuk UI
    const formattedSubmissions = pendingSubmissions.map(sub => ({
      id: sub.id,
      quizId: sub.quizId,
      studentId: sub.studentId,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      attemptNumber: sub.attemptNumber,
      status: sub.status,
      score: sub.score,
      quiz: {
        id: sub.quiz.id,
        title: sub.quiz.title,
        class: sub.quiz.class
      },
      student: {
        id: sub.student.id,
        name: sub.student.name,
        email: sub.student.email,
        image: sub.student.image
      }
    }));
    
    return { success: true, data: formattedSubmissions };
  } catch (error) {
    console.error("Error fetching pending submissions:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil data submisi" };
  }
}

// Mendapatkan detail submisi untuk dinilai
export async function getSubmissionDetail(submissionId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan detail submisi
    const submission = await prisma.quizSubmission.findUnique({
      where: {
        id: submissionId
      },
      include: {
        quiz: {
          include: {
            questions: true,
            class: {
              select: {
                id: true,
                name: true,
                teacherId: true
              }
            }
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
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
    
    // Pastikan guru adalah pemilik kelas
    if (submission.quiz.class?.teacherId !== access.userId) {
      return { success: false, message: "Anda tidak memiliki akses ke submisi ini" };
    }
    
    return { success: true, data: submission };
  } catch (error) {
    console.error("Error fetching submission detail:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil detail submisi" };
  }
}

// Mendapatkan detail submisi untuk siswa
export async function getStudentSubmissionDetail(submissionId: string) {
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan detail submisi
    const submission = await prisma.quizSubmission.findUnique({
      where: {
        id: submissionId
      },
      include: {
        quiz: true,
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
    
    // Pastikan siswa hanya dapat melihat submisi mereka sendiri
    if (submission.studentId !== access.userId) {
      return { success: false, message: "Anda tidak memiliki akses ke submisi ini" };
    }
    
    // Hitung skor dan jawaban benar
    let correctAnswers = 0;
    const totalQuestions = submission.answers.length;
    
    submission.answers.forEach(answer => {
      if (answer.isCorrect === true) {
        correctAnswers++;
      }
    });
    
    // Hitung persentase skor jika sudah dinilai
    let score = null;
    if (submission.status !== 'PENDING') {
      score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    }
    
    // Tambahkan informasi tambahan
    const enrichedSubmission = {
      ...submission,
      correctAnswers,
      totalQuestions,
      score
    };
    
    return { success: true, data: enrichedSubmission };
  } catch (error) {
    console.error("Error fetching student submission detail:", error);
    return { success: false, message: "Terjadi kesalahan saat mengambil detail submisi" };
  }
}

// Menilai submisi kuis
export async function gradeQuizSubmission(data: SubmissionGradingInput) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi data penilaian
  const validationResult = submissionGradingSchema.safeParse(data);
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Data penilaian tidak valid", 
      errors: validationResult.error.format() 
    };
  }
  
  try {
    // Dapatkan detail submisi
    const submission = await prisma.quizSubmission.findUnique({
      where: {
        id: data.submissionId
      },
      include: {
        quiz: {
          include: {
            class: {
              select: {
                teacherId: true
              }
            }
          }
        },
        answers: true
      }
    });
    
    if (!submission) {
      return { success: false, message: "Submisi tidak ditemukan" };
    }
    
    // Pastikan guru adalah pemilik kelas
    if (submission.quiz.class?.teacherId !== access.userId) {
      return { success: false, message: "Anda tidak memiliki akses ke submisi ini" };
    }
    
    // Pastikan submisi masih berstatus PENDING
    if (submission.status !== SubmissionStatus.PENDING) {
      return { success: false, message: "Submisi ini sudah dinilai sebelumnya" };
    }
    
    // Update jawaban
    for (const answerData of data.answers) {
      await prisma.submissionAnswer.update({
        where: {
          id: answerData.answerId
        },
        data: {
          isCorrect: answerData.isCorrect,
          feedback: answerData.feedback
        }
      });
    }
    
    // Hitung jumlah jawaban yang benar
    const totalAnswers = data.answers.length;
    const correctAnswers = data.answers.filter(a => a.isCorrect).length;
    const isAllCorrect = correctAnswers === totalAnswers;
    const newStatus = isAllCorrect ? SubmissionStatus.PASSED : SubmissionStatus.FAILED;
    
    // Hitung skor berdasarkan persentase jawaban benar
    const score = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    
    console.log(`Penilaian: Total jawaban=${totalAnswers}, Benar=${correctAnswers}, Skor=${score}, Status=${newStatus}`);
    
    // Update status submisi
    const updatedSubmission = await prisma.quizSubmission.update({
      where: {
        id: data.submissionId
      },
      data: {
        status: newStatus,
        feedback: data.feedback,
        score: score,
        correctAnswers: correctAnswers,
        totalQuestions: totalAnswers
      },
      include: {
        answers: {
          include: {
            question: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    // Perbarui juga status kemajuan kuis siswa
    try {
      const { updateQuizProgressAfterGrading } = await import('./quiz-progress-actions');
      await updateQuizProgressAfterGrading(
        submission.quizId,
        submission.studentId,
        isAllCorrect
      );
    } catch (error) {
      console.error("Error updating quiz progress:", error);
    }
    
    revalidatePath(`/teacher/submissions`);
    revalidatePath(`/teacher/submissions/${data.submissionId}`);
    revalidatePath(`/student/quizzes`);
    revalidatePath(`/student/quizzes/${submission.quizId}`);
    
    return { 
      success: true, 
      data: updatedSubmission,
      message: `Submisi berhasil dinilai dan dinyatakan ${newStatus === SubmissionStatus.PASSED ? 'LULUS' : 'GAGAL'}`
    };
  } catch (error) {
    console.error("Error grading submission:", error);
    return { success: false, message: "Terjadi kesalahan saat menilai submisi" };
  }
}

// Mendapatkan daftar submisi yang perlu dinilai (wrapper untuk kompatibilitas)
export async function getPendingSubmissions() {
  return getPendingSubmissionsWithRawSQL();
} 