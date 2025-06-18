import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.TEACHER) {
      return NextResponse.json(
        { success: false, message: "Tidak memiliki izin" },
        { status: 403 }
      );
    }

    // Ambil data form
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const quizId = formData.get("quizId") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    if (!quizId) {
      return NextResponse.json(
        { success: false, message: "Quiz ID diperlukan" },
        { status: 400 }
      );
    }

    // Validasi tipe file
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, message: "Hanya file PDF yang diizinkan" },
        { status: 400 }
      );
    }

    // Validasi ukuran file (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "Ukuran file maksimal 10MB" },
        { status: 400 }
      );
    }

    // Convert file ke buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Simpan atau update data PDF di database
    const existingAssistance = await prisma.quizAssistanceLevel3.findUnique({
      where: { quizId }
    });

    if (existingAssistance) {
      // Update existing record
      await prisma.quizAssistanceLevel3.update({
        where: { id: existingAssistance.id },
        data: {
          pdfData: buffer,
          pdfMimeType: file.type,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new record with minimal data
      await prisma.quizAssistanceLevel3.create({
        data: {
          title: "Bantuan Level 3",
          description: "Materi dalam format PDF untuk membantu siswa",
          quizId,
          pdfData: buffer,
          pdfMimeType: file.type
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "File berhasil diunggah",
      pdfId: quizId // Return quizId sebagai identifier
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengunggah file" },
      { status: 500 }
    );
  }
} 