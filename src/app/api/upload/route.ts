import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Cek autentikasi dan akses guru
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Anda harus login terlebih dahulu" },
        { status: 401 }
      );
    }
    
    if (session.user.role !== UserRole.TEACHER) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses untuk fitur ini" },
        { status: 403 }
      );
    }
    
    // Dapatkan data form
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: "File tidak ditemukan" },
        { status: 400 }
      );
    }
    
    // Validasi tipe file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Tipe file tidak didukung" },
        { status: 400 }
      );
    }
    
    // Validasi ukuran file (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "Ukuran file terlalu besar (maksimal 5MB)" },
        { status: 400 }
      );
    }
    
    // Buat nama file unik
    const fileExtension = file.name.split('.').pop();
    const fileName = `quiz-images/${uuidv4()}.${fileExtension}`;
    
    // Upload ke Vercel Blob Storage
    const blob = await put(fileName, file, {
      access: 'public',
    });
    
    return NextResponse.json({
      success: true,
      url: blob.url
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengunggah gambar" },
      { status: 500 }
    );
  }
} 