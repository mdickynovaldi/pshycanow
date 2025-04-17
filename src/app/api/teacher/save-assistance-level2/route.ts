import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { submissionId, status, feedback } = body;

    if (!submissionId || !status) {
      return NextResponse.json(
        { success: false, message: "Data yang diperlukan tidak lengkap" },
        { status: 400 }
      );
    }

    // Update status dan feedback submission
    const updatedSubmission = await prisma.assistanceLevel2Submission.update({
      where: { id: submissionId },
      data: {
        status: status as SubmissionStatus,
        feedback: feedback || null
      }
    });

    // Update progress siswa
    if (updatedSubmission) {
      const submission = await prisma.assistanceLevel2Submission.findUnique({
        where: { id: submissionId },
        include: {
          assistance: {
            include: {
              quiz: true
            }
          }
        }
      });

      if (submission) {
        // Cari progress yang sudah ada
        const existingProgress = await prisma.studentQuizProgress.findFirst({
          where: {
            studentId: submission.studentId,
            quizId: submission.assistance.quiz.id
          }
        });

        if (existingProgress) {
          // Update progress yang sudah ada
          await prisma.studentQuizProgress.update({
            where: { id: existingProgress.id },
            data: {
              level2Completed: status === "PASSED"
            }
          });
        } else {
          // Buat progress baru
          await prisma.studentQuizProgress.create({
            data: {
              studentId: submission.studentId,
              quizId: submission.assistance.quiz.id,
              level2Completed: status === "PASSED"
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Penilaian berhasil disimpan"
    });

  } catch (error) {
    console.error("Error saving assistance level 2 assessment:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat menyimpan penilaian" },
      { status: 500 }
    );
  }
} 