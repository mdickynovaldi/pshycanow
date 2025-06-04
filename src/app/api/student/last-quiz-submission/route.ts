import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// import { AssistanceRequirement } from "@prisma/client"; // Tidak digunakan secara langsung di sini

// Interface untuk tipe data (dihapus karena tidak digunakan)
// interface StudentQuizProgress { ... }
// interface QuizSubmission { ... }

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