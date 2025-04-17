import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    
    const quizId = request.nextUrl.searchParams.get("quizId");
    let studentId = request.nextUrl.searchParams.get("studentId");
    
    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID required" },
        { status: 400 }
      );
    }
    
    // Jika guru mencoba mengakses data siswa, pastikan studentId diberikan
    if (userRole === UserRole.TEACHER) {
      if (!studentId) {
        return NextResponse.json(
          { success: false, message: "Student ID required for teacher access" },
          { status: 400 }
        );
      }
    } else {
      // Jika siswa mencoba mengakses, hanya boleh melihat data mereka sendiri
      studentId = userId;
    }
    
    console.log(`[quiz-progress] Fetching progress for quiz ${quizId} and student ${studentId}`);
    
    // Cari progress siswa
    const progress = await prisma.studentQuizProgress.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId: studentId as string
        }
      }
    });
    
    if (!progress) {
      return NextResponse.json(
        { success: false, message: "Progress not found" },
        { status: 404 }
      );
    }
    
    // Jika siswa mencoba melihat progress siswa lain, tolak aksesnya
    if (userRole === UserRole.STUDENT && progress.studentId !== userId) {
      return NextResponse.json(
        { success: false, message: "You can only view your own progress" },
        { status: 403 }
      );
    }
    
    // Jika guru mencoba melihat progress siswa yang bukan dari kelasnya, tolak aksesnya
    if (userRole === UserRole.TEACHER) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { class: true }
      });
      
      if (quiz?.class && quiz.class.teacherId !== userId) {
        return NextResponse.json(
          { success: false, message: "You can only view progress for your own class" },
          { status: 403 }
        );
      }
    }
    
    console.log(`[quiz-progress] Found progress:`, {
      id: progress.id,
      currentAttempt: progress.currentAttempt,
      assistanceRequired: progress.assistanceRequired,
      overrideSystemFlow: (progress as any).overrideSystemFlow,
      manuallyAssignedLevel: (progress as any).manuallyAssignedLevel
    });
    
    return NextResponse.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error("[quiz-progress] Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
} 