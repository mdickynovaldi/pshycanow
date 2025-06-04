import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { grantLevel3Access } from "@/lib/actions/quiz-progress-actions";
import { z } from "zod";

// Schema validasi untuk request
const grantAccessSchema = z.object({
  studentId: z.string(),
  quizId: z.string(),
  granted: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
  try {
    // Autentikasi: pastikan yang mengakses adalah guru
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: UserRole }).role !== UserRole.TEACHER) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Only teachers can modify assistance levels." },
        { status: 401 }
      );
    }
    
    // Parse body request
    const body = await request.json();
    const validationResult = grantAccessSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request data", errors: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { studentId, quizId, granted } = validationResult.data;
    
    // Panggil fungsi server action untuk memberikan akses level 3
    const result = await grantLevel3Access(quizId, studentId, granted);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error("Error granting level 3 access:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
} 