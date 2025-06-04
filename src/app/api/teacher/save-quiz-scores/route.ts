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
      },
      include: {
        answers: true,
        student: { select: { name: true } }
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

      // Dapatkan jawaban yang sudah ada untuk mendapatkan isCorrect dari koreksi otomatis
      const existingAnswer = submission.answers.find(a => a.id === answerId);

      // Hanya update jika jawaban ditemukan
      if (!existingAnswer) {
        return;
      }

      return prisma.submissionAnswer.update({
        where: {
          id: answerId
        },
        data: {
          score: score !== null && score !== undefined ? parseInt(score) : null,
          // Pertahankan nilai isCorrect dari koreksi otomatis
          // isCorrect tetap tidak diubah dari hasil koreksi otomatis
          feedback: feedback || null
        }
      });
    });

    await Promise.all(updatePromises);

    // Menghitung total skor berdasarkan nilai yang diberikan guru
    const updatedAnswers = await prisma.submissionAnswer.findMany({
      where: {
        submissionId: submissionId
      }
    });

    // Hitung berdasarkan rata-rata nilai per jawaban
    const totalMaxScore = 100 * updatedAnswers.length;
    const totalScore = updatedAnswers.reduce((sum, answer) => sum + (answer.score || 0), 0);
    const percentageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    
    // Hitung berdasarkan jawaban yang benar (isCorrect dari auto-correction)
    const autoCorrectCount = updatedAnswers.filter(answer => answer.isCorrect === true).length;
    const autoCorrectPercentage = updatedAnswers.length > 0 ? (autoCorrectCount / updatedAnswers.length) * 100 : 0;
    
    // Status berdasarkan kriteria passing grade 70%:
    // LULUS jika: skor guru >= 70% ATAU auto-correct >= 70%
    const teacherGradePassed = percentageScore >= 70;
    const autoCorrectPassed = autoCorrectPercentage >= 70;
    const finalPassed = teacherGradePassed || autoCorrectPassed;
    
    const status = finalPassed ? "PASSED" : "FAILED";

    // Update status submission dengan informasi lengkap
    await prisma.quizSubmission.update({
      where: {
        id: submissionId
      },
      data: {
        status: status,
        score: Math.round(percentageScore), // Skor dari guru
        correctAnswers: autoCorrectCount, // Jumlah jawaban benar dari auto-correct
        totalQuestions: updatedAnswers.length,
        feedback: finalPassed 
          ? `🎉 LULUS! Siswa mencapai passing grade 70%. ${teacherGradePassed ? `Skor guru: ${Math.round(percentageScore)}%` : ''}${autoCorrectPassed ? ` Auto-correct: ${Math.round(autoCorrectPercentage)}%` : ''}`
          : `❌ Belum lulus. Skor perlu mencapai 70%. Skor guru: ${Math.round(percentageScore)}%, Auto-correct: ${Math.round(autoCorrectPercentage)}%`
      }
    });

    // Update StudentQuizProgress jika siswa lulus
    if (finalPassed) {
      await prisma.studentQuizProgress.updateMany({
        where: {
          studentId: studentId,
          quizId: quizId
        },
        data: {
          finalStatus: "PASSED",
          lastAttemptPassed: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: finalPassed 
        ? `🎉 ${submission.student?.name || 'Siswa'} LULUS! Skor mencapai passing grade 70%`
        : `📝 Penilaian disimpan. ${submission.student?.name || 'Siswa'} belum mencapai passing grade 70%`,
      data: {
        status,
        teacherScore: Math.round(percentageScore),
        autoCorrectScore: Math.round(autoCorrectPercentage),
        finalPassed,
        teacherGradePassed,
        autoCorrectPassed,
        correctAnswers: autoCorrectCount,
        totalQuestions: updatedAnswers.length,
        attemptNumber: submission.attemptNumber
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