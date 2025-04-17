"use server";

import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { 
  QuizAssistanceLevel1Input,
  AssistanceQuestionYesNoInput,
  QuizAssistanceLevel2Input,
  AssistanceQuestionEssayInput, 
  QuizAssistanceLevel3Input,
  quizAssistanceLevel1Schema,
  quizAssistanceLevel2Schema,
  quizAssistanceLevel3Schema
} from "@/lib/validations/quiz-assistance";
import { writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Helper untuk memeriksa apakah pengguna adalah guru
async function checkTeacherAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { success: false, message: "Anda harus login terlebih dahulu" };
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    return { success: false, message: "Anda tidak memiliki akses untuk fitur ini" };
  }
  
  return { success: true, userId: session.user.id };
}

// Helper untuk memeriksa kepemilikan quiz
async function checkQuizOwnership(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { class: true }
  });
  
  if (!quiz) {
    return { success: false, message: "Kuis tidak ditemukan" };
  }
  
  if (quiz.class && quiz.class.teacherId !== userId) {
    return { success: false, message: "Anda tidak memiliki akses ke kuis ini" };
  }
  
  return { success: true, quiz };
}

// ====================== LEVEL 1 (Yes/No Questions) ======================

// Mendapatkan data quiz assistance level 1
export async function getQuizAssistanceLevel1(quizId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const quizAssistance = await prisma.quizAssistanceLevel1.findUnique({
      where: { quizId },
      include: { questions: true }
    });
    
    return { success: true, data: quizAssistance };
  } catch (error) {
    console.error("Error fetching quiz assistance level 1:", error);
    return { success: false, message: "Gagal mengambil data kuis bantuan level 1" };
  }
}

// Membuat atau memperbarui quiz assistance level 1
export async function upsertQuizAssistanceLevel1(data: QuizAssistanceLevel1Input) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = quizAssistanceLevel1Schema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  // Periksa kepemilikan quiz
  const ownershipCheck = await checkQuizOwnership(data.quizId, access.userId!);
  
  if (!ownershipCheck.success) {
    return { success: false, message: ownershipCheck.message };
  }
  
  try {
    // Cek apakah quiz assistance sudah ada
    const existingAssistance = await prisma.quizAssistanceLevel1.findUnique({
      where: { quizId: data.quizId }
    });
    
    // Buat atau update quiz assistance level 1
    const quizAssistance = await prisma.quizAssistanceLevel1.upsert({
      where: { 
        id: data.id || "",
        quizId: data.quizId
      },
      update: {
        title: data.title,
        description: data.description
      },
      create: {
        title: data.title,
        description: data.description,
        quizId: data.quizId
      }
    });
    
    // Jika sudah ada, hapus semua pertanyaan yang ada
    if (existingAssistance) {
      await prisma.assistanceQuestionYesNo.deleteMany({
        where: { assistanceQuizId: existingAssistance.id }
      });
    }
    
    // Buat pertanyaan baru
    if (data.questions && data.questions.length > 0) {
      const questionData = data.questions.map(q => ({
        question: q.question,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        assistanceQuizId: quizAssistance.id
      }));
      
      await prisma.assistanceQuestionYesNo.createMany({
        data: questionData
      });
    }
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${data.quizId}`);
    revalidatePath(`/teacher/quizzes/${data.quizId}/assistance`);
    
    return { success: true, data: quizAssistance };
  } catch (error) {
    console.error("Error upserting quiz assistance level 1:", error);
    return { success: false, message: "Gagal menyimpan kuis bantuan level 1" };
  }
}

// Menghapus quiz assistance level 1
export async function deleteQuizAssistanceLevel1(quizId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Periksa kepemilikan quiz
  const ownershipCheck = await checkQuizOwnership(quizId, access.userId!);
  
  if (!ownershipCheck.success) {
    return { success: false, message: ownershipCheck.message };
  }
  
  try {
    // Hapus quiz assistance level 1 (akan menghapus pertanyaan secara cascade)
    await prisma.quizAssistanceLevel1.delete({
      where: { quizId }
    });
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${quizId}`);
    revalidatePath(`/teacher/quizzes/${quizId}/assistance`);
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting quiz assistance level 1:", error);
    return { success: false, message: "Gagal menghapus kuis bantuan level 1" };
  }
}

