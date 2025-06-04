import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Menggunakan type assertion yang lebih aman
    const userRole = (session?.user as { role?: UserRole })?.role;
    const userId = (session?.user as { id?: string })?.id;

    if (!session?.user || userRole !== UserRole.STUDENT || !userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const quizId = request.nextUrl.searchParams.get("quizId");
    
    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID required" },
        { status: 400 }
      );
    }
    
    console.log(`[quiz-submissions] Mengambil semua submisi untuk siswa ${userId} dan kuis ${quizId}`);
    
    // Dapatkan semua submisi kuis utama (non-assistance)
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        quizId,
        studentId: userId,
        assistanceLevel: null // Hanya ambil kuis utama
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        attemptNumber: "desc" // Sortir berdasarkan nomor percobaan (terbaru dulu)
      }
    });
    
    // Hitung informasi tambahan untuk setiap submisi jika perlu
    const enrichedSubmissions = submissions.map(submission => {
      const correctAnswers = submission.answers.filter(a => a.isCorrect).length;
      const totalQuestions = submission.answers.length;
      
      return {
        ...submission,
        correctAnswers: submission.correctAnswers ?? correctAnswers,
        totalQuestions: submission.totalQuestions ?? totalQuestions,
      };
    });
    
    console.log(`[quiz-submissions] Ditemukan ${enrichedSubmissions.length} submisi`);
    
    return NextResponse.json({
      success: true,
      data: enrichedSubmissions
    });
    
  } catch (error) {
    console.error("[quiz-submissions] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch quiz submissions" },
      { status: 500 }
    );
  }
}
