import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AssistanceRequirement, StudentQuizProgress } from "@prisma/client";

// Schema validasi untuk request
const toggleStatusSchema = z.object({
  studentId: z.string(),
  quizId: z.string(),
  isPassed: z.boolean().nullable()
});

export async function POST(request: NextRequest) {
  try {
    // Autentikasi: pastikan yang mengakses adalah guru
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: UserRole, id?: string };

    if (!user || user.role !== UserRole.TEACHER || !user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Only teachers can modify student statuses." },
        { status: 401 }
      );
    }
    
    // Parse body request
    const body = await request.json();
    const validationResult = toggleStatusSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request data", errors: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { studentId, quizId, isPassed } = validationResult.data;
    
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
    
    if (quiz.class && quiz.class.teacherId !== user.id) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to modify this quiz" },
        { status: 403 }
      );
    }
    
    // Tentukan status dan alur bantuan berdasarkan nilai isPassed
    const finalStatus: StudentQuizProgress['finalStatus'] = isPassed === true 
      ? "PASSED" 
      : isPassed === false 
        ? "FAILED" 
        : null;
    
    const assistanceRequiredValue: AssistanceRequirement = isPassed === true 
      ? AssistanceRequirement.NONE 
      : isPassed === false 
        ? AssistanceRequirement.ASSISTANCE_LEVEL1 
        : AssistanceRequirement.NONE;
    
    const currentAttempt = isPassed === true 
      ? 1 
      : isPassed === false 
        ? 4 
        : 0; // Jika on going, anggap belum ada percobaan
    
    // Cari atau buat progress kuis siswa
    const progress = await prisma.studentQuizProgress.upsert({
      where: {
        studentId_quizId: {
          quizId,
          studentId
        }
      },
      update: {
        lastAttemptPassed: isPassed,
        finalStatus,
        assistanceRequired: assistanceRequiredValue
      },
      create: {
        quizId,
        studentId,
        lastAttemptPassed: isPassed,
        finalStatus,
        currentAttempt,
        assistanceRequired: assistanceRequiredValue,
        level1Completed: false,
        level2Completed: false,
        level3Completed: false,
        overrideSystemFlow: false
      }
    });
    
    // Revalidasi path terkait
    revalidatePath(`/teacher/submissions`);
    revalidatePath(`/student/quizzes/${quizId}`);
    revalidatePath(`/teacher/quizzes/${quizId}/student-control`);
    
    let successMessage = "";
    if (isPassed === true) {
      successMessage = "Status siswa berhasil diubah menjadi LULUS";
    } else if (isPassed === false) {
      successMessage = "Status siswa berhasil diubah menjadi TIDAK LULUS";
    } else {
      successMessage = "Status siswa berhasil diubah menjadi ON GOING";
    }
    
    return NextResponse.json({
      success: true,
      data: progress,
      message: successMessage
    });
  } catch (error) {
    console.error("Error toggling quiz status:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
} 