// ====================== LEVEL 2 (Essay Questions) ======================

// Mendapatkan data quiz assistance level 2
export async function getQuizAssistanceLevel2(quizId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const quizAssistance = await prisma.quizAssistanceLevel2.findUnique({
      where: { quizId },
      include: { questions: true }
    });
    
    return { success: true, data: quizAssistance };
  } catch (error) {
    console.error("Error fetching quiz assistance level 2:", error);
    return { success: false, message: "Gagal mengambil data kuis bantuan level 2" };
  }
}

// Membuat atau memperbarui quiz assistance level 2
export async function upsertQuizAssistanceLevel2(data: QuizAssistanceLevel2Input) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = quizAssistanceLevel2Schema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  // Periksa kepemilikan quiz
  const ownershipCheck = await checkQuizOwnership(data.quizId, access.userId!);
  
  if (!ownershipCheck.success) {
    return { success: false, message: ownershipCheck.message };
  }
  
  try {
    // Cek apakah quiz assistance sudah ada
    const existingAssistance = await prisma.quizAssistanceLevel2.findUnique({
      where: { quizId: data.quizId }
    });
    
    // Buat atau update quiz assistance level 2
    const quizAssistance = await prisma.quizAssistanceLevel2.upsert({
      where: { 
        id: data.id || "",
        quizId: data.quizId
      },
      update: {
        title: data.title,
        description: data.description
      },
      create: {
        title: data.title,
        description: data.description,
        quizId: data.quizId
      }
    });
    
    // Jika sudah ada, hapus semua pertanyaan yang ada
    if (existingAssistance) {
      await prisma.assistanceQuestionEssay.deleteMany({
        where: { assistanceQuizId: existingAssistance.id }
      });
    }
    
    // Buat pertanyaan baru
    if (data.questions && data.questions.length > 0) {
      const questionData = data.questions.map(q => ({
        question: q.question,
        hint: q.hint,
        correctAnswer: q.correctAnswer,
        assistanceQuizId: quizAssistance.id
      }));
      
      await prisma.assistanceQuestionEssay.createMany({
        data: questionData
      });
    }
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${data.quizId}`);
    revalidatePath(`/teacher/quizzes/${data.quizId}/assistance`);
    
    return { success: true, data: quizAssistance };
  } catch (error) {
    console.error("Error upserting quiz assistance level 2:", error);
    return { success: false, message: "Gagal menyimpan kuis bantuan level 2" };
  }
}

// Menghapus quiz assistance level 2
export async function deleteQuizAssistanceLevel2(quizId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Periksa kepemilikan quiz
  const ownershipCheck = await checkQuizOwnership(quizId, access.userId!);
  
  if (!ownershipCheck.success) {
    return { success: false, message: ownershipCheck.message };
  }
  
  try {
    // Hapus quiz assistance level 2 (akan menghapus pertanyaan secara cascade)
    await prisma.quizAssistanceLevel2.delete({
      where: { quizId }
    });
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${quizId}`);
    revalidatePath(`/teacher/quizzes/${quizId}/assistance`);
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting quiz assistance level 2:", error);
    return { success: false, message: "Gagal menghapus kuis bantuan level 2" };
  }
}

// ====================== LEVEL 3 (PDF Reference) ======================

// Mendapatkan data quiz assistance level 3
export async function getQuizAssistanceLevel3(quizId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  try {
    const quizAssistance = await prisma.quizAssistanceLevel3.findUnique({
      where: { quizId }
    });
    
    return { success: true, data: quizAssistance };
  } catch (error) {
    console.error("Error fetching quiz assistance level 3:", error);
    return { success: false, message: "Gagal mengambil data kuis bantuan level 3" };
  }
}

