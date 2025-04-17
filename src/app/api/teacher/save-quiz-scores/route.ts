import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { quizId, studentId, submissionId, scores } = await request.json();

    if (!quizId || !studentId || !submissionId || !scores || !Array.isArray(scores)) {
      return NextResponse.json(
        { success: false, message: 'Data tidak lengkap' },
        { status: 400 }
      );
    }

    // Validasi submission
    const submission = await prisma.quizSubmission.findUnique({
      where: {
        id: submissionId,
        quizId: quizId,
        studentId: studentId
      }
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, message: 'Submission tidak ditemukan' },
        { status: 404 }
      );
    }

    // Menyimpan nilai dan feedback untuk setiap jawaban
    const updatePromises = scores.map(async (item) => {
      const { answerId, score, feedback } = item;

      // Validasi score
      if (score === null || score === undefined) {
        return;
      }

      return prisma.submissionAnswer.update({
        where: {
          id: answerId
        },
        data: {
          isCorrect: score >= 70, // Menganggap nilai >= 70 sebagai benar
          feedback: feedback
        }
      });
    });

    await Promise.all(updatePromises);

    // Menghitung total skor dan menentukan status submission
    const totalMaxScore = 100 * scores.length;
    const totalScore = scores.reduce((sum, item) => sum + (item.score || 0), 0);
    const percentageScore = (totalScore / totalMaxScore) * 100;
    
    const status = percentageScore >= 70 ? "PASSED" : "FAILED";

    // Update status submission
    await prisma.quizSubmission.update({
      where: {
        id: submissionId
      },
      data: {
        status: status,
        score: Math.round(percentageScore),
        correctAnswers: scores.filter(item => item.score >= 70).length,
        totalQuestions: scores.length
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Nilai berhasil disimpan',
      data: {
        status,
        totalScore,
        totalMaxScore,
        percentageScore
      }
    });
  } catch (error) {
    console.error('Error saving quiz scores:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat menyimpan nilai' },
      { status: 500 }
    );
  }
} 