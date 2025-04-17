import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const AnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string()
});

const SubmitQuizSchema = z.object({
  quizId: z.string(),
  answers: z.array(AnswerSchema)
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
    
    // 5. Simpan dengan pendekatan SQL mentah
    try {
      // LANGKAH 1: Bersihkan submisi yang belum dinilai (jika ada)
      try {
        // Hapus entry lama di StudentQuizProgress dan QuizSubmission dengan raw SQL untuk bypass error Prisma
        await prisma.$executeRaw`
          DELETE FROM "SubmissionAnswer" 
          WHERE "submissionId" IN (
            SELECT id FROM "QuizSubmission" 
            WHERE "studentId" = ${userId} AND "quizId" = ${quizId} AND status = 'PENDING'
          )
        `;
        
        await prisma.$executeRaw`
          DELETE FROM "QuizSubmission" 
          WHERE "studentId" = ${userId} AND "quizId" = ${quizId} AND status = 'PENDING'
        `;
        
        console.log("Cleaned up old submissions");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
        // Lanjutkan meskipun gagal
      }
      
      // LANGKAH 2: Buat ID yang dijamin unik
      const submissionId = generateUniqueID();
      console.log(`Generated unique ID: ${submissionId}`);

      // LANGKAH 3: Dapatkan attempt number
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
      
      // LANGKAH 4: Insert QuizSubmission (sesuai skema database saat ini)
      await prisma.$executeRaw`
        INSERT INTO "QuizSubmission" (
          "id", "quizId", "studentId", "status", "attemptNumber", 
          "createdAt", "updatedAt"
        ) VALUES (
          ${submissionId}, ${quizId}, ${userId}, 
          CAST('PENDING' AS "SubmissionStatus"), ${attemptNumber},
          NOW(), NOW()
        )
      `;
      
      console.log("Created QuizSubmission");
      
      // LANGKAH 5: Insert SubmissionAnswer untuk setiap jawaban
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
      
      // LANGKAH 6: Update StudentQuizProgress
      const progressExists = await prisma.$queryRaw`
        SELECT 1 FROM "StudentQuizProgress" WHERE "studentId" = ${userId} AND "quizId" = ${quizId} LIMIT 1
      `;
      
      if (Array.isArray(progressExists) && progressExists.length > 0) {
        // Update progress yang sudah ada
        try {
          await prisma.$executeRaw`
            UPDATE "StudentQuizProgress"
            SET 
              "currentAttempt" = "currentAttempt" + 1,
              "lastAttemptPassed" = ${passed},
              "updatedAt" = NOW()
            WHERE "studentId" = ${userId} AND "quizId" = ${quizId}
          `;
          
          console.log("Updated StudentQuizProgress");
        } catch (progressUpdateError) {
          console.error("Error updating progress:", progressUpdateError);
        }
      } else {
        // Buat progress baru
        const progressId = generateUniqueID();
        
        try {
          await prisma.$executeRaw`
            INSERT INTO "StudentQuizProgress" (
              "id", "studentId", "quizId", "currentAttempt", "lastAttemptPassed",
              "maxAttempts", "assistanceRequired", 
              "level1Completed", "level2Completed", "level3Completed",
              "createdAt", "updatedAt"
            ) VALUES (
              ${progressId}, ${userId}, ${quizId}, 1, ${passed},
              4, CAST('NONE' AS "AssistanceRequirement"),
              false, false, false,
              NOW(), NOW()
            )
          `;
          
          console.log("Created new StudentQuizProgress");
        } catch (newProgressError) {
          console.error("Error creating new progress:", newProgressError);
        }
      }
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: passed ? 
          "Selamat! Anda telah berhasil menyelesaikan kuis ini." : 
          "Terima kasih telah mengerjakan kuis. Jawaban Anda akan dinilai oleh guru.",
        data: {
          submissionId,
          score: totalScore,
          passed
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
              "createdAt", "updatedAt"
            ) VALUES (
              ${alternativeId}, ${quizId}, ${userId}, 
              CAST('PENDING' AS "SubmissionStatus"), ${attemptNumber},
              NOW(), NOW()
            )
          `;
          
          return NextResponse.json({
            success: true,
            message: "Jawaban berhasil disimpan (alternatif). Silakan tunggu penilaian dari guru.",
            data: {
              submissionId: alternativeId,
              score: totalScore,
              passed
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