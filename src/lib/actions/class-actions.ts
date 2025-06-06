"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  CreateClassInput, 
  UpdateClassInput, 
  EnrollStudentsInput, 
  RemoveStudentInput,
  createClassSchema,
  updateClassSchema,
  enrollStudentsSchema,
  removeStudentSchema
} from "@/lib/validations/class";

// Fungsi helper untuk memeriksa apakah pengguna adalah guru
async function checkTeacherAccess(): Promise<{ success: false, message: string } | { success: true, userId: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    return { success: false, message: "Anda tidak memiliki akses untuk fitur ini" };
  }
  
  if (!session.user.id) {
    return { success: false, message: "ID pengguna tidak ditemukan" };
  }
  
  return { success: true, userId: session.user.id };
}

// Fungsi helper untuk memeriksa kepemilikan kelas
async function checkClassOwnership(classId: string, teacherId: string) {
  if (!classId) {
    return { success: false, message: "ID kelas tidak valid" };
  }
  
  const classData = await prisma.class.findUnique({
    where: { id: classId },
  });
  
  if (!classData) {
    return { success: false, message: "Kelas tidak ditemukan" };
  }
  
  if (classData.teacherId !== teacherId) {
    return { success: false, message: "Anda tidak memiliki akses ke kelas ini" };
  }
  
  return { success: true, classData };
}

// 1. Mendapatkan semua kelas milik guru yang sedang login
export async function getTeacherClasses() {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  const classes = await prisma.class.findMany({
    where: { teacherId: access.userId },
    include: {
      _count: {
        select: {
          enrollments: true,
          quizzes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Transform data untuk mengganti nama field _count.enrollments menjadi _count.students
  const transformedClasses = classes.map(classItem => ({
    ...classItem,
    _count: {
      students: classItem._count.enrollments,
      quizzes: classItem._count.quizzes,
    },
  }));
  
  return { success: true, data: transformedClasses };
}

// 2. Mendapatkan detail kelas termasuk daftar siswa
export async function getClassDetail(classId: string) {
  if (!classId) {
    return { success: false, message: "ID kelas tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  const ownership = await checkClassOwnership(classId, access.userId);
  
  if (!ownership.success) {
    return { success: false, message: ownership.message };
  }
  
  const classWithStudents = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      enrollments: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });
  
  if (!classWithStudents) {
    return { success: false, message: "Kelas tidak ditemukan" };
  }
  
  // Format data untuk response
  const formattedData = {
    ...classWithStudents,
    students: classWithStudents.enrollments.map(enrollment => enrollment.student),
  };
  
  return { success: true, data: formattedData };
}

// 3. Mendapatkan siswa yang belum terdaftar di kelas
export async function getAvailableStudents(classId: string) {
  if (!classId) {
    return { success: false, message: "ID kelas tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Dapatkan ID siswa yang sudah terdaftar di kelas
  const enrolledStudentIds = await prisma.classEnrollment.findMany({
    where: { classId },
    select: { studentId: true },
  });
  
  const enrolledIds = enrolledStudentIds.map(e => e.studentId);
  
  // Dapatkan siswa yang belum terdaftar
  const availableStudents = await prisma.user.findMany({
    where: {
      role: UserRole.STUDENT,
      id: { notIn: enrolledIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });
  
  return { success: true, data: availableStudents };
}

// 4. Membuat kelas baru
export async function createClass(data: CreateClassInput) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = createClassSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  // Buat kelas baru
  try {
    const newClass = await prisma.class.create({
      data: {
        name: data.name,
        description: data.description ?? "",
        teacherId: access.userId,
      },
    });
    
    revalidatePath("/teacher/classes");
    
    return { success: true, data: newClass };
  } catch (error) {
    console.error("Error creating class:", error);
    return { success: false, message: "Gagal membuat kelas" };
  }
}

// 5. Memperbarui kelas
export async function updateClass(classId: string, data: UpdateClassInput) {
  if (!classId) {
    return { success: false, message: "ID kelas tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  const ownership = await checkClassOwnership(classId, access.userId);
  
  if (!ownership.success) {
    return { success: false, message: ownership.message };
  }
  
  // Validasi input
  const validationResult = updateClassSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  // Update kelas
  try {
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
        name: data.name,
        description: data.description ?? "",
      },
    });
    
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath("/teacher/classes");
    
    return { success: true, data: updatedClass };
  } catch (error) {
    console.error("Error updating class:", error);
    return { success: false, message: "Gagal memperbarui kelas" };
  }
}

// 6. Menghapus kelas
export async function deleteClass(classId: string) {
  if (!classId) {
    return { success: false, message: "ID kelas tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  const ownership = await checkClassOwnership(classId, access.userId);
  
  if (!ownership.success) {
    return { success: false, message: ownership.message };
  }
  
  // Hapus kelas beserta pendaftaran siswa (akan otomatis terhapus karena relasi onDelete: Cascade)
  try {
    await prisma.class.delete({
      where: { id: classId },
    });
    
    revalidatePath("/teacher/classes");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting class:", error);
    return { success: false, message: "Gagal menghapus kelas" };
  }
}

// 7. Mendaftarkan siswa ke kelas
export async function enrollStudents(data: EnrollStudentsInput) {
  if (!data.classId) {
    return { success: false, message: "ID kelas tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  const ownership = await checkClassOwnership(data.classId, access.userId);
  
  if (!ownership.success) {
    return { success: false, message: ownership.message };
  }
  
  // Validasi input
  const validationResult = enrollStudentsSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  // Daftarkan siswa
  try {
    // Buat array dari data pendaftaran
    const enrollmentData = data.studentIds.map(studentId => ({
      classId: data.classId as string,
      studentId,
    }));
    
    // Gunakan createMany untuk operasi batch
    await prisma.$transaction(
      enrollmentData.map(enrollment => 
        prisma.classEnrollment.create({
          data: enrollment,
        })
      )
    );
    
    revalidatePath(`/teacher/classes/${data.classId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error enrolling students:", error);
    return { success: false, message: "Gagal mendaftarkan siswa" };
  }
}

// 8. Menghapus siswa dari kelas
export async function removeStudent(data: RemoveStudentInput) {
  if (!data.classId || !data.studentId) {
    return { success: false, message: "ID kelas atau ID siswa tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  const ownership = await checkClassOwnership(data.classId, access.userId);
  
  if (!ownership.success) {
    return { success: false, message: ownership.message };
  }
  
  // Validasi input
  const validationResult = removeStudentSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  // Hapus pendaftaran siswa
  try {
    await prisma.classEnrollment.deleteMany({
      where: {
        classId: data.classId,
        studentId: data.studentId,
      },
    });
    
    revalidatePath(`/teacher/classes/${data.classId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error removing student:", error);
    return { success: false, message: "Gagal menghapus siswa dari kelas" };
  }
} 