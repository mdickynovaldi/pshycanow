import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");
    const studentId = searchParams.get("studentId");

    if (!quizId || !studentId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID dan Student ID diperlukan" },
        { status: 400 }
      );
    }

    // Mengambil data siswa
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true }
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Mengambil semua submission dan jawabannya
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: quizId,
        studentId: studentId
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
              }
            }
          }
        }
      },
      orderBy: {
        attemptNumber: 'asc'
      }
    });

    // Format data untuk frontend
    const formattedSubmissions = submissions.map(submission => ({
      id: submission.id,
      attemptNumber: submission.attemptNumber,
      status: submission.status || "PENDING",
      createdAt: submission.createdAt.toISOString(),
      answers: submission.answers.map(answer => ({
        id: answer.id,
        submissionId: submission.id,
        questionId: answer.questionId,
        answerText: answer.answerText || "",
        score: answer.isCorrect ? 100 : 0,
        feedback: answer.feedback || null,
        question: {
          id: answer.question?.id || "",
          question: answer.question?.text || "Pertanyaan tidak tersedia",
          maxScore: 100 // Nilai maksimal per soal
        }
      }))
    }));

    return NextResponse.json({
      success: true,
      data: {
        submissions: formattedSubmissions,
        studentName: student.name
      }
    });

  } catch (error) {
    console.error("Error fetching quiz submissions:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengambil data submission" },
      { status: 500 }
    );
  }
} 