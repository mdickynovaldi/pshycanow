import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComprehensiveAssistanceStatus } from "@/lib/actions/assistance-integration";

/**
 * API untuk mendapatkan comprehensive assistance status
 * GET /api/quiz/[quizId]/assistance-status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { quizId } = await params;
    
    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const assistanceStatus = await getComprehensiveAssistanceStatus(
      session.user.id,
      quizId
    );

    if (!assistanceStatus) {
      return NextResponse.json(
        { error: "Failed to get assistance status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      assistanceStatus,
      success: true,
    });
  } catch (error) {
    console.error("Error getting comprehensive assistance status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
