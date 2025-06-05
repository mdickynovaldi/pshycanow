import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

// Fungsi pembuat ID yang sangat unik
function generateSuperUniqueID(): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const randomNum = Math.floor(Math.random() * 1000000);
  return `DIRECTSUB_${timestamp}_${randomStr}_${randomNum}`;
}

// Gunakan koneksi langsung ke PostgreSQL tanpa model kompleks
const directPrisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Dapatkan session user
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Anda harus login untuk submit jawaban kuis"
      }, { status: 401 });
    }

    // Parse body request
    const body = await request.json();
    const { quizId, answers } = body;
    
    if (!quizId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({
        success: false,
        message: "Format data tidak valid"
      }, { status: 400 });
    }
    
    // Dapatkan data kuis
    const quiz = await directPrisma.quiz.findUnique({
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
    
    // Proses jawaban dengan evaluasi
    const processedAnswers = [];
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    let allCorrect = true;
    
    console.log(`Total pertanyaan dari kuis: ${totalQuestions}`);
    
    for (const answer of answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      
      if (question) {
        // Evaluasi jawaban secara otomatis
        let isCorrect = false;
        
        if (question.expectedAnswer && question.expectedAnswer.trim() !== "") {
          // Bandingkan jawaban dengan expected answer (case insensitive)
          isCorrect = question.expectedAnswer.trim().toLowerCase() === answer.answer.trim().toLowerCase();
          
          if (isCorrect) {
            correctCount++;
          } else {
            allCorrect = false;
          }
        } else {
          // Jika tidak ada expectedAnswer, jawaban dianggap salah
          isCorrect = false;
          allCorrect = false;
        }
        
        console.log(`Question: ${question.id}, Answer: "${answer.answer}", Expected: "${question.expectedAnswer || 'N/A'}", Correct: ${isCorrect}`);
        
        processedAnswers.push({
          questionId: question.id,
          studentAnswer: answer.answer,
          isCorrect: isCorrect
        });
      }
    }
    
    // Hitung skor
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    // Tentukan status kelulusan: PASSED jika semua benar, FAILED jika ada yang salah
    const submissionStatus = allCorrect ? 'PASSED' : 'FAILED';
    
    console.log(`Processed ${processedAnswers.length} answers, Correct: ${correctCount}/${totalQuestions}, Score: ${score}%, Status: ${submissionStatus}`);
    
    // PERBAIKAN: HAPUS LOGIC CLEANUP - Semua submission harus tersimpan sebagai attempt terpisah
    // Tidak ada penghapusan submission PENDING, semua percobaan harus disimpan
    
    // LANGKAH 1: Buat ID yang dijamin unik
    const submissionId = generateSuperUniqueID();
    console.log(`Generated super unique submission ID: ${submissionId}`);
    
    // LANGKAH 2: Dapatkan attempt number yang benar
    let attemptNumber = 1;
    try {
      // Hitung attempt number berdasarkan submission yang sudah ada
      const latestSubmission = await directPrisma.quizSubmission.findFirst({
        where: {
          quizId,
          studentId: userId
        },
        orderBy: {
          attemptNumber: 'desc'  // Urutkan berdasarkan attempt number, bukan created date
        }
      });
      
      if (latestSubmission) {
        attemptNumber = latestSubmission.attemptNumber + 1;
      }
      
      console.log(`Calculated attempt number: ${attemptNumber}`);
    } catch (e) {
      console.error("Error getting attempt number:", e);
    }
    
    // LANGKAH 3: Simpan submission TANPA menghapus yang lama
    try {
      // Tambahkan kolom correctAnswers, totalQuestions, dan score
      await directPrisma.$executeRaw`
        INSERT INTO "QuizSubmission" (
          "id", 
          "quizId", 
          "studentId", 
          "status",
          "createdAt", 
          "updatedAt",
          "attemptNumber",
          "score",
          "correctAnswers",
          "totalQuestions",
          "feedback"
        ) VALUES (
          ${submissionId}, 
          ${quizId}, 
          ${userId}, 
          CAST(${submissionStatus} AS "SubmissionStatus"),
          NOW(), 
          NOW(),
          ${attemptNumber},
          ${score},
          ${correctCount},
          ${totalQuestions},
          ${allCorrect ? 'Selamat! Anda menjawab semua pertanyaan dengan benar.' : `Anda menjawab benar ${correctCount} dari ${totalQuestions} pertanyaan.`}
        )
      `;
      
      console.log("Created submission successfully with status:", submissionStatus);
      
      // LANGKAH 4: Simpan setiap jawaban (dengan isCorrect)
      for (const answer of processedAnswers) {
        const answerId = generateSuperUniqueID();
        await directPrisma.$executeRaw`
          INSERT INTO "SubmissionAnswer" (
            "id",
            "answerText",
            "isCorrect",
            "submissionId",
            "questionId"
          ) VALUES (
            ${answerId},
            ${answer.studentAnswer},
            ${answer.isCorrect},
            ${submissionId},
            ${answer.questionId}
          )
        `;
      }
      
      // LANGKAH 5: Simpan progress dengan status kelulusan yg benar
      const existingProgress = await directPrisma.$queryRaw`
        SELECT * FROM "StudentQuizProgress" 
        WHERE "studentId" = ${userId} AND "quizId" = ${quizId} 
        LIMIT 1
      `;
      
      if (Array.isArray(existingProgress) && existingProgress.length > 0) {
        console.log("Updating existing progress");
        const progress = existingProgress[0];
        
        // VALIDASI UTAMA: Cek failedAttempts sebelum melakukan update
        const currentFailedAttempts = progress.failedAttempts || 0;
        const nextFailedAttempts = allCorrect ? currentFailedAttempts : currentFailedAttempts + 1;
        
        console.log(`Current failed attempts: ${currentFailedAttempts}, will become: ${nextFailedAttempts}, allCorrect: ${allCorrect}`);
        
        // Jika sudah 4x gagal, tidak boleh submit lagi
        if (currentFailedAttempts >= 4) {
          return NextResponse.json({
            success: false,
            message: "Anda telah mencapai batas maksimum 4 kali kegagalan untuk kuis ini dan tidak dapat mengerjakan kuis lagi"
          }, { status: 403 });
        }
        
        // Update progress dengan lastAttemptPassed berdasarkan hasil koreksi otomatis
        if (allCorrect) {
          // Jika semua jawaban benar
          await directPrisma.$executeRaw`
            UPDATE "StudentQuizProgress" 
            SET 
              "currentAttempt" = "currentAttempt" + 1,
              "lastAttemptPassed" = true,
              "finalStatus" = CAST('PASSED' AS "SubmissionStatus"),
              "assistanceRequired" = 'NONE',
              "nextStep" = 'QUIZ_PASSED',
              "updatedAt" = NOW()
            WHERE "id" = ${progress.id}
          `;
        } else {
          // Jika ada jawaban yang salah
          // Tentukan level bantuan berdasarkan FAILED ATTEMPTS, bukan current attempt
          let assistanceRequired = 'NONE';
          let nextStep = 'TRY_MAIN_QUIZ_AGAIN';
          let finalStatus = null;
          
          // GUNAKAN nextFailedAttempts untuk menentukan level bantuan
          if (nextFailedAttempts === 1) {
            // Kegagalan pertama -> cek bantuan level 1
            const hasLevel1 = await directPrisma.quiz.findUnique({
              where: { id: quizId },
              select: { assistanceLevel1: true }
            });
            
            if (hasLevel1 && hasLevel1.assistanceLevel1) {
              assistanceRequired = 'ASSISTANCE_LEVEL1';
              nextStep = 'COMPLETE_ASSISTANCE_LEVEL1';
              console.log("Kegagalan pertama: Mengalihkan ke bantuan level 1");
            }
          } else if (nextFailedAttempts === 2) {
            // Kegagalan kedua -> cek level 2
            const hasLevel2 = await directPrisma.quiz.findUnique({
              where: { id: quizId },
              select: { assistanceLevel2: true }
            });
            
            if (hasLevel2 && hasLevel2.assistanceLevel2) {
              assistanceRequired = 'ASSISTANCE_LEVEL2';
              nextStep = 'COMPLETE_ASSISTANCE_LEVEL2';
            }
          } else if (nextFailedAttempts === 3) {
            // Kegagalan ketiga -> cek level 3
            const hasLevel3 = await directPrisma.quiz.findUnique({
              where: { id: quizId },
              select: { assistanceLevel3: true }
            });
            
            if (hasLevel3 && hasLevel3.assistanceLevel3) {
              assistanceRequired = 'ASSISTANCE_LEVEL3';
              nextStep = 'VIEW_ASSISTANCE_LEVEL3';
            }
          } else if (nextFailedAttempts >= 4) {
            // Kegagalan keempat -> cek apakah sudah melalui semua bantuan yang tersedia
            // HANYA dinyatakan failed jika level 3 tidak tersedia atau sudah selesai
            const hasLevel3 = await directPrisma.quiz.findUnique({
              where: { id: quizId },
              select: { assistanceLevel3: true }
            });
            
            const progressDetails = await directPrisma.studentQuizProgress.findUnique({
              where: { id: progress.id },
              select: { level3Completed: true }
            });
            
            if (hasLevel3 && hasLevel3.assistanceLevel3 && !progressDetails?.level3Completed) {
              // Masih ada bantuan level 3 yang belum diselesaikan
              assistanceRequired = 'ASSISTANCE_LEVEL3';
              nextStep = 'VIEW_ASSISTANCE_LEVEL3';
              console.log("4th failed attempt: Directing to assistance level 3");
            } else {
              // Sudah 4x gagal DAN sudah melalui semua bantuan yang tersedia
              finalStatus = 'FAILED';
              nextStep = 'QUIZ_FAILED_MAX_ATTEMPTS';
              console.log("4th failed attempt: All assistance completed, marking as FAILED");
            }
          }
          
          // Query SQL untuk update progress ketika ada jawaban salah
          if (finalStatus) {
            await directPrisma.$executeRaw`
              UPDATE "StudentQuizProgress" 
              SET 
                "currentAttempt" = "currentAttempt" + 1,
                "lastAttemptPassed" = false,
                "failedAttempts" = "failedAttempts" + 1,
                "assistanceRequired" = CAST(${assistanceRequired} AS "AssistanceRequirement"),
                "nextStep" = ${nextStep},
                "finalStatus" = CAST(${finalStatus} AS "SubmissionStatus"),
                "updatedAt" = NOW()
              WHERE "id" = ${progress.id}
            `;
          } else {
            await directPrisma.$executeRaw`
              UPDATE "StudentQuizProgress" 
              SET 
                "currentAttempt" = "currentAttempt" + 1,
                "lastAttemptPassed" = false,
                "failedAttempts" = "failedAttempts" + 1,
                "assistanceRequired" = CAST(${assistanceRequired} AS "AssistanceRequirement"),
                "nextStep" = ${nextStep},
                "updatedAt" = NOW()
              WHERE "id" = ${progress.id}
            `;
          }
        }
      } else {
        console.log("Creating new progress");
        
        // Buat progress baru
        const progressId = generateSuperUniqueID();
        
        try {
          await directPrisma.$executeRaw`
            INSERT INTO "StudentQuizProgress" (
              "id", 
              "studentId", 
              "quizId", 
              "currentAttempt", 
              "lastAttemptPassed",
              "failedAttempts",
              "maxAttempts", 
              "assistanceRequired",
              "nextStep",
              "finalStatus",
              "level1Completed",
              "level2Completed",  
              "level3Completed",
              "createdAt", 
              "updatedAt"
            ) VALUES (
              ${progressId},
              ${userId},
              ${quizId},
              1,
              ${allCorrect},
              ${allCorrect ? 0 : 1},
              4,
              CAST(${allCorrect ? 'NONE' : 'ASSISTANCE_LEVEL1'} AS "AssistanceRequirement"),
              ${allCorrect ? 'QUIZ_PASSED' : 'COMPLETE_ASSISTANCE_LEVEL1'},
              ${allCorrect ? "CAST('PASSED' AS \"SubmissionStatus\")" : 'NULL'},
              false,
              false,
              false,
              NOW(),
              NOW()
            )
          `;
        } catch (progressError) {
          console.error("Error creating progress:", progressError);
          // Lanjutkan meskipun gagal membuat progress
        }
      }
      
      // Perbaiki pesan respons untuk menampilkan status aktual
      const responseMessage = allCorrect
        ? "Selamat! Anda menjawab semua pertanyaan dengan benar."
        : `Anda menjawab benar ${correctCount} dari ${totalQuestions} pertanyaan. Anda perlu bantuan lebih lanjut untuk memahami materi.`;
      
      return NextResponse.json({
        success: true,
        message: responseMessage,
        data: {
          submissionId,
          attemptNumber,
          score,
          correctCount,
          totalQuestions,
          status: submissionStatus,
          allCorrect
        }
      });
    } catch (dbError: unknown) {
      console.error("Database error:", dbError);
      // Tambahkan logging detail untuk membantu debugging
      const err = dbError as { code?: string; meta?: unknown; message?: string };
      if (err.code) console.error("Error code:", err.code);
      if (err.meta) console.error("Error meta:", err.meta);
      if (err.message) console.error("Error message:", err.message);

      // Jika masih terjadi error, coba dengan format query lama sebagai fallback
      try {
        // Alternatif fallback - gunakan hasil evaluasi otomatis (PASSED/FAILED) bukan PENDING
        const fallbackId = generateSuperUniqueID();

        await directPrisma.$executeRaw`
          INSERT INTO "QuizSubmission" (
            "id", 
            "quizId", 
            "studentId", 
            "status",
            "createdAt", 
            "updatedAt",
            "attemptNumber",
            "score",
            "correctAnswers",
            "totalQuestions",
            "feedback"
          ) VALUES (
            ${fallbackId}, 
            ${quizId}, 
            ${userId}, 
            CAST(${submissionStatus} AS "SubmissionStatus"),
            NOW(), 
            NOW(),
            ${attemptNumber},
            ${score},
            ${correctCount},
            ${totalQuestions},
            ${allCorrect ? 'Selamat! Anda menjawab semua pertanyaan dengan benar.' : `Anda menjawab benar ${correctCount} dari ${totalQuestions} pertanyaan.`}
          )
        `;

        for (const answer of processedAnswers) {
          const answerIdFallback = generateSuperUniqueID();
          await directPrisma.$executeRaw`
            INSERT INTO "SubmissionAnswer" (
              "id",
              "answerText",
              "isCorrect",
              "submissionId",
              "questionId"
            ) VALUES (
              ${answerIdFallback},
              ${answer.studentAnswer},
              ${answer.isCorrect},
              ${fallbackId},
              ${answer.questionId}
            )
          `;
        }

        // Update student progress juga dalam fallback
        const existingProgressFallback = await directPrisma.$queryRaw`
          SELECT * FROM "StudentQuizProgress" 
          WHERE "studentId" = ${userId} AND "quizId" = ${quizId} 
          LIMIT 1
        `;
        
        if (Array.isArray(existingProgressFallback) && existingProgressFallback.length > 0) {
          const progress = existingProgressFallback[0];
          
          // VALIDASI UTAMA: Cek failedAttempts sebelum melakukan update fallback
          const currentFailedAttempts = progress.failedAttempts || 0;
          const nextFailedAttempts = allCorrect ? currentFailedAttempts : currentFailedAttempts + 1;
          
          console.log(`Fallback - Current failed attempts: ${currentFailedAttempts}, will become: ${nextFailedAttempts}, allCorrect: ${allCorrect}`);
          
          // Jika sudah 4x gagal, tidak boleh submit lagi
          if (currentFailedAttempts >= 4) {
            return NextResponse.json({
              success: false,
              message: "Anda telah mencapai batas maksimum 4 kali kegagalan untuk kuis ini dan tidak dapat mengerjakan kuis lagi"
            }, { status: 403 });
          }
          
          if (allCorrect) {
            // Jika semua jawaban benar
            await directPrisma.$executeRaw`
              UPDATE "StudentQuizProgress" 
              SET 
                "currentAttempt" = "currentAttempt" + 1,
                "lastAttemptPassed" = true,
                "finalStatus" = CAST('PASSED' AS "SubmissionStatus"),
                "assistanceRequired" = 'NONE',
                "nextStep" = 'QUIZ_PASSED',
                "updatedAt" = NOW()
              WHERE "id" = ${progress.id}
            `;
          } else {
            // Jika ada jawaban yang salah, gunakan logika failedAttempts
            let assistanceRequired = 'NONE';
            let nextStep = 'TRY_MAIN_QUIZ_AGAIN';
            let finalStatus = null;
            
            if (nextFailedAttempts === 1) {
              assistanceRequired = 'ASSISTANCE_LEVEL1';
              nextStep = 'COMPLETE_ASSISTANCE_LEVEL1';
            } else if (nextFailedAttempts === 2) {
              assistanceRequired = 'ASSISTANCE_LEVEL2';
              nextStep = 'COMPLETE_ASSISTANCE_LEVEL2';
            } else if (nextFailedAttempts === 3) {
              assistanceRequired = 'ASSISTANCE_LEVEL3';
              nextStep = 'VIEW_ASSISTANCE_LEVEL3';
            } else if (nextFailedAttempts >= 4) {
              // Kegagalan keempat -> cek apakah sudah melalui semua bantuan yang tersedia
              // HANYA dinyatakan failed jika level 3 tidak tersedia atau sudah selesai
              const hasLevel3 = await directPrisma.quiz.findUnique({
                where: { id: quizId },
                select: { assistanceLevel3: true }
              });
              
              const progressDetails = await directPrisma.studentQuizProgress.findUnique({
                where: { id: progress.id },
                select: { level3Completed: true }
              });
              
              if (hasLevel3 && hasLevel3.assistanceLevel3 && !progressDetails?.level3Completed) {
                // Masih ada bantuan level 3 yang belum diselesaikan
                assistanceRequired = 'ASSISTANCE_LEVEL3';
                nextStep = 'VIEW_ASSISTANCE_LEVEL3';
                console.log("Fallback: 4th failed attempt: Directing to assistance level 3");
              } else {
                // Sudah 4x gagal DAN sudah melalui semua bantuan yang tersedia
                finalStatus = 'FAILED';
                nextStep = 'QUIZ_FAILED_MAX_ATTEMPTS';
                console.log("Fallback: 4th failed attempt: All assistance completed, marking as FAILED");
              }
            }
            
            // Query SQL untuk update progress ketika ada jawaban salah
            if (finalStatus) {
              await directPrisma.$executeRaw`
                UPDATE "StudentQuizProgress" 
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = false,
                  "failedAttempts" = "failedAttempts" + 1,
                  "assistanceRequired" = CAST(${assistanceRequired} AS "AssistanceRequirement"),
                  "nextStep" = ${nextStep},
                  "finalStatus" = CAST(${finalStatus} AS "SubmissionStatus"),
                  "updatedAt" = NOW()
                WHERE "id" = ${progress.id}
              `;
            } else {
              await directPrisma.$executeRaw`
                UPDATE "StudentQuizProgress" 
                SET 
                  "currentAttempt" = "currentAttempt" + 1,
                  "lastAttemptPassed" = false,
                  "failedAttempts" = "failedAttempts" + 1,
                  "assistanceRequired" = CAST(${assistanceRequired} AS "AssistanceRequirement"),
                  "nextStep" = ${nextStep},
                  "updatedAt" = NOW()
                WHERE "id" = ${progress.id}
              `;
            }
          }
        } else {
          // Buat progress baru jika belum ada
          const progressIdFallback = generateSuperUniqueID();
          await directPrisma.$executeRaw`
            INSERT INTO "StudentQuizProgress" (
              "id", 
              "studentId", 
              "quizId", 
              "currentAttempt", 
              "lastAttemptPassed",
              "failedAttempts",
              "maxAttempts", 
              "assistanceRequired",
              "nextStep",
              "finalStatus",
              "level1Completed",
              "level2Completed",  
              "level3Completed",
              "createdAt", 
              "updatedAt"
            ) VALUES (
              ${progressIdFallback},
              ${userId},
              ${quizId},
              1,
              ${allCorrect},
              ${allCorrect ? 0 : 1},
              4,
              CAST(${allCorrect ? 'NONE' : 'ASSISTANCE_LEVEL1'} AS "AssistanceRequirement"),
              ${allCorrect ? 'QUIZ_PASSED' : 'COMPLETE_ASSISTANCE_LEVEL1'},
              ${allCorrect ? "CAST('PASSED' AS \"SubmissionStatus\")" : 'NULL'},
              false,
              false,
              false,
              NOW(),
              NOW()
            )
          `;
        }

        const responseMessage = allCorrect
          ? "Selamat! Anda menjawab semua pertanyaan dengan benar."
          : `Anda menjawab benar ${correctCount} dari ${totalQuestions} pertanyaan. Anda perlu mengerjakan bantuan level 1.`;

        return NextResponse.json({
          success: true,
          message: responseMessage,
          data: {
            submissionId: fallbackId,
            attemptNumber,
            score,
            correctCount,
            totalQuestions,
            status: submissionStatus,
            allCorrect
          }
        });
      } catch (finalError: unknown) {
        console.error("Database error (final fallback):", finalError);
        // Pastikan ada respons jika semua gagal
        return NextResponse.json({
          success: false,
          message: "Terjadi kesalahan saat menyimpan jawaban Anda. Silakan coba lagi."
        }, { status: 500 });
      }
    }
  } catch (error: unknown) {
    console.error("General error:", error);
    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan internal. Silakan coba lagi nanti."
    }, { status: 500 });
  } finally {
    // Selalu tutup koneksi Prisma
    await directPrisma.$disconnect();
  }
} 