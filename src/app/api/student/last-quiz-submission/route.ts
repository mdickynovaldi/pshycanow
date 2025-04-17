import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssistanceRequirement } from "@prisma/client";

// Interface untuk tipe data
interface StudentQuizProgress {
  id: string;
  studentId: string;
  quizId: string;
  currentAttempt: number;
  lastAttemptPassed: boolean | null;
  maxAttempts: number;
  assistanceRequired: AssistanceRequirement;
  completedLevel1: boolean;
  completedLevel2: boolean;
  completedLevel3: boolean;
  lastSubmissionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  passed: boolean;
  feedback: string | null;
  answers: any; // Tipe data bisa bervariasi (JSON, string, object)
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user as any).role !== UserRole.STUDENT) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = (session.user as any).id;
    const quizId = request.nextUrl.searchParams.get("quizId");
    
    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID required" },
        { status: 400 }
      );
    }
    
    console.log(`[last-quiz-submission] Mencari submisi terakhir untuk siswa ${userId} dan kuis ${quizId}`);
    
    // Dapatkan submisi terakhir
    const lastSubmission = await prisma.quizSubmission.findFirst({
      where: {
        quizId,
        studentId: userId
      },
      include: {
        answers: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    if (!lastSubmission) {
      console.log("[last-quiz-submission] Tidak ada submisi ditemukan");
      return NextResponse.json(
        { success: false, message: "No submission found" },
        { status: 404 }
      );
    }
    
    console.log(`[last-quiz-submission] Menemukan submisi: ${lastSubmission.id}, status: ${lastSubmission.status}, answers: ${lastSubmission.answers.length}`);
    
    return NextResponse.json({ 
      success: true, 
      data: lastSubmission
    });
  } catch (error) {
    console.error("[last-quiz-submission] Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
} 