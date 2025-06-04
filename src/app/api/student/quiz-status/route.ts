import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// import { prisma } from "@/lib/prisma"; // Tidak digunakan secara langsung di sini, tapi mungkin oleh getStudentQuizStatus
// import { AssistanceRequirement } from "@prisma/client"; // Tidak digunakan secara langsung di sini, tapi mungkin oleh getStudentQuizStatus
import { getStudentQuizStatus } from "@/lib/actions/quiz-progress-actions";

// Tipe data untuk progres kuis (dihapus karena tidak digunakan)
// interface StudentQuizProgress { ... }

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "Anda harus login untuk melihat status kuis"
      }, { status: 401 });
    }
    
    const quizId = request.nextUrl.searchParams.get('quizId');
    
    if (!quizId) {
      return NextResponse.json({
        success: false,
        message: "ID kuis tidak ditemukan"
      }, { status: 400 });
    }
    
    console.log(`[quiz-status] Mendapatkan status kuis untuk siswa ${userId} dan kuis ${quizId}`);
    
    const statusResult = await getStudentQuizStatus(quizId, userId);
    
    console.log(`[quiz-status] Status: ${JSON.stringify(statusResult.success && statusResult.data ? {
      currentAttempt: statusResult.data.currentAttempt,
      assistanceRequired: statusResult.data.assistanceRequired,
      lastMainQuizSubmission: statusResult.data.lastMainQuizSubmission ? {
        // Asumsikan lastMainQuizSubmission memiliki id dan status, sesuaikan jika perlu
        // id: statusResult.data.lastMainQuizSubmission.id, 
        status: statusResult.data.lastMainQuizSubmission.status
      } : null
    } : { error: statusResult.message })}`);
    
    if (!statusResult.success || !statusResult.data) { // Periksa juga statusResult.data
      return NextResponse.json({
        success: false,
        message: statusResult.message || "Data status kuis tidak ditemukan"
      }, { status: 500 }); // atau 404 jika data tidak ditemukan
    }
    
    // Bagian ini mungkin tidak lagi diperlukan karena getStudentQuizStatus sudah mengambil lastMainQuizSubmission
    // Namun, jika ada logika spesifik yang ingin dipertahankan, sesuaikan:
    // if (!statusResult.data.lastMainQuizSubmission) { 
    //   console.log(`[quiz-status] Tidak ada lastMainQuizSubmission dari getStudentQuizStatus, mencari submisi terbaru...`);
      
    //   const lastSubmissionDirect = await prisma.quizSubmission.findFirst({
    //     where: {
    //       quizId,
    //       studentId: userId,
    //       assistanceLevel: null // Pastikan hanya mengambil submisi kuis utama
    //     },
    //     orderBy: {
    //       createdAt: 'desc'
    //     }
    //   });
      
    //   if (lastSubmissionDirect) {
    //     console.log(`[quiz-status] Menemukan submisi terakhir langsung: ${lastSubmissionDirect.id}, status: ${lastSubmissionDirect.status}`);
    //     // Anda mungkin perlu menyesuaikan struktur statusResult.data atau cara Anda menggunakannya
    //     // Contoh: statusResult.data.lastMainQuizSubmission = { status: lastSubmissionDirect.status, score: lastSubmissionDirect.score };
    //   }
    // }
    
    return NextResponse.json({
      success: true,
      data: statusResult.data
    });
  } catch (error) {
    console.error("[quiz-status] Error:", error);
    return NextResponse.json({
      success: false,
      message: "Terjadi kesalahan saat mendapatkan status kuis"
    }, { status: 500 });
  }
} 