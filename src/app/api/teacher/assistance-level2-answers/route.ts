import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Autentikasi: pastikan yang mengakses adalah guru
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: UserRole, id?: string };

    if (!user || user.role !== UserRole.TEACHER) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Only teachers can access this data." },
        { status: 401 }
      );
    }
    
    const submissionId = request.nextUrl.searchParams.get("submissionId");
    if (!submissionId) {
      return NextResponse.json(
        { success: false, message: "Submission ID required" },
        { status: 400 }
      );
    }
    
    // Dapatkan data submisi bantuan level 2
    const submission = await prisma.assistanceLevel2Submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: {
          include: {
            question: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assistance: {
          include: {
            quiz: {
              include: {
                class: true
              }
            }
          }
        }
      }
    });
    
    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }
    
    // Pastikan guru adalah pemilik kelas
    if (submission.assistance.quiz.class && 
        submission.assistance.quiz.class.teacherId !== user.id) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to access this submission" },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error("Error fetching assistance level 2 answers:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
} 