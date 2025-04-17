"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { 
  CreateStudentInput, 
  UpdateStudentInput,
  createStudentSchema,
  updateStudentSchema
} from "../../lib/validations/student";
import { Student } from "../../types";

// Helper untuk memeriksa apakah pengguna adalah guru
async function checkTeacherAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  // Type assertion untuk properti custom
  const userRole = (session.user as any).role;
  
  if (userRole !== UserRole.TEACHER) {
    return { success: false, message: "Anda tidak memiliki akses untuk fitur ini" };
  }
  
  return { success: true, userId: (session.user as any).id };
}

// 1. Mendapatkan semua siswa
export async function getAllStudents() {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const students = await prisma.user.findMany({
      where: { role: UserRole.STUDENT },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: { name: "asc" }
    });
    
    return { success: true, data: students };
  } catch (error) {
    console.error("Error fetching students:", error);
    return { success: false, message: "Gagal mengambil data siswa" };
  }
}

// 2. Mendapatkan detail siswa
export async function getStudentById(id: string) {
  if (!id) {
    return { success: false, message: "ID siswa tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const student = await prisma.user.findUnique({
      where: { 
        id,
        role: UserRole.STUDENT 
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        enrollments: {
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    
    if (!student) {
      return { success: false, message: "Siswa tidak ditemukan" };
    }
    
    return { 
      success: true, 
      data: {
        ...student,
        classes: student.enrollments.map(e => e.class)
      }
    };
  } catch (error) {
    console.error("Error fetching student:", error);
    return { success: false, message: "Gagal mengambil data siswa" };
  }
}

// 3. Membuat siswa baru
export async function createStudent(data: CreateStudentInput) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = createStudentSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  try {
    // Cek apakah email sudah digunakan
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      return { success: false, message: "Email sudah digunakan oleh pengguna lain" };
    }
    
    // Hash password
    const hashedPassword = await hash(data.password, 10);
    
    // Buat siswa baru
    const newStudent = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: UserRole.STUDENT
      }
    });
    
    revalidatePath("/teacher/students");
    
    return { success: true, data: newStudent };
  } catch (error) {
    console.error("Error creating student:", error);
    return { success: false, message: "Gagal membuat akun siswa baru" };
  }
}

// 4. Memperbarui siswa
export async function updateStudent(id: string, data: UpdateStudentInput) {
  if (!id) {
    return { success: false, message: "ID siswa tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = updateStudentSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  try {
    // Cek apakah siswa ada
    const student = await prisma.user.findUnique({
      where: { 
        id,
        role: UserRole.STUDENT 
      }
    });
    
    if (!student) {
      return { success: false, message: "Siswa tidak ditemukan" };
    }
    
    // Jika email diubah, periksa apakah email baru sudah digunakan
    if (data.email !== student.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });
      
      if (existingUser) {
        return { success: false, message: "Email sudah digunakan oleh pengguna lain" };
      }
    }
    
    // Persiapkan data update
    const updateData: any = {
      name: data.name,
      email: data.email
    };
    
    // Jika password baru disediakan, hash password
    if (data.password) {
      updateData.password = await hash(data.password, 10);
    }
    
    // Update data siswa
    const updatedStudent = await prisma.user.update({
      where: { id },
      data: updateData
    });
    
    revalidatePath("/teacher/students");
    revalidatePath(`/teacher/students/${id}`);
    
    return { success: true, data: updatedStudent };
  } catch (error) {
    console.error("Error updating student:", error);
    return { success: false, message: "Gagal memperbarui data siswa" };
  }
}

// 5. Menghapus siswa
export async function deleteStudent(id: string) {
  if (!id) {
    return { success: false, message: "ID siswa tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Cek apakah siswa ada
    const student = await prisma.user.findUnique({
      where: { 
        id,
        role: UserRole.STUDENT 
      }
    });
    
    if (!student) {
      return { success: false, message: "Siswa tidak ditemukan" };
    }
    
    // Hapus siswa (pendaftaran kelas akan otomatis terhapus karena kaskade)
    await prisma.user.delete({
      where: { id }
    });
    
    revalidatePath("/teacher/students");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting student:", error);
    return { success: false, message: "Gagal menghapus siswa" };
  }
}

/**
 * Mendapatkan detail siswa termasuk kelas dan statistik kuis
 */
export async function getStudentDetails(studentId: string) {
  try {
    const session = await getServerSession(authOptions);
    const teacherId = session?.user?.id;

    if (!teacherId) {
      return {
        success: false,
        message: "Anda harus login sebagai pengajar untuk melihat detail siswa"
      };
    }

    // Dapatkan data siswa
    const student = await prisma.user.findUnique({
      where: {
        id: studentId
      }
    });

    if (!student) {
      return {
        success: false,
        message: "Siswa tidak ditemukan"
      };
    }

    // Dapatkan enrollments siswa
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        studentId,
        class: {
          teacherId
        }
      },
      include: {
        class: true
      }
    });

    // Dapatkan statistik kuis siswa
    const quizSubmissions = await prisma.quizSubmission.findMany({
      where: {
        studentId,
        quiz: {
          class: {
            teacherId
          }
        }
      }
    });

    // Hitung statistik
    const completedQuizzes = quizSubmissions.filter(s => s.status === "PASSED").length;
    const totalSubmissions = quizSubmissions.length;
    let averageScore = 0;

    // Format data untuk respons
    const formattedData = {
      id: student.id,
      name: student.name,
      email: student.email,
      image: student.image,
      joinedAt: new Date(), // Gunakan tanggal hari ini karena createdAt tidak tersedia
      classes: enrollments.map(e => ({
        id: e.classId,
        name: e.class.name || ""
      })),
      completedQuizzes,
      totalSubmissions,
      averageScore
    };

    return {
      success: true,
      data: formattedData
    };
  } catch (error) {
    console.error("Error fetching student details:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat memuat detail siswa"
    };
  }
}

