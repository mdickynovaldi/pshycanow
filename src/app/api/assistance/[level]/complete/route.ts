import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  markAssistanceLevel1Completed,
  markAssistanceLevel2Completed,
  markAssistanceLevel3Completed,
} from "@/lib/actions/assistance-tracking";

/**
 * API untuk menandai penyelesaian bantuan
 * POST /api/assistance/[level]/complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { level: string } }
) {
  try {
    const { level } = params;
    
    if (!level) {
      return NextResponse.json(
        { error: "Level parameter is required" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { quizId, submissionId, assistanceId, readingTime, isApproved } = body;
    
    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const levelNumber = parseInt(level);
    
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 3) {
      return NextResponse.json(
        { error: "Invalid assistance level" },
        { status: 400 }
      );
    }

    let success = false;

    switch (levelNumber) {
      case 1:
        if (!submissionId) {
          return NextResponse.json(
            { error: "Submission ID is required for level 1" },
            { status: 400 }
          );
        }
        success = await markAssistanceLevel1Completed(
          session.user.id,
          quizId,
          submissionId
        );
        break;

      case 2:
        if (!submissionId) {
          return NextResponse.json(
            { error: "Submission ID is required for level 2" },
            { status: 400 }
          );
        }
        success = await markAssistanceLevel2Completed(
          session.user.id,
          quizId,
          submissionId,
          isApproved || false
        );
        break;

      case 3:
        if (!assistanceId) {
          return NextResponse.json(
            { error: "Assistance ID is required for level 3" },
            { status: 400 }
          );
        }
        success = await markAssistanceLevel3Completed(
          session.user.id,
          quizId,
          assistanceId,
          readingTime
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid assistance level" },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json({
        message: `Assistance level ${levelNumber} marked as completed`,
        success: true,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to mark assistance as completed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in assistance complete API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Method yang tidak didukung
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}