// Upload PDF file
export async function uploadPdfFile(file: File) {
  try {
    // Validasi tipe file
    if (file.type !== 'application/pdf') {
      return { success: false, message: "Hanya file PDF yang diperbolehkan" };
    }
    
    // Batasi ukuran file (misalnya 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB dalam bytes
    if (file.size > maxSize) {
      return { success: false, message: "Ukuran file tidak boleh lebih dari 10MB" };
    }
    
    // Buat nama file unik
    const fileName = `${uuidv4()}.pdf`;
    
    // Path untuk menyimpan file
    const publicDir = path.join(process.cwd(), "public");
    const uploadsDir = path.join(publicDir, "pdfs");
    const filePath = path.join(uploadsDir, fileName);
    
    // Konversi file ke ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Buat direktori jika belum ada
    try {
      await writeFile(filePath, Buffer.from(buffer));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        const fs = require('fs');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        await writeFile(filePath, Buffer.from(buffer));
      } else {
        throw error;
      }
    }
    
    // URL relatif untuk file
    const pdfUrl = `/pdfs/${fileName}`;
    
    return { success: true, pdfUrl };
  } catch (error) {
    console.error("Error uploading PDF file:", error);
    return { success: false, message: "Gagal mengunggah file PDF" };
  }
}

// Membuat atau memperbarui quiz assistance level 3
export async function upsertQuizAssistanceLevel3(data: QuizAssistanceLevel3Input) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Validasi input
  const validationResult = quizAssistanceLevel3Schema.safeParse(data);
  
  if (!validationResult.success) {
    return { 
      success: false, 
      message: "Validasi gagal", 
      errors: validationResult.error.format() 
    };
  }
  
  // Periksa kepemilikan quiz
  const ownershipCheck = await checkQuizOwnership(data.quizId, access.userId!);
  
  if (!ownershipCheck.success) {
    return { success: false, message: ownershipCheck.message };
  }
  
  try {
    // Buat atau update quiz assistance level 3
    const quizAssistance = await prisma.quizAssistanceLevel3.upsert({
      where: { 
        id: data.id || "",
        quizId: data.quizId
      },
      update: {
        title: data.title,
        description: data.description,
        pdfUrl: data.pdfUrl
      },
      create: {
        title: data.title,
        description: data.description,
        pdfUrl: data.pdfUrl,
        quizId: data.quizId
      }
    });
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${data.quizId}`);
    revalidatePath(`/teacher/quizzes/${data.quizId}/assistance`);
    
    return { success: true, data: quizAssistance };
  } catch (error) {
    console.error("Error upserting quiz assistance level 3:", error);
    return { success: false, message: "Gagal menyimpan kuis bantuan level 3" };
  }
}

// Menghapus quiz assistance level 3
export async function deleteQuizAssistanceLevel3(quizId: string) {
  const access = await checkTeacherAccess();
  
  if (!access.success) {
    return { success: false, message: access.message };
  }
  
  // Periksa kepemilikan quiz
  const ownershipCheck = await checkQuizOwnership(quizId, access.userId!);
  
  if (!ownershipCheck.success) {
    return { success: false, message: ownershipCheck.message };
  }
  
  try {
    // Dapatkan data untuk menghapus file PDF
    const assistanceLevel3 = await prisma.quizAssistanceLevel3.findUnique({
      where: { quizId }
    });
    
    if (assistanceLevel3) {
      // Hapus quiz assistance level 3
      await prisma.quizAssistanceLevel3.delete({
        where: { quizId }
      });
      
      // TODO: Hapus file PDF jika diinginkan
      // const fs = require('fs');
      // const pdfPath = path.join(process.cwd(), "public", assistanceLevel3.pdfUrl);
      // if (fs.existsSync(pdfPath)) {
      //   fs.unlinkSync(pdfPath);
      // }
    }
    
    // Refresh cache path
    revalidatePath(`/teacher/quizzes/${quizId}`);
    revalidatePath(`/teacher/quizzes/${quizId}/assistance`);
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting quiz assistance level 3:", error);
    return { success: false, message: "Gagal menghapus kuis bantuan level 3" };
  }
} 