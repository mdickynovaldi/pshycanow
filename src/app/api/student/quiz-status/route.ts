import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssistanceRequirement } from "@prisma/client";
import { getStudentQuizStatus } from "@/lib/actions/quiz-progress-actions";

// Tipe data untuk progres kuis
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Anda harus login untuk melihat status kuis"
      }, { status: 401 });
    }
    
    const quizId = request.nextUrl.searchParams.get('quizId');
    
    if (!quizId) {
      return NextResponse.json({
        success: false,
        message: "ID kuis tidak ditemukan"
      }, { status: 400 });
    }
    
    console.log(`[quiz-status] Mendapatkan status kuis untuk siswa ${userId} dan kuis ${quizId}`);
    
    // Gunakan fungsi dari actions
    const statusResult = await getStudentQuizStatus(quizId, userId);
    
    console.log(`[quiz-status] Status: ${JSON.stringify(statusResult.success ? {
      currentAttempt: statusResult.data?.currentAttempt,
      assistanceRequired: statusResult.data?.assistanceRequired,
      lastSubmission: statusResult.data?.lastSubmission ? {
        id: statusResult.data.lastSubmission.id,
        status: statusResult.data.lastSubmission.status
      } : null
    } : { error: statusResult.message })}`);
    
    if (!statusResult.success) {
      return NextResponse.json({
        success: false,
        message: statusResult.message
      }, { status: 500 });
    }
    
    // Cek dan ambil submisi terakhir jika belum ada
    if (!statusResult.data?.lastSubmission) {
      console.log(`[quiz-status] Tidak ada lastSubmission, mencari submisi terbaru...`);
      
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
        console.log(`[quiz-status] Menemukan submisi terakhir: ${lastSubmission.id}, status: ${lastSubmission.status}`);
        statusResult.data.lastSubmission = lastSubmission;
      }
    }
    
    return NextResponse.json({
      success: true,
      data: statusResult.data
    });
  } catch (error) {
    console.error("[quiz-status] Error:", error);
    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan saat mendapatkan status kuis"
    }, { status: 500 });
  }
} 