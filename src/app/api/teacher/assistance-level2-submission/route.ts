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

    // Mengambil data bantuan level 2
    const assistanceLevel2 = await prisma.quizAssistanceLevel2.findUnique({
      where: { quizId: quizId },
      include: {
        questions: true
      }
    });

    if (!assistanceLevel2) {
      return NextResponse.json(
        { success: false, message: "Bantuan level 2 tidak ditemukan" },
        { status: 404 }
      );
    }

    // Mengambil submission bantuan level 2 beserta jawabannya
    const submission = await prisma.assistanceLevel2Submission.findFirst({
      where: {
        studentId: studentId,
        assistanceId: assistanceLevel2.id
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!submission) {
      return NextResponse.json({
        success: true,
        data: {
          submission: null,
          studentName: student.name
        }
      });
    }

    // Format data untuk frontend - menampilkan semua jawaban, bukan hanya yang pertama
    const formattedAnswers = submission.answers.map(answer => ({
      id: answer.id,
      questionId: answer.questionId,
      answerText: answer.answerText,
      isCorrect: answer.isCorrect,
      question: {
        id: answer.question.id,
        question: answer.question.question
      }
    }));

    // Jika ada pertanyaan yang belum dijawab, tambahkan pertanyaan tersebut
    const answeredQuestionIds = submission.answers.map(answer => answer.questionId);
    const unansweredQuestions = assistanceLevel2.questions
      .filter(question => !answeredQuestionIds.includes(question.id))
      .map(question => ({
        id: null,
        questionId: question.id,
        answerText: "",
        isCorrect: null,
        question: {
          id: question.id,
          question: question.question
        }
      }));

    const allAnswers = [...formattedAnswers, ...unansweredQuestions];

    const formattedSubmission = {
      id: submission.id,
      status: submission.status,
      feedback: submission.feedback,
      createdAt: submission.createdAt,
      answers: allAnswers
    };

    return NextResponse.json({
      success: true,
      data: {
        submission: formattedSubmission,
        studentName: student.name
      }
    });

  } catch (error) {
    console.error("Error fetching assistance level 2 submission:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengambil data submission" },
      { status: 500 }
    );
  }
} 