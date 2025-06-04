import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.STUDENT) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak" },
        { status: 401 }
      );
    }

    const { quizId } = await params;

    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID tidak valid" },
        { status: 400 }
      );
    }

    // Check if student is enrolled in a class that has this quiz
    const studentEnrollments = await prisma.classEnrollment.findMany({
      where: {
        studentId: session.user.id
      },
      select: {
        classId: true
      }
    });

    const classIds = studentEnrollments.map((e: { classId: string }) => e.classId);

    if (classIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Anda belum terdaftar di kelas manapun" },
        { status: 403 }
      );
    }

    // Fetch quiz details
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        classId: {
          in: classIds
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        class: {
          select: {
            name: true
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, message: "Kuis tidak ditemukan atau Anda tidak memiliki akses" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: quiz
    });

  } catch (error) {
    console.error("Error fetching quiz details:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
