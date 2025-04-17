"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { 
  QuizSubmissionInput, 
  SubmissionGradingInput, 
  quizSubmissionSchema,
  submissionGradingSchema
} from "@/lib/validations/quiz-submission";
import { SubmissionStatus, AssistanceRequirement } from "@prisma/client";
import type { Quiz, QuizSubmission } from "@prisma/client";
import { z } from "zod";

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
    
    // Dapatkan informasi tentang upaya sebelumnya
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
    
    // Batasi hingga 4 percobaan
    if (currentAttemptNumber > 4 && !hasPendingAttempt) {
      return { 
        success: false, 
        message: "Anda telah mencapai batas maksimum 4 percobaan untuk kuis ini" 
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
        
        return {
          ...quiz,
          attemptInfo: {
            attemptCount,
            hasPendingAttempt,
            hasPassed,
            lastAttempt
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

// Schemas untuk validasi
const AnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string()
});

const SubmitQuizSchema = z.object({
  quizId: z.string(),
  answers: z.array(AnswerSchema)
});

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
        class: true
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
    
    // Ambil jawaban dari form data
    for (const question of quiz.questions) {
      const answer = formData.get(`answer_${question.id}`);
      if (answer) {
        answersData.push({
          questionId: question.id,
          studentAnswer: answer.toString(),
          correctAnswer: question.expectedAnswer || '',
          // Tidak lagi menentukan isCorrect otomatis
        });
      }
    }

    console.log("Collected answers:", answersData.length);

    // Dapatkan attemptNumber berdasarkan submisi sebelumnya
    let attemptNumber = 1;
    const lastSubmission = await prisma.quizSubmission.findFirst({
      where: {
        quizId,
        studentId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (lastSubmission) {
      // Jika ada submisi sebelumnya, increment attempt number
      attemptNumber = lastSubmission.attemptNumber + 1;
    }
    
    console.log(`Using attempt number: ${attemptNumber}`);

    // Simpan submisi
    const submission = await prisma.quizSubmission.create({
      data: {
        quizId,
        studentId: userId,
        status: "PENDING", // Simpan dengan status PENDING agar bisa dinilai guru
        attemptNumber: attemptNumber,
        feedback: null
      }
    });

    console.log("Created submission:", submission.id);
    
    // Simpan jawaban dengan isCorrect null (menunggu penilaian guru)
    for (const answer of answersData) {
      console.log(`Menyimpan jawaban untuk pertanyaan ${answer.questionId}: "${answer.studentAnswer}" (menunggu penilaian)`);
      await prisma.submissionAnswer.create({
        data: {
          submissionId: submission.id,
          questionId: answer.questionId,
          answerText: answer.studentAnswer,
          isCorrect: null // Ubah menjadi null, menunggu penilaian guru
        }
      });
    }
    
    console.log("Created answers for submission");

    // Update progress siswa
    let progress = await prisma.studentQuizProgress.findFirst({
      where: {
        studentId: userId,
        quizId
      }
    });

    if (!progress) {
      // Buat progress baru
      progress = await prisma.studentQuizProgress.create({
        data: {
          studentId: userId,
          quizId,
          currentAttempt: 1,
          lastAttemptPassed: false,
          assistanceRequired: false
        }
      });
      console.log("Created new progress");
    } else {
      // Update progress
      const newAttempt = progress.currentAttempt + 1;
      
      // Tentukan level bantuan
      let assistanceLevel = false;
      if (newAttempt === 2) assistanceLevel = true;
      else if (newAttempt === 3) assistanceLevel = true;
      else if (newAttempt >= 4) assistanceLevel = true;
      
      await prisma.studentQuizProgress.update({
        where: { id: progress.id },
        data: {
          currentAttempt: newAttempt,
          lastAttemptPassed: assistanceLevel,
          assistanceRequired: assistanceLevel
        }
      });
      console.log("Updated progress, new attempt:", newAttempt);
    }

    // Revalidasi halaman
    revalidatePath(`/student/quizzes/${quizId}`);

    return {
      success: true,
      message: "Jawaban berhasil disimpan. Silakan tunggu penilaian dari guru.",
      data: {
        submissionId: submission.id,
        attemptNumber: attemptNumber
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
  const access = await checkStudentAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: quizId,
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
        attemptNumber: 'desc'
      }
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
    // Jika studentId tidak diberikan, gunakan session user
    let userId;
    
    if (!studentId) {
      const session = await getServerSession(authOptions);
      
      if (!session?.user) {
        return { success: false, message: "Anda harus login terlebih dahulu" };
      }
      
      if (session.user.role !== UserRole.STUDENT) {
        return { success: false, message: "Hanya siswa yang dapat melihat status kuis" };
      }
      
      userId = session.user.id;
    } else {
      userId = studentId;
    }
    
    // Dapatkan kuis
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Dapatkan progress siswa
    let progress = await prisma.studentQuizProgress.findFirst({
      where: {
        studentId: userId,
        quizId
      }
    });
    
    // Jika belum ada progress, buat default
    if (!progress) {
      progress = {
        id: "",
        studentId: userId,
        quizId,
        currentAttempt: 1,
        maxAttempts: 4,
        lastAttemptPassed: false,
        level1Completed: false,
        level2Submitted: false,
        level2Completed: false,
        level3Completed: false,
        assistanceRequired: false,
        finalStatus: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // Dapatkan submisi terakhir jika ada
    let lastSubmission = null;
    if (progress.lastSubmissionId) {
      lastSubmission = await prisma.quizSubmission.findUnique({
        where: { id: progress.lastSubmissionId }
      });
    }
    
    // Cek apakah bantuan telah diselesaikan
    const assistanceStatus = {
      level1: {
        required: progress.assistanceRequired,
        completed: progress.level1Completed,
        available: await hasAssistanceLevel1(quizId)
      },
      level2: {
        required: progress.assistanceRequired,
        submitted: progress.level2Submitted,
        completed: progress.level2Completed,
        available: await hasAssistanceLevel2(quizId)
      },
      level3: {
        required: progress.assistanceRequired,
        completed: progress.level3Completed,
        available: await hasAssistanceLevel3(quizId)
      }
    };
    
    return {
      success: true,
      data: {
        quizId,
        currentAttempt: progress.currentAttempt,
        maxAttempts: progress.maxAttempts,
        lastAttemptPassed: progress.lastAttemptPassed,
        attemptsRemaining: Math.max(0, progress.maxAttempts - progress.currentAttempt + 1),
        assistanceRequired: progress.assistanceRequired,
        assistanceStatus,
        lastSubmission,
        canTakeQuiz: (
          // Dapat mengambil kuis jika:
          // 1. Belum mencapai batas maksimum percobaan
          progress.currentAttempt <= progress.maxAttempts &&
          // 2. Tidak ada status final atau status final bukan "failed"
          progress.finalStatus !== "failed" &&
          // 3. Tidak memerlukan bantuan atau bantuan telah selesai
          (progress.assistanceRequired === false ||
            (progress.assistanceRequired && progress.level1Completed) ||
            (progress.assistanceRequired && progress.level2Completed) ||
            (progress.assistanceRequired && progress.level3Completed)
          )
        ),
        finalStatus: progress.finalStatus
      }
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
        },
        status: "PENDING"
      },
      include: {
        quiz: {
          include: {
            class: true
          }
        },
        student: true
      }
    });
    
    console.log(`Menemukan ${pendingSubmissions.length} submisi pending`);
    
    // Format data untuk UI
    const formattedSubmissions = pendingSubmissions.map(sub => ({
      id: sub.id,
      quizId: sub.quizId,
      studentId: sub.studentId,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      attemptNumber: sub.attemptNumber,
      status: sub.status,
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
    let totalQuestions = submission.answers.length;
    
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