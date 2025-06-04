import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import * as fs from 'fs';

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
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    // Path untuk menyimpan file
    const publicDir = path.join(process.cwd(), "public");
    const uploadsDir = path.join(publicDir, "uploads");
    const filePath = path.join(uploadsDir, fileName);
    
    // Konversi file ke ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Buat direktori jika belum ada
    try {
      await writeFile(filePath, Buffer.from(buffer));
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'ENOENT') {
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        await writeFile(filePath, Buffer.from(buffer));
      } else {
        throw error;
      }
    }
    
    // URL relatif untuk file
    const fileUrl = `/uploads/${fileName}`;
    
    return NextResponse.json({
      success: true,
      url: fileUrl
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengunggah gambar" },
      { status: 500 }
    );
  }
} 