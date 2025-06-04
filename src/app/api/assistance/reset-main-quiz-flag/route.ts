import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resetMustRetakeMainQuizFlag } from "@/lib/actions/assistance-tracking";

/**
 * API untuk reset flag wajib mengerjakan kuis utama
 * POST /api/assistance/reset-main-quiz-flag
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { quizId } = await request.json();
    
    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const success = await resetMustRetakeMainQuizFlag(session.user.id, quizId);

    if (success) {
      return NextResponse.json({
        message: "Must retake main quiz flag reset successfully",
        success: true,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to reset flag" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error resetting must retake main quiz flag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
