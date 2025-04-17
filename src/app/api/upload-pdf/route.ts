import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

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

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File tidak ditemukan" },
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

    // Buat nama file unik
    const fileName = `${uuidv4()}.pdf`;
    
    // Path upload folder
    const uploadDir = path.join(process.cwd(), "public", "uploads", "pdf");
    
    // Buat direktori jika belum ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);

    // Convert file ke buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Tulis file ke disk
    await writeFile(filePath, buffer);

    // URL file yang bisa diakses
    const pdfUrl = `/uploads/pdf/${fileName}`;

    return NextResponse.json({
      success: true,
      message: "File berhasil diunggah",
      pdfUrl
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengunggah file" },
      { status: 500 }
    );
  }
} 