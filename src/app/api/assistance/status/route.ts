import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAssistanceStatus } from "@/lib/actions/assistance-tracking";

/**
 * API untuk mendapatkan status bantuan
 * GET /api/assistance/status?quizId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");
    
    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const assistanceStatus = await getAssistanceStatus(session.user.id, quizId);

    return NextResponse.json({
      assistanceStatus,
      success: true,
    });
  } catch (error) {
    console.error("Error getting assistance status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
