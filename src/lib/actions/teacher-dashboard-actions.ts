"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Mendapatkan statistik dasbor untuk guru
 */
export async function getTeacherDashboardStats() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        message: "Anda harus login untuk melihat dasbor"
      };
    }

    // Dapatkan total kelas yang dimiliki guru
    const totalClasses = await prisma.class.count({
      where: {
        teacherId: userId
      }
    });

    // Dapatkan total kuis yang dibuat guru
    const totalQuizzes = await prisma.quiz.count({
      where: {
        class: {
          teacherId: userId
        }
      }
    });

    // Dapatkan total siswa di semua kelas guru
    const classesWithStudents = await prisma.class.findMany({
      where: {
        teacherId: userId
      },
      include: {
        enrollments: true
      }
    });

    const totalStudents = new Set(
      classesWithStudents.flatMap(c => c.enrollments.map(e => e.studentId))
    ).size;

    // Dapatkan jumlah submisi yang belum dinilai
    const pendingSubmissions = await prisma.assistanceLevel2Submission.count({
      where: {
        status: "PENDING",
        assistance: {
          quiz: {
            class: {
              teacherId: userId
            }
          }
        }
      }
    });

    // Dapatkan kelas populer
    const popularClasses = await prisma.class.findMany({
      where: {
        teacherId: userId
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        enrollments: {
          _count: "desc"
        }
      },
      take: 5
    });

    // Dapatkan kuis terbaru
    const recentQuizzes = await prisma.quiz.findMany({
      where: {
        class: {
          teacherId: userId
        }
      },
      select: {
        id: true,
        title: true,
        class: {
          select: {
            name: true
          }
        },
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });

    // Hitung jumlah siswa aktif dalam seminggu terakhir
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const activeStudents = await prisma.quizSubmission.groupBy({
      by: ['studentId'],
      where: {
        createdAt: {
          gte: weekAgo
        },
        quiz: {
          class: {
            teacherId: userId
          }
        }
      }
    });

    // Format data untuk respons
    const formattedData = {
      totalClasses,
      totalQuizzes,
      totalStudents,
      pendingSubmissions,
      activeClasses: classesWithStudents.filter(c => c.enrollments.length > 0).length,
      activeStudents: activeStudents.length,
      popularClasses: popularClasses.map(c => ({
        id: c.id,
        name: c.name,
        studentCount: c._count.enrollments
      })),
      recentQuizzes: recentQuizzes.map(q => ({
        id: q.id,
        title: q.title,
        className: q.class.name,
        createdAt: q.createdAt
      }))
    };

    return {
      success: true,
      data: formattedData
    };
  } catch (error) {
    console.error("Error fetching teacher dashboard stats:", error);
    return {
      success: false,
      message: "Gagal mendapatkan statistik dasbor"
    };
  }
}

/**
 * Mendapatkan daftar siswa yang gagal kuis setelah 4 kali percobaan
 */
export async function getFailedStudents() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        message: "Anda harus login untuk melihat data siswa"
      };
    }

    // Dapatkan daftar siswa yang telah gagal kuis setelah 4 kali percobaan
    const failedStudents = await prisma.studentQuizProgress.findMany({
      where: {
        currentAttempt: 4,
        lastAttemptPassed: false,
        quiz: {
          class: {
            teacherId: userId
          }
        }
      },
      select: {
        studentId: true,
        currentAttempt: true,
        lastAttemptPassed: true,
        quizId: true,
        quiz: {
          select: {
            title: true,
            class: {
              select: {
                name: true
              }
            }
          }
        },
        student: {
          select: {
            name: true,
            email: true
          }
        },
        lastSubmission: {
          select: {
            score: true,
            createdAt: true
          }
        }
      }
    });

    // Format data untuk respons
    const formattedData = failedStudents.map(fs => ({
      studentId: fs.studentId,
      studentName: fs.student.name,
      email: fs.student.email,
      quizId: fs.quizId,
      quizTitle: fs.quiz.title,
      className: fs.quiz.class.name,
      lastScore: fs.lastSubmission?.score || 0,
      lastAttemptDate: fs.lastSubmission?.createdAt || new Date()
    }));

    return {
      success: true,
      data: formattedData
    };
  } catch (error) {
    console.error("Error fetching failed students:", error);
    return {
      success: false,
      message: "Gagal mendapatkan daftar siswa yang gagal"
    };
  }
} 