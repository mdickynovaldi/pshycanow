"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { 
  CreateQuizInput, 
  UpdateQuizInput,
  QuestionInput,
  createQuizSchema,
  updateQuizSchema,
  questionSchema
} from "@/lib/validations/quiz";
import { Quiz, Question } from "@/types";

// Helper untuk memeriksa apakah pengguna adalah guru
async function checkTeacherAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    return { success: false, message: "Anda tidak memiliki akses untuk fitur ini" };
  }
  
  return { success: true };
}

// 1. Mendapatkan semua kuis
export async function getAllQuizzes() {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    return { success: true, data: quizzes };
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return { success: false, message: "Gagal mengambil data kuis" };
  }
}

// 2. Mendapatkan kuis berdasarkan kelas
export async function getQuizzesByClass(classId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { classId },
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    return { success: true, data: quizzes };
  } catch (error) {
    console.error("Error fetching quizzes by class:", error);
    return { success: false, message: "Gagal mengambil data kuis untuk kelas ini" };
  }
}

// 3. Mendapatkan detail kuis
export async function getQuizById(id: string) {
  if (!id) {
    return { success: false, message: "ID kuis tidak valid" };
  }
  
  // Dapatkan sesi pengguna (bisa guru atau siswa)
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            teacherId: true
          }
        },
        questions: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Periksa akses berdasarkan peran:
    // 1. Jika guru, mereka dapat melihat kuis yang mereka buat
    // 2. Jika siswa, mereka dapat melihat kuis dari kelas yang mereka ikuti
    if (session.user.role === UserRole.TEACHER) {
      // Jika kuis terhubung ke kelas, pastikan guru adalah pemilik kelas
      if (quiz.class && quiz.class.teacherId !== session.user.id) {
        return { success: false, message: "Anda tidak memiliki akses untuk kuis ini" };
      }
    } else if (session.user.role === UserRole.STUDENT) {
      // Jika siswa, periksa apakah mereka terdaftar pada kelas yang berisi kuis ini
      if (!quiz.class) {
        return { success: false, message: "Kuis ini tidak terhubung dengan kelas manapun" };
      }
      
      // Cek apakah siswa terdaftar di kelas ini
      const enrollment = await prisma.classEnrollment.findFirst({
        where: {
          classId: quiz.class.id,
          studentId: session.user.id
        }
      });
      
      if (!enrollment) {
        return { success: false, message: "Anda tidak memiliki akses untuk kuis ini" };
      }
    }
    
    return { success: true, data: quiz };
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return { success: false, message: "Gagal mengambil data kuis" };
  }
}

// 4. Membuat kuis baru
export async function createQuiz(data: CreateQuizInput) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = createQuizSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  try {
    // Simpan data kuis
    const quizData = {
      title: data.title,
      description: data.description,
      classId: data.classId || null,
    };
    
    // Buat kuis baru
    const newQuiz = await prisma.quiz.create({
      data: quizData
    });
    
    // Jika terdapat pertanyaan, tambahkan
    if (data.questions && data.questions.length > 0) {
      const questionData = data.questions.map(q => ({
        text: q.text,
        imageUrl: q.imageUrl || null,
        expectedAnswer: q.expectedAnswer || null,
        quizId: newQuiz.id
      }));
      
      await prisma.question.createMany({
        data: questionData
      });
    }
    
    // Refresh cache path
    if (data.classId) {
      revalidatePath(`/teacher/classes/${data.classId}`);
    }
    revalidatePath("/teacher/quizzes");
    
    return { success: true, data: newQuiz };
  } catch (error) {
    console.error("Error creating quiz:", error);
    return { success: false, message: "Gagal membuat kuis baru" };
  }
}

// 5. Memperbarui kuis
export async function updateQuiz(id: string, data: UpdateQuizInput) {
  if (!id) {
    return { success: false, message: "ID kuis tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = updateQuizSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  try {
    // Cek apakah kuis ada
    const quiz = await prisma.quiz.findUnique({
      where: { id }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Update data kuis
    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        classId: data.classId || null
      }
    });
    
    // Refresh cache path
    if (data.classId) {
      revalidatePath(`/teacher/classes/${data.classId}`);
    }
    if (quiz.classId && quiz.classId !== data.classId) {
      revalidatePath(`/teacher/classes/${quiz.classId}`);
    }
    revalidatePath("/teacher/quizzes");
    revalidatePath(`/teacher/quizzes/${id}`);
    
    return { success: true, data: updatedQuiz };
  } catch (error) {
    console.error("Error updating quiz:", error);
    return { success: false, message: "Gagal memperbarui kuis" };
  }
}

// 6. Menghapus kuis
export async function deleteQuiz(id: string) {
  if (!id) {
    return { success: false, message: "ID kuis tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Cek apakah kuis ada
    const quiz = await prisma.quiz.findUnique({
      where: { id }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Hapus kuis (pertanyaan akan otomatis terhapus karena kaskade)
    await prisma.quiz.delete({
      where: { id }
    });
    
    // Refresh cache path
    if (quiz.classId) {
      revalidatePath(`/teacher/classes/${quiz.classId}`);
    }
    revalidatePath("/teacher/quizzes");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return { success: false, message: "Gagal menghapus kuis" };
  }
}

// 7. Menambahkan pertanyaan ke kuis
export async function addQuestionToQuiz(quizId: string, data: QuestionInput) {
  if (!quizId) {
    return { success: false, message: "ID kuis tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = questionSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  try {
    // Cek apakah kuis ada
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });
    
    if (!quiz) {
      return { success: false, message: "Kuis tidak ditemukan" };
    }
    
    // Tambahkan pertanyaan baru
    const newQuestion = await prisma.question.create({
      data: {
        text: data.text,
        imageUrl: data.imageUrl || null,
        expectedAnswer: data.expectedAnswer || null,
        quizId
      }
    });
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${quizId}`);
    
    return { success: true, data: newQuestion };
  } catch (error) {
    console.error("Error adding question to quiz:", error);
    return { success: false, message: "Gagal menambahkan pertanyaan ke kuis" };
  }
}

// 8. Memperbarui pertanyaan
export async function updateQuestion(id: string, data: QuestionInput) {
  if (!id) {
    return { success: false, message: "ID pertanyaan tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = questionSchema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  try {
    // Cek apakah pertanyaan ada
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        quiz: true
      }
    });
    
    if (!question) {
      return { success: false, message: "Pertanyaan tidak ditemukan" };
    }
    
    // Update pertanyaan
    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: {
        text: data.text,
        imageUrl: data.imageUrl,
        expectedAnswer: data.expectedAnswer
      }
    });
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${question.quizId}`);
    
    return { success: true, data: updatedQuestion };
  } catch (error) {
    console.error("Error updating question:", error);
    return { success: false, message: "Gagal memperbarui pertanyaan" };
  }
}

// 9. Menghapus pertanyaan
export async function deleteQuestion(id: string) {
  if (!id) {
    return { success: false, message: "ID pertanyaan tidak valid" };
  }
  
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    // Cek apakah pertanyaan ada
    const question = await prisma.question.findUnique({
      where: { id }
    });
    
    if (!question) {
      return { success: false, message: "Pertanyaan tidak ditemukan" };
    }
    
    // Simpan quizId sebelum menghapus pertanyaan
    const quizId = question.quizId;
    
    // Hapus pertanyaan
    await prisma.question.delete({
      where: { id }
    });
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${quizId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting question:", error);
    return { success: false, message: "Gagal menghapus pertanyaan" };
  }
} 