import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Autentikasi: pastikan yang mengakses adalah guru
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== UserRole.TEACHER) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Only teachers can access this data." },
        { status: 401 }
      );
    }
    
    const quizId = request.nextUrl.searchParams.get("quizId");
    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID required" },
        { status: 400 }
      );
    }
    
    // Dapatkan informasi kuis dan kelas
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
    
    // Pastikan guru adalah pemilik kelas
    if (quiz.class && quiz.class.teacherId !== (session.user as any).id) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to access this quiz" },
        { status: 403 }
      );
    }
    
    // Dapatkan daftar siswa yang terdaftar di kelas
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        classId: quiz.class?.id
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });
    
    // Dapatkan progress siswa untuk kuis ini
    const progressData = await prisma.studentQuizProgress.findMany({
      where: {
        quizId,
        studentId: {
          in: enrollments.map(e => e.studentId)
        }
      }
    });

    // Dapatkan bantuan level yang tersedia untuk kuis ini
    const assistanceLevels = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        assistanceLevel1: { select: { id: true } },
        assistanceLevel2: { select: { id: true } },
        assistanceLevel3: { select: { id: true } }
      }
    });

    // Ambil data dari semua tabel terkait dalam satu operasi
    const [level1Submissions, level2Submissions, level3Completions, quizSubmissions] = await Promise.all([
      // Bantuan Level 1
      assistanceLevels?.assistanceLevel1 ? prisma.assistanceLevel1Submission.findMany({
        where: {
          assistanceId: assistanceLevels.assistanceLevel1.id,
          studentId: { in: enrollments.map(e => e.studentId) }
        },
        orderBy: { createdAt: 'desc' },
        include: { answers: true }
      }) : [],
      
      // Bantuan Level 2
      assistanceLevels?.assistanceLevel2 ? prisma.assistanceLevel2Submission.findMany({
        where: {
          assistanceId: assistanceLevels.assistanceLevel2.id,
          studentId: { in: enrollments.map(e => e.studentId) }
        },
        orderBy: { createdAt: 'desc' },
        include: { answers: true }
      }) : [],
      
      // Bantuan Level 3
      assistanceLevels?.assistanceLevel3 ? prisma.assistanceLevel3Completion.findMany({
        where: {
          assistanceId: assistanceLevels.assistanceLevel3.id,
          studentId: { in: enrollments.map(e => e.studentId) }
        }
      }) : [],
      
      // Submisi Kuis Utama
      prisma.quizSubmission.findMany({
        where: {
          quizId,
          studentId: { in: enrollments.map(e => e.studentId) }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    // Gabungkan data siswa dengan progress mereka
    const students = enrollments.map(enrollment => {
      const progress = progressData.find(p => p.studentId === enrollment.studentId);
      
      // Temukan submisi bantuan level 1 terbaru untuk siswa ini
      const latestLevel1Submission = level1Submissions
        .filter(s => s.studentId === enrollment.studentId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      
      // Temukan submisi bantuan level 2 terbaru untuk siswa ini
      const latestLevel2Submission = level2Submissions
        .filter(s => s.studentId === enrollment.studentId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      
      // Cek apakah siswa sudah melihat PDF bantuan level 3
      const hasCompletedLevel3 = level3Completions.some(c => c.studentId === enrollment.studentId);
      
      // Temukan submisi kuis utama untuk siswa ini
      const studentQuizSubmissions = quizSubmissions
        .filter(s => s.studentId === enrollment.studentId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Hitung percobaan gagal pada kuis utama
      const failedAttempts = studentQuizSubmissions.filter(s => s.status === 'FAILED').length;
      
      return {
        id: enrollment.student.id,
        name: enrollment.student.name,
        email: enrollment.student.email,
        image: enrollment.student.image,
        progress: progress ? {
          currentAttempt: progress.currentAttempt,
          lastAttemptPassed: progress.lastAttemptPassed,
          assistanceRequired: progress.assistanceRequired,
          overrideSystemFlow: (progress as any).overrideSystemFlow || false,
          manuallyAssignedLevel: (progress as any).manuallyAssignedLevel,
          // Tambahkan informasi bantuan
          level1Completed: progress.level1Completed,
          level2Completed: progress.level2Completed,
          level3Completed: progress.level3Completed,
          // Data tambahan
          failedAttempts,
          latestSubmissionStatus: studentQuizSubmissions[0]?.status || null,
          // Detail bantuan level 1
          level1: latestLevel1Submission ? {
            id: latestLevel1Submission.id,
            status: latestLevel1Submission.status,
            answers: latestLevel1Submission.answers?.length || 0,
            submittedAt: latestLevel1Submission.createdAt
          } : null,
          // Detail bantuan level 2
          level2: latestLevel2Submission ? {
            id: latestLevel2Submission.id,
            status: latestLevel2Submission.status,
            answers: latestLevel2Submission.answers?.length || 0,
            submittedAt: latestLevel2Submission.createdAt
          } : null,
          // Detail bantuan level 3
          level3: hasCompletedLevel3 ? {
            completed: true
          } : null
        } : undefined
      };
    });
    
    return NextResponse.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error("Error fetching quiz students:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
} 