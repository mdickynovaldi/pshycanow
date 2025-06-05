import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Enum ProgressStatus dihapus karena skema menggunakan finalStatus: String?
// dan field boolean individual untuk completedAssistanceLevels.
// Enum AssistanceRequirement akan diambil dari Prisma Client secara otomatis jika diperlukan.

const AnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
});

const SubmitQuizSchema = z.object({
  quizId: z.string(),
  answers: z.array(AnswerSchema),
});

// Fungsi untuk membuat ID yang sangat unik dengan waktu mikrodetik
const generateUniqueID = (): string => {
  // Timestamp + Random String + Random Number
  return `QUIZ_${Date.now()}_${Math.random().toString(36).substring(2, 10)}_${Math.floor(Math.random() * 1000000)}`;
};

export async function POST(request: Request) {
  try {
    // 1. Get user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Anda harus login untuk submit jawaban kuis"
      }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const validation = SubmitQuizSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        message: "Format data tidak valid",
        errors: validation.error.format()
      }, { status: 400 });
    }
    
    const { quizId, answers } = validation.data;
    
    // 3. Get quiz data
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true
      }
    });
    
    if (!quiz) {
      return NextResponse.json({
        success: false,
        message: "Kuis tidak ditemukan"
      }, { status: 404 });
    }
    
    console.log(`Processing quiz submission for quizId: ${quizId}, userId: ${userId}`);
    
    // 4. Calculate score
    let correctCount = 0;
    const totalCount = quiz.questions.length;
    
    for (const answer of answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      
      if (question && question.expectedAnswer && 
          answer.answer.toLowerCase().trim() === 
          question.expectedAnswer.toLowerCase().trim()) {
        correctCount++;
      }
    }
    
    const totalScore = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const passed = totalScore >= 70; // Default passing score
    
    console.log(`Score: ${totalScore.toFixed(2)}%, Passed: ${passed}, Correct: ${correctCount}/${totalCount}`);
    
    // Tentukan status submission berdasarkan penilaian otomatis
    const submissionStatus = passed ? 'PASSED' : 'PENDING';
    
    // 5. Simpan dengan pendekatan SQL mentah
    try {
      // PERBAIKAN: HAPUS LOGIC CLEANUP - Semua submission harus tersimpan sebagai attempt terpisah
      // Tidak ada penghapusan submission PENDING, semua percobaan harus disimpan
      
      // LANGKAH 1: Buat ID yang dijamin unik
      const submissionId = generateUniqueID();
      console.log(`Generated unique ID: ${submissionId}`);

      // LANGKAH 2: Dapatkan attempt number yang benar
      let attemptNumber = 1;
      try {
        // Hitung attempt number berdasarkan submission yang sudah ada (bukan dari progress)
        const existingSubmissions = await prisma.$queryRaw`
          SELECT MAX("attemptNumber") as max_attempt FROM "QuizSubmission" 
          WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
        `;
        
        if (Array.isArray(existingSubmissions) && existingSubmissions.length > 0 && existingSubmissions[0].max_attempt) {
          attemptNumber = Number(existingSubmissions[0].max_attempt) + 1;
        }
        
        console.log(`Calculated attempt number: ${attemptNumber}`);
      } catch (e) {
        console.error("Error getting attempt number:", e);
      }
      
      // LANGKAH 3: Insert QuizSubmission TANPA menghapus yang lama
      await prisma.$executeRaw`
        INSERT INTO "QuizSubmission" (
          "id", "quizId", "studentId", "status", "attemptNumber", 
          "score", "correctAnswers", "totalQuestions",
          "createdAt", "updatedAt"
        ) VALUES (
          ${submissionId}, ${quizId}, ${userId}, 
          CAST(${submissionStatus} AS "SubmissionStatus"), ${attemptNumber},
          ${Math.round(totalScore)}, ${correctCount}, ${totalCount},
          NOW(), NOW()
        )
      `;
      
      console.log(`Created QuizSubmission with attempt number: ${attemptNumber}`);
      
      // LANGKAH 4: Insert SubmissionAnswer untuk setiap jawaban
      for (const answer of answers) {
        const question = quiz.questions.find(q => q.id === answer.questionId);
        
        if (question) {
          const isCorrect = question.expectedAnswer && 
                        answer.answer.toLowerCase().trim() === 
                        question.expectedAnswer.toLowerCase().trim();
          
          const answerId = generateUniqueID();
          
          await prisma.$executeRaw`
            INSERT INTO "SubmissionAnswer" (
              "id", "submissionId", "questionId", "answerText", "isCorrect"
            ) VALUES (
              ${answerId}, ${submissionId}, ${answer.questionId}, ${answer.answer}, ${isCorrect}
            )
          `;
        }
      }
      
      console.log("Created SubmissionAnswers");
      
      // LANGKAH 5: Update StudentQuizProgress
      const progressExists = await prisma.$queryRaw`
        SELECT 1 FROM "StudentQuizProgress" WHERE "studentId" = ${userId} AND "quizId" = ${quizId} LIMIT 1
      `;
      
      if (Array.isArray(progressExists) && progressExists.length > 0) {
        // Update progress yang sudah ada
        try {
          // Ambil data progress saat ini untuk cek percobaan ke berapa
          const currentProgressData = await prisma.$queryRaw`
            SELECT "currentAttempt", "level1Completed", "level2Completed", "level3Completed", "failedAttempts" FROM "StudentQuizProgress" 
            WHERE "studentId" = ${userId} AND "quizId" = ${quizId} LIMIT 1
          `;
          
          const currentAttempt = Array.isArray(currentProgressData) && currentProgressData.length > 0 
            ? Number(currentProgressData[0].currentAttempt) || 0 
            : 0;
          
          const level1Completed = Array.isArray(currentProgressData) && currentProgressData.length > 0 
            ? Boolean(currentProgressData[0].level1Completed) 
            : false;
          
          const level2Completed = Array.isArray(currentProgressData) && currentProgressData.length > 0 
            ? Boolean(currentProgressData[0].level2Completed) 
            : false;
          
          const level3Completed = Array.isArray(currentProgressData) && currentProgressData.length > 0 
            ? Boolean(currentProgressData[0].level3Completed) 
            : false;
            
          // TAMBAHAN: Ambil failedAttempts untuk validasi utama
          const currentFailedAttempts = Array.isArray(currentProgressData) && currentProgressData.length > 0 
            ? Number(currentProgressData[0].failedAttempts) || 0 
            : 0;
            
          const nextFailedAttempts = passed ? currentFailedAttempts : currentFailedAttempts + 1;
            
          console.log(`Current attempt: ${currentAttempt}, Level 1 completed: ${level1Completed}, Level 2 completed: ${level2Completed}, Level 3 completed: ${level3Completed}, Current failed attempts: ${currentFailedAttempts}, Next failed attempts: ${nextFailedAttempts}`);
          
          // VALIDASI UTAMA: Cek failedAttempts sebelum melakukan update
          if (currentFailedAttempts >= 4) {
            return NextResponse.json({
              success: false,
              message: "Anda telah mencapai batas maksimum 4 kali kegagalan untuk kuis ini dan tidak dapat mengerjakan kuis lagi"
            }, { status: 403 });
          }
          
          // Gunakan logika failedAttempts untuk menentukan alur berikutnya
          if (nextFailedAttempts === 1 && !passed) {
            // Kegagalan pertama -> arahkan ke bantuan level 1 (jika tersedia)
            const quizWithAssistance = await prisma.quiz.findUnique({
              where: { id: quizId },
              select: { assistanceLevel1: true }
            });
            
            if (quizWithAssistance?.assistanceLevel1) {
              await prisma.$executeRaw`
                UPDATE "StudentQuizProgress"
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = ${passed},
                  "failedAttempts" = "failedAttempts" + 1,
                  "assistanceRequired" = CAST('ASSISTANCE_LEVEL1' AS "AssistanceRequirement"),
                  "updatedAt" = NOW()
                WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
              `;
              
              console.log("Kegagalan pertama: Mengarahkan ke bantuan level 1");
              
              return NextResponse.json({
                success: true,
                message: "Masih ada jawaban yang kurang tepat. Anda akan diarahkan ke bantuan level 1.",
                data: {
                  submissionId,
                  score: totalScore,
                  passed: false,
                  nextAction: "assistance_level_1"
                }
              });
            }
          } else if (nextFailedAttempts === 2 && !passed) {
            // Kegagalan kedua -> arahkan ke bantuan level 2 (jika tersedia)
            const quizWithAssistance = await prisma.quiz.findUnique({
              where: { id: quizId },
              select: { assistanceLevel2: true }
            });
            
            if (quizWithAssistance?.assistanceLevel2) {
              await prisma.$executeRaw`
                UPDATE "StudentQuizProgress"
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = ${passed},
                  "failedAttempts" = "failedAttempts" + 1,
                  "assistanceRequired" = CAST('ASSISTANCE_LEVEL2' AS "AssistanceRequirement"),
                  "updatedAt" = NOW()
                WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
              `;
              
              console.log("Kegagalan kedua: Mengarahkan ke bantuan level 2");
              
              return NextResponse.json({
                success: true,
                message: "Masih ada jawaban yang kurang tepat. Anda akan diarahkan ke bantuan level 2.",
                data: {
                  submissionId,
                  score: totalScore,
                  passed: false,
                  nextAction: "assistance_level_2"
                }
              });
            }
          } else if (nextFailedAttempts === 3 && !passed) {
            // Kegagalan ketiga -> arahkan ke bantuan level 3 (jika tersedia)
            const quizWithAssistance = await prisma.quiz.findUnique({
              where: { id: quizId },
              select: { assistanceLevel3: true }
            });
            
            if (quizWithAssistance?.assistanceLevel3) {
              await prisma.$executeRaw`
                UPDATE "StudentQuizProgress"
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = ${passed},
                  "failedAttempts" = "failedAttempts" + 1,
                  "assistanceRequired" = CAST('ASSISTANCE_LEVEL3' AS "AssistanceRequirement"),
                  "updatedAt" = NOW()
                WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
              `;
              
              console.log("Kegagalan ketiga: Mengarahkan ke bantuan level 3");
              
              return NextResponse.json({
                success: true,
                message: "Masih ada jawaban yang kurang tepat. Anda akan diarahkan ke bantuan level 3.",
                data: {
                  submissionId,
                  score: totalScore,
                  passed: false,
                  nextAction: "assistance_level_3"
                }
              });
            }
          } else if (nextFailedAttempts >= 4 && !passed) {
            // Cek apakah sudah menyelesaikan bantuan level 3 dan kuis masih gagal
            // HANYA dinyatakan failed jika level 3 sudah selesai atau tidak tersedia
            
            // Cek apakah quiz memiliki bantuan level 3
            const quizWithAssistance = await prisma.quiz.findUnique({
              where: { id: quizId },
              select: { assistanceLevel3: true }
            });
            
            if (quizWithAssistance?.assistanceLevel3 && !level3Completed) {
              // Masih ada bantuan level 3 yang belum diselesaikan
              await prisma.$executeRaw`
                UPDATE "StudentQuizProgress"
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = ${passed},
                  "failedAttempts" = "failedAttempts" + 1,
                  "assistanceRequired" = CAST('ASSISTANCE_LEVEL3' AS "AssistanceRequirement"),
                  "updatedAt" = NOW()
                WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
              `;
              
              console.log("Kegagalan keempat: Masih ada bantuan level 3 yang tersedia");
              
              return NextResponse.json({
                success: true,
                message: "Masih ada jawaban yang kurang tepat. Anda akan diarahkan ke bantuan level 3.",
                data: {
                  submissionId,
                  score: totalScore,
                  passed: false,
                  nextAction: "assistance_level_3"
                }
              });
            } else {
              // Sudah 4x gagal DAN sudah melalui semua bantuan yang tersedia, tandai sebagai final failed
              await prisma.$executeRaw`
                UPDATE "StudentQuizProgress"
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = ${passed},
                  "failedAttempts" = "failedAttempts" + 1,
                  "finalStatus" = CAST('FAILED' AS "SubmissionStatus"),
                  "assistanceRequired" = CAST('NONE' AS "AssistanceRequirement"),
                  "updatedAt" = NOW()
                WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
              `;
              
              console.log("Kegagalan keempat: Semua bantuan sudah selesai, menandai sebagai FAILED");
              
              return NextResponse.json({
                success: true,
                message: "Anda telah mencapai batas maksimum 4 kali kegagalan. Silakan hubungi pengajar untuk panduan lebih lanjut.",
                data: {
                  submissionId,
                  score: totalScore,
                  passed: false,
                  nextAction: "quiz_failed"
                }
              });
            }
          } 
          else {
            // Update progress normal untuk percobaan lainnya (passed atau failed attempts belum mencapai batas)
            if (passed) {
              // Jika lulus, set finalStatus ke PASSED dan reset assistanceRequired
              await prisma.$executeRaw`
                UPDATE "StudentQuizProgress"
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = ${passed},
                  "finalStatus" = CAST('PASSED' AS "SubmissionStatus"),
                  "assistanceRequired" = CAST('NONE' AS "AssistanceRequirement"),
                  "lastSubmissionId" = ${submissionId},
                  "updatedAt" = NOW()
                WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
              `;
              
              console.log(`Student passed! Updated StudentQuizProgress with PASSED status.`);
            } else {
              // Jika belum lulus, update progress normal
              await prisma.$executeRaw`
                UPDATE "StudentQuizProgress"
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = ${passed},
                  "failedAttempts" = "failedAttempts" + 1,
                  "lastSubmissionId" = ${submissionId},
                  "updatedAt" = NOW()
                WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
              `;
              
              console.log(`Updated StudentQuizProgress normally. Passed: ${passed}`);
            }
          }
        } catch (progressUpdateError) {
          console.error("Error updating progress:", progressUpdateError);
        }
      } else {
        // Buat progress baru
        const progressId = generateUniqueID();
        
        try {
          if (passed) {
            // Jika lulus di percobaan pertama, langsung set finalStatus ke PASSED
            await prisma.$executeRaw`
              INSERT INTO "StudentQuizProgress" (
                "id", "studentId", "quizId", "currentAttempt", "lastAttemptPassed",
                "maxAttempts", "assistanceRequired", "finalStatus",
                "level1Completed", "level2Completed", "level3Completed",
                "lastSubmissionId", "createdAt", "updatedAt"
              ) VALUES (
                ${progressId}, ${userId}, ${quizId}, 1, ${passed},
                4, CAST('NONE' AS "AssistanceRequirement"), CAST('PASSED' AS "SubmissionStatus"),
                false, false, false,
                ${submissionId}, NOW(), NOW()
              )
            `;
            
            console.log("Created new StudentQuizProgress with PASSED status");
          } else {
            // Jika belum lulus, buat progress normal
            await prisma.$executeRaw`
              INSERT INTO "StudentQuizProgress" (
                "id", "studentId", "quizId", "currentAttempt", "lastAttemptPassed",
                "maxAttempts", "assistanceRequired", "failedAttempts",
                "level1Completed", "level2Completed", "level3Completed",
                "lastSubmissionId", "createdAt", "updatedAt"
              ) VALUES (
                ${progressId}, ${userId}, ${quizId}, 1, ${passed},
                4, CAST('NONE' AS "AssistanceRequirement"), 1,
                false, false, false,
                ${submissionId}, NOW(), NOW()
              )
            `;
            
            console.log("Created new StudentQuizProgress");
          }
        } catch (newProgressError) {
          console.error("Error creating new progress:", newProgressError);
        }
      }
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: passed ? 
          "🎉 Selamat! Anda telah berhasil menyelesaikan kuis ini dengan skor di atas 70%. Status Anda otomatis LULUS!" : 
          "Terima kasih telah mengerjakan kuis. Skor Anda belum mencapai 70%, silakan ikuti bantuan yang tersedia untuk meningkatkan pemahaman.",
        data: {
          submissionId,
          score: totalScore,
          passed,
          status: submissionStatus,
          autoGraded: true
        }
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      
      // Coba dengan ID alternatif jika terjadi error duplikat
      if (error instanceof Error && error.message.includes('duplicate key')) {
        try {
          // Coba sekali lagi dengan strategi alternatif
          console.log("Trying alternative approach for ID collision...");
          
          // ID yang sangat spesifik
          const alternativeId = `RETRY_${userId.substring(0, 4)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          // Dapatkan attempt number
          let attemptNumber = 1;
          try {
            const progressResult = await prisma.$queryRaw`
              SELECT "currentAttempt" FROM "StudentQuizProgress" 
              WHERE "studentId" = ${userId} AND "quizId" = ${quizId} LIMIT 1
            `;
            
            if (Array.isArray(progressResult) && progressResult.length > 0) {
              attemptNumber = Number(progressResult[0].currentAttempt) || 1;
            }
          } catch (e) {
            console.error("Error getting attempt number:", e);
          }
          
          await prisma.$executeRaw`
            INSERT INTO "QuizSubmission" (
              "id", "quizId", "studentId", "status", "attemptNumber",
              "score", "correctAnswers", "totalQuestions",
              "createdAt", "updatedAt"
            ) VALUES (
              ${alternativeId}, ${quizId}, ${userId}, 
              CAST(${submissionStatus} AS "SubmissionStatus"), ${attemptNumber},
              ${Math.round(totalScore)}, ${correctCount}, ${totalCount},
              NOW(), NOW()
            )
          `;
          
          return NextResponse.json({
            success: true,
            message: passed ?
              "🎉 Selamat! Anda telah berhasil menyelesaikan kuis ini dengan skor di atas 70%. Status Anda otomatis LULUS!" :
              "Jawaban berhasil disimpan. Skor Anda belum mencapai 70%, silakan ikuti bantuan yang tersedia untuk meningkatkan pemahaman.",
            data: {
              submissionId: alternativeId,
              score: totalScore,
              passed,
              status: submissionStatus,
              autoGraded: true
            }
          });
        } catch (retryError) {
          console.error("Retry also failed:", retryError);
        }
      }
      
      return NextResponse.json({
        success: false,
        message: "Terjadi kesalahan saat mengirim jawaban kuis. Silakan coba lagi nanti."
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error submitting quiz answers:", error);
    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan saat memproses jawaban. Silakan coba lagi nanti."
    }, { status: 500 });
  }
}

// Endpoint untuk menandai Kuis Bantuan sebagai selesai dan mengarahkan kembali ke Kuis Utama
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quizId, completedAssistanceLevel } = z.object({
      quizId: z.string(),
      completedAssistanceLevel: z.number().min(1).max(3),
    }).parse(body);

    const studentProgress = await prisma.studentQuizProgress.findUnique({
      where: { studentId_quizId: { studentId: userId, quizId } },
    });

    if (!studentProgress) {
      return NextResponse.json({ success: false, message: "Progress kuis tidak ditemukan." }, { status: 404 });
    }
    
    // Siapkan data untuk update berdasarkan level bantuan yang diselesaikan
    const updateData: {
        finalStatus?: 'PASSED' | 'FAILED' | null; // Changed from any to specific types
        assistanceRequired?: 'NONE' | 'ASSISTANCE_LEVEL1' | 'ASSISTANCE_LEVEL2' | 'ASSISTANCE_LEVEL3'; // Changed from any to specific types
        level1Completed?: boolean;
        level2Completed?: boolean;
        level3Completed?: boolean;
        nextStep?: string;
        updatedAt: Date;
    } = { updatedAt: new Date() };

    // Set status ke null karena belum final - masih harus mengerjakan kuis utama
    updateData.finalStatus = null;
    
    // Tidak ada lagi bantuan yang diperlukan setelah menyelesaikan level bantuan saat ini
    updateData.assistanceRequired = "NONE";

    // Update field level yang sesuai berdasarkan level bantuan yang diselesaikan
    if (completedAssistanceLevel === 1) {
      updateData.level1Completed = true;
      updateData.nextStep = "TRY_MAIN_QUIZ_AGAIN";
    } else if (completedAssistanceLevel === 2) {
      updateData.level2Completed = true;
      updateData.nextStep = "TRY_MAIN_QUIZ_AGAIN";
    } else if (completedAssistanceLevel === 3) {
      updateData.level3Completed = true;
      updateData.nextStep = "TRY_MAIN_QUIZ_AGAIN";
    }
    
    // Update progress siswa
    const updatedProgress = await prisma.studentQuizProgress.update({
      where: { id: studentProgress.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Bantuan level ${completedAssistanceLevel} selesai. Anda akan diarahkan kembali ke kuis utama.`,
      data: {
        quizId: quizId,
        nextAction: "take_main_quiz", 
        currentAttemptMainQuiz: updatedProgress.currentAttempt, 
      },
    });

  } catch (error) {
    console.error("Error updating assistance progress:", error);
    let errorMessage = "Gagal memperbarui progres bantuan.";
    if (error instanceof z.ZodError) {
        errorMessage = "Data input tidak valid.";
    }
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        errorDetails: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 