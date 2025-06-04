/**
 * Hook untuk mengelola status bantuan kuis
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface AssistanceStatus {
  level1Completed: boolean;
  level2Completed: boolean;
  level3Completed: boolean;
  level1Accessible: boolean;
  level2Accessible: boolean;
  level3Accessible: boolean;
  mustRetakeMainQuiz: boolean;
  canTakeMainQuiz: boolean;
  nextStep: string | null;
}

export function useAssistanceStatus(quizId: string) {
  const { data: session } = useSession();
  const [assistanceStatus, setAssistanceStatus] = useState<AssistanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssistanceStatus = useCallback(async () => {
    if (!session?.user?.id || !quizId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/assistance/status?quizId=${quizId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch assistance status");
      }

      const data = await response.json();
      setAssistanceStatus(data.assistanceStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setAssistanceStatus(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, quizId]);

  const markAssistanceCompleted = async (
    level: number,
    options: {
      submissionId?: string;
      assistanceId?: string;
      readingTime?: number;
      isApproved?: boolean;
    }
  ) => {
    try {
      const response = await fetch(`/api/assistance/${level}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark assistance level ${level} as completed`);
      }

      // Refresh status setelah marking completion
      await fetchAssistanceStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  const resetMainQuizFlag = async () => {
    try {
      const response = await fetch("/api/assistance/reset-main-quiz-flag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quizId }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset main quiz flag");
      }

      // Refresh status setelah reset
      await fetchAssistanceStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  useEffect(() => {
    fetchAssistanceStatus();
  }, [session, quizId, fetchAssistanceStatus]);

  return {
    assistanceStatus,
    loading,
    error,
    fetchAssistanceStatus,
    markAssistanceCompleted,
    resetMainQuizFlag,
  };
}
