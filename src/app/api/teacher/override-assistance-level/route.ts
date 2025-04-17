import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AssistanceRequirement } from "@prisma/client";
import { z } from "zod";

// Schema validasi untuk request
const overrideSchema = z.object({
  studentId: z.string(),
  quizId: z.string(),
  overrideSystemFlow: z.boolean(),
  manuallyAssignedLevel: z.enum([
    "NONE", 
    "ASSISTANCE_LEVEL1", 
    "ASSISTANCE_LEVEL2", 
    "ASSISTANCE_LEVEL3"
  ]).optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    // Autentikasi: pastikan yang mengakses adalah guru
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== UserRole.TEACHER) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Only teachers can modify assistance levels." },
        { status: 401 }
      );
    }
    
    // Parse body request
    const body = await request.json();
    const validationResult = overrideSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request data", errors: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { studentId, quizId, overrideSystemFlow, manuallyAssignedLevel } = validationResult.data;
    
    // Periksa apakah guru adalah pengajar dari kelas yang berisi kuis
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { class: true }
    });
    
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Quiz not found" },
        { status: 404 }
      );
    }
    
    if (quiz.class && quiz.class.teacherId !== (session.user as any).id) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to modify this quiz" },
        { status: 403 }
      );
    }
    
    // Cari atau buat progress kuis siswa
    const progress = await prisma.studentQuizProgress.upsert({
      where: {
        quizId_studentId: {
          quizId,
          studentId
        }
      },
      update: {
        overrideSystemFlow,
        manuallyAssignedLevel: manuallyAssignedLevel as AssistanceRequirement || null,
        level3AccessGranted: manuallyAssignedLevel === "ASSISTANCE_LEVEL3" ? true : false
      },
      create: {
        quizId,
        studentId,
        overrideSystemFlow,
        manuallyAssignedLevel: manuallyAssignedLevel as AssistanceRequirement || null,
        level3AccessGranted: manuallyAssignedLevel === "ASSISTANCE_LEVEL3" ? true : false,
        currentAttempt: 0,
        maxAttempts: 4,
        assistanceRequired: AssistanceRequirement.NONE,
        level1Completed: false,
        level2Completed: false,
        level3Completed: false
      }
    });
    
    // Revalidasi path terkait
    revalidatePath(`/teacher/submissions`);
    revalidatePath(`/student/quizzes/${quizId}`);
    
    return NextResponse.json({
      success: true,
      data: progress,
      message: "Student assistance level updated successfully"
    });
  } catch (error) {
    console.error("Error overriding assistance level:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
} 