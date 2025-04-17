import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

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
    
    // Proses jawaban tanpa evaluasi
    const processedAnswers = [];
    
    for (const answer of answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      
      if (question) {
        // UBAH: Tidak mengevaluasi jawaban secara otomatis
        processedAnswers.push({
          questionId: question.id,
          studentAnswer: answer.answer,
          correctAnswer: question.expectedAnswer || ''
          // isCorrect akan dibiarkan null atau ditentukan oleh guru
        });
      }
    }
    
    console.log(`Processed ${processedAnswers.length} answers, will wait for teacher grading`);
    
    // LANGKAH 1: Hapus submisi lama yang belum selesai untuk mencegah konflik
    try {
      await directPrisma.$executeRaw`
        DELETE FROM "SubmissionAnswer" 
        WHERE "submissionId" IN (
          SELECT id FROM "QuizSubmission" 
          WHERE "studentId" = ${userId} AND "quizId" = ${quizId} AND status = 'PENDING'
        )
      `;
      
      await directPrisma.$executeRaw`
        DELETE FROM "QuizSubmission" 
        WHERE "studentId" = ${userId} AND "quizId" = ${quizId} AND status = 'PENDING'
      `;
      
      console.log("Cleaned up old submissions");
    } catch (cleanupError) {
      console.error("Error during cleanup (non-fatal):", cleanupError);
      // Lanjutkan meskipun gagal cleanup
    }
    
    // LANGKAH 2: Buat ID yang dijamin unik
    const submissionId = generateSuperUniqueID();
    console.log(`Generated super unique submission ID: ${submissionId}`);
    
    // LANGKAH 3: Dapatkan attempt number
    let attemptNumber = 1;
    try {
      const latestSubmission = await directPrisma.quizSubmission.findFirst({
        where: {
          quizId,
          studentId: userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (latestSubmission) {
        attemptNumber = latestSubmission.attemptNumber + 1;
      }
    } catch (e) {
      console.error("Error getting attempt number:", e);
    }
    
    // LANGKAH 4: Simpan submission (Menggunakan struktur tabel yang ada)
    try {
      // Sesuaikan dengan kolom yang ada di tabel (tanpa score dan passed)
      await directPrisma.$executeRaw`
        INSERT INTO "QuizSubmission" (
          "id", 
          "quizId", 
          "studentId", 
          "status",
          "createdAt", 
          "updatedAt",
          "attemptNumber"
        ) VALUES (
          ${submissionId}, 
          ${quizId}, 
          ${userId}, 
          CAST('PENDING' AS "SubmissionStatus"),
          NOW(), 
          NOW(),
          ${attemptNumber}
        )
      `;
      
      console.log("Created submission successfully");
      
      // LANGKAH 5: Simpan setiap jawaban (tanpa isCorrect)
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
            NULL,
            ${submissionId},
            ${answer.questionId}
          )
        `;
      }
      
      // LANGKAH 6: Update progress
      const existingProgress = await directPrisma.$queryRaw`
        SELECT * FROM "StudentQuizProgress" 
        WHERE "studentId" = ${userId} AND "quizId" = ${quizId} 
        LIMIT 1
      `;
      
      if (Array.isArray(existingProgress) && existingProgress.length > 0) {
        console.log("Updating existing progress");
        const progress = existingProgress[0];
        
        // Update progress tanpa lastAttemptPassed (menunggu penilaian guru)
        await directPrisma.$executeRaw`
          UPDATE "StudentQuizProgress" 
          SET 
            "currentAttempt" = "currentAttempt" + 1, 
            "updatedAt" = NOW()
          WHERE "id" = ${progress.id}
        `;
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
              "maxAttempts", 
              "assistanceRequired",
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
              NULL,
              4,
              'NONE',
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
      
      return NextResponse.json({
        success: true,
        message: "Terima kasih telah mengerjakan kuis. Jawaban Anda akan dinilai oleh guru.",
        data: {
          submissionId,
          attemptNumber
        }
      });
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      
      // Jika masih terjadi error, coba dengan format query lama sebagai fallback
      try {
        // Alternatif fallback - tetap gunakan PENDING
        const fallbackId = generateSuperUniqueID();
        
        await directPrisma.$executeRaw`
          INSERT INTO "QuizSubmission" (
            "id", 
            "quizId", 
            "studentId", 
            "status",
            "createdAt", 
            "updatedAt",
            "attemptNumber"
          ) VALUES (
            ${fallbackId}, 
            ${quizId}, 
            ${userId}, 
            CAST('PENDING' AS "SubmissionStatus"),
            NOW(), 
            NOW(),
            ${attemptNumber}
          )
        `;
        
        // Simpan jawaban tanpa isCorrect
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
              NULL,
              ${fallbackId},
              ${answer.questionId}
            )
          `;
        }
        
        return NextResponse.json({
          success: true,
          message: "Jawaban berhasil dikirim (metode alternatif). Silakan tunggu penilaian guru.",
          data: {
            submissionId: fallbackId,
            attemptNumber
          }
        });
      } catch (finalError: any) {
        console.error("Final error attempt:", finalError);
        return NextResponse.json({
          success: false, 
          message: "Tidak dapat menyimpan jawaban. Silakan coba lagi."
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("Error processing quiz submission:", error);
    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan saat mengirim jawaban kuis. Silakan coba lagi."
    }, { status: 500 });
  } finally {
    // Selalu tutup koneksi Prisma
    await directPrisma.$disconnect();
  }
} 