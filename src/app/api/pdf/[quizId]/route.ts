import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Tidak memiliki izin" },
        { status: 403 }
      );
    }

    const { quizId } = await params;

    // Ambil data PDF dari database
    const assistance = await prisma.quizAssistanceLevel3.findUnique({
      where: { quizId },
      select: {
        pdfData: true,
        pdfMimeType: true,
        title: true
      }
    });

    if (!assistance || !assistance.pdfData) {
      return NextResponse.json(
        { success: false, message: "PDF tidak ditemukan" },
        { status: 404 }
      );
    }

    // Return PDF sebagai response
    return new NextResponse(assistance.pdfData, {
      headers: {
        'Content-Type': assistance.pdfMimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${assistance.title || 'document'}.pdf"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error("Error serving PDF:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mengambil PDF" },
      { status: 500 }
    );
  }
} 