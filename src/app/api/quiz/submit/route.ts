import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from 'uuid';
// import { PrismaClient } from "@prisma/client";

// Menggunakan fetch API langsung ke database jika Prisma client menyebabkan masalah
export async function POST(request: Request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Anda harus login untuk submit jawaban kuis"
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { quizId, answers } = body;
    
    if (!quizId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({
        success: false,
        message: "Format data tidak valid"
      }, { status: 400 });
    }
    
    // Get quiz data
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
    
    // Calculate score
    let correctCount = 0;
    const processedAnswers = [];
    
    for (const answer of answers) {
      const question = quiz.questions.find(q => q.id === answer.questionId);
      
      if (question) {
        const isCorrect = question.expectedAnswer && 
                      answer.answer.toLowerCase().trim() === 
                      question.expectedAnswer.toLowerCase().trim();
        
        if (isCorrect) correctCount++;
        
        processedAnswers.push({
          questionId: question.id,
          studentAnswer: answer.answer,
          correctAnswer: question.expectedAnswer || '',
          isCorrect
        });
      }
    }
    
    const totalScore = quiz.questions.length > 0 ? 
                     (correctCount / quiz.questions.length) * 100 : 0;
    const passed = totalScore >= 70; // Default passing score
    
    // Gunakan SQL mentah untuk menyimpan submission
    const submissionId = uuidv4();
    
    // Langsung ke database 
    await prisma.$executeRaw`
      INSERT INTO "QuizSubmission" (
        "id", 
        "quizId", 
        "studentId", 
        "score", 
        "passed", 
        "answers", 
        "createdAt", 
        "updatedAt") 
      VALUES (
        ${submissionId}, 
        ${quizId}, 
        ${userId}, 
        ${totalScore}, 
        ${passed}, 
        ${JSON.stringify(processedAnswers)}::json, 
        NOW(), 
        NOW()
      )
    `;
    
    // Update or create progress
    try {
      const progress = await prisma.studentQuizProgress.findFirst({
        where: {
          studentId: userId,
          quizId
        }
      });
      
      if (progress) {
        // Update progress with SQL
        await prisma.$executeRaw`
          UPDATE "StudentQuizProgress" 
          SET 
            "currentAttempt" = "currentAttempt" + 1, 
            "lastAttemptPassed" = ${passed}, 
            "lastSubmissionId" = ${submissionId},
            "updatedAt" = NOW()
          WHERE "id" = ${progress.id}
        `;
      } else {
        // Create progress with SQL
        const progressId = uuidv4();
        await prisma.$executeRaw`
          INSERT INTO "StudentQuizProgress" (
            "id", 
            "studentId", 
            "quizId", 
            "currentAttempt", 
            "lastAttemptPassed",
            "lastSubmissionId",
            "createdAt", 
            "updatedAt"
          ) VALUES (
            ${progressId},
            ${userId},
            ${quizId},
            1,
            ${passed},
            ${submissionId},
            NOW(),
            NOW()
          )
        `;
      }
    } catch (error) {
      console.error("Error updating progress:", error);
      // Continue even if progress update fails
    }
    
    // Revalidate relevant paths
    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/student/quizzes`);
    
    return NextResponse.json({
      success: true,
      message: passed ? 
        "Selamat! Anda telah berhasil menyelesaikan kuis ini." : 
        "Jawaban telah dikirim. Silakan periksa hasil Anda.",
      data: {
        submissionId,
        score: totalScore,
        passed
      }
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan saat mengirim jawaban kuis: " + (error instanceof Error ? error.message : "Unknown error")
    }, { status: 500 });
  }
} 