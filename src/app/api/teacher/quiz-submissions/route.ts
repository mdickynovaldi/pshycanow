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

    console.log(`[quiz-submissions] Mengambil submissions untuk quizId: ${quizId}, studentId: ${studentId}`);

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

    // Mengambil semua submission kuis utama (bukan bantuan) dan jawabannya
    // PENTING: Mengambil SEMUA submission tanpa filter status
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        quizId: quizId,
        studentId: studentId,
        assistanceLevel: null  // Hanya kuis utama
        // Tidak ada filter status - ambil semua submission (PENDING, PASSED, FAILED)
      },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                expectedAnswer: true  // Untuk menampilkan jawaban yang diharapkan
              }
            }
          }
        }
      },
      orderBy: {
        attemptNumber: 'desc'  // Terbaru di atas
      }
    });

    console.log(`[quiz-submissions] Ditemukan ${submissions.length} submissions untuk siswa ${student.name}`);

    // Format data untuk frontend
    const formattedSubmissions = submissions.map(submission => {
      console.log(`[quiz-submissions] Processing submission ${submission.id} - status: ${submission.status}, attempt: ${submission.attemptNumber}`);
      
      return {
        id: submission.id,
        attemptNumber: submission.attemptNumber,
        status: submission.status || "PENDING", // Pastikan ada status default
        createdAt: submission.createdAt.toISOString(),
        answers: submission.answers.map(answer => ({
          id: answer.id,
          submissionId: submission.id,
          questionId: answer.questionId,
          answerText: answer.answerText || "",
          score: answer.score ?? null, // Nilai numerik yang diberikan guru (bisa null)
          feedback: answer.feedback || null,
          isCorrect: answer.isCorrect, // Hasil koreksi otomatis (bisa null, true, false)
          question: {
            id: answer.question?.id || "",
            question: answer.question?.text || "Pertanyaan tidak tersedia",
            maxScore: 100, // Nilai maksimal per soal
            expectedAnswer: answer.question?.expectedAnswer || null // Jawaban yang diharapkan
          }
        }))
      };
    });

    console.log(`[quiz-submissions] Mengembalikan ${formattedSubmissions.length} formatted submissions`);

    return NextResponse.json({
      success: true,
      data: {
        submissions: formattedSubmissions,
        studentName: student.name
      }
    });

  } catch (error) {
    console.error("[quiz-submissions] Error fetching quiz submissions:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengambil data submission" },
      { status: 500 }
    );
  }
} 