/**
 * Mendapatkan submisi kuis dari siswa
 */
export async function getStudentQuizSubmissions(studentId: string) {
  try {
    const session = await getServerSession(authOptions);
    const teacherId = session?.user?.id;

    if (!teacherId) {
      return {
        success: false,
        message: "Anda harus login sebagai pengajar untuk melihat submisi siswa"
      };
    }

    // Dapatkan data submisi kuis
    const submissions = await prisma.quizSubmission.findMany({
      where: {
        studentId,
        quiz: {
          class: {
            teacherId
          }
        }
      },
      include: {
        quiz: {
          include: {
            class: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Format data untuk respons
    const formattedData = submissions.map(s => {
      // Penanganan null/undefined yang aman
      const quiz = s.quiz || { title: "Unknown", class: { name: "Unknown" } };
      
      return {
        id: s.id,
        quizId: s.quizId,
        quizTitle: quiz.title || "Unknown",
        className: quiz.class?.name || "Unknown",
        score: 0, // Default karena field ini tidak ada
        passed: s.status === "PASSED",
        attemptNumber: s.attemptNumber || 1,
        submittedAt: s.createdAt
      };
    });

    return {
      success: true,
      data: formattedData
    };
  } catch (error) {
    console.error("Error fetching student quiz submissions:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat memuat submisi kuis siswa"
    };
  }
}

/**
 * Mendapatkan daftar kuis yang gagal setelah 4 kali percobaan
 */
export async function getStudentFailedQuizzes(studentId: string) {
  try {
    const session = await getServerSession(authOptions);
    const teacherId = session?.user?.id;

    if (!teacherId) {
      return {
        success: false,
        message: "Anda harus login sebagai pengajar untuk melihat kuis yang gagal"
      };
    }

    // Dapatkan daftar progress kuis siswa yang gagal
    const failedProgress = await prisma.studentQuizProgress.findMany({
      where: {
        studentId,
        currentAttempt: 4,
        lastAttemptPassed: false,
        quiz: {
          class: {
            teacherId
          }
        }
      },
      include: {
        quiz: {
          include: {
            class: true
          }
        }
      }
    });

    // Untuk setiap progress, dapatkan submisi terakhir
    const formattedData = await Promise.all(
      failedProgress.map(async (progress) => {
        // Dapatkan submisi terakhir untuk kuis ini
        const latestSubmission = await prisma.quizSubmission.findFirst({
          where: {
            studentId,
            quizId: progress.quizId
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        // Amankan akses properti dengan fallback
        const quiz = progress.quiz || { title: "Unknown", class: { name: "Unknown" } };
        
        return {
          quizId: progress.quizId,
          quizTitle: quiz.title || "Unknown",
          className: quiz.class?.name || "Unknown",
          lastScore: 0, // Default
          lastAttemptDate: latestSubmission?.createdAt || new Date(),
          attempts: progress.currentAttempt
        };
      })
    );

    return {
      success: true,
      data: formattedData
    };
  } catch (error) {
    console.error("Error fetching failed quizzes:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat memuat kuis yang gagal"
    };
  }
}

// Fungsi untuk mendapatkan kelas-kelas yang diikuti oleh siswa
export async function getStudentCourses() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login untuk melihat kursus" };
  }
  
  // Type assertion untuk properti custom di session
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  
  if (userRole !== UserRole.STUDENT) {
    return { success: false, message: "Anda tidak memiliki akses untuk fitur ini" };
  }
  
  if (!userId) {
    return { success: false, message: "ID pengguna tidak valid" };
  }
  
  try {
    // Ambil kelas-kelas yang diikuti oleh siswa
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        studentId: userId
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true,
            teacher: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    // Format data untuk respons
    const courses = enrollments.map(enrollment => ({
      id: enrollment.class.id,
      title: enrollment.class.name,
      description: enrollment.class.description || "Tidak ada deskripsi",
      teacher: enrollment.class.teacher.name || "Nama guru tidak tersedia",
      // Nilai-nilai berikut adalah contoh - bisa disesuaikan atau ditambahkan ke model Class jika diperlukan
      duration: "8-12 minggu",
      level: "Umum"
    }));
    
    return { success: true, data: courses };
  } catch (error) {
    console.error("Error fetching student courses:", error);
    return { success: false, message: "Gagal mengambil data kursus" };
  }
}

// Mendapatkan siswa yang belum terdaftar di kelas tertentu 
export async function getAvailableStudents(classId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Dapatkan IDs siswa yang sudah terdaftar di kelas
    const enrolledStudentIds = await prisma.classEnrollment.findMany({
      where: { classId },
      select: { studentId: true }
    });
    
    const enrolledIds = enrolledStudentIds.map(e => e.studentId);
    
    // Dapatkan siswa yang belum terdaftar di kelas
    const availableStudents = await prisma.user.findMany({
      where: { 
        role: UserRole.STUDENT,
        id: { notIn: enrolledIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: { name: "asc" }
    });
    
    return { success: true, data: availableStudents };
  } catch (error) {
    console.error("Error fetching available students:", error);
    return { success: false, message: "Gagal mengambil data siswa yang tersedia" };
  }
} 