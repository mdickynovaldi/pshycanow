/**
 * Implementasi sederhana untuk menambahkan assistance tracking
 * ke halaman student quiz yang sudah ada
 */


import { useAssistanceStatus } from "@/hooks/useAssistanceStatus";
import { MainQuizButton } from "@/components/MainQuizButton";
import { toast } from "sonner";

interface UseAssistanceTrackingProps {
  quizId: string;
  onStartQuiz: () => void;
  isStartingQuiz: boolean;
}

export function useAssistanceTracking({ 
  quizId, 
  onStartQuiz, 
  isStartingQuiz 
}: UseAssistanceTrackingProps) {
  const { 
    assistanceStatus, 
    loading: assistanceLoading,
    markAssistanceCompleted, 
    resetMainQuizFlag 
  } = useAssistanceStatus(quizId);

  // Handler untuk menyelesaikan bantuan level 1
  const handleCompleteLevel1 = async (submissionId: string) => {
    try {
      const success = await markAssistanceCompleted(1, { submissionId });
      if (success) {
        toast.success("Bantuan Level 1 berhasil diselesaikan! Sekarang Anda wajib mengerjakan kuis utama.");
      } else {
        toast.error("Gagal menyelesaikan bantuan Level 1");
      }
      return success;
    } catch {
      toast.error("Terjadi kesalahan saat menyelesaikan bantuan Level 1");
      return false;
    }
  };

  // Handler untuk menyelesaikan bantuan level 2  
  const handleCompleteLevel2 = async (submissionId: string, isApproved: boolean = false) => {
    try {
      const success = await markAssistanceCompleted(2, { submissionId, isApproved });
      if (success) {
        if (isApproved) {
          toast.success("Bantuan Level 2 berhasil diselesaikan! Sekarang Anda wajib mengerjakan kuis utama.");
        } else {
          toast.success("Bantuan Level 2 telah dikirim untuk diperiksa guru.");
        }
      } else {
        toast.error("Gagal menyelesaikan bantuan Level 2");
      }
      return success;
    } catch {
      toast.error("Terjadi kesalahan saat menyelesaikan bantuan Level 2");
      return false;
    }
  };

  // Handler untuk menyelesaikan bantuan level 3
  const handleCompleteLevel3 = async (assistanceId: string, readingTime?: number) => {
    try {
      const success = await markAssistanceCompleted(3, { assistanceId, readingTime });
      if (success) {
        toast.success("Bantuan Level 3 berhasil diselesaikan! Sekarang Anda wajib mengerjakan kuis utama.");
      } else {
        toast.error("Gagal menyelesaikan bantuan Level 3");
      }
      return success;
    } catch {
      toast.error("Terjadi kesalahan saat menyelesaikan bantuan Level 3");
      return false;
    }
  };

  // Handler untuk memulai kuis utama dengan reset flag
  const handleStartMainQuiz = async () => {
    try {
      if (assistanceStatus?.mustRetakeMainQuiz) {
        await resetMainQuizFlag();
      }
      onStartQuiz();
    } catch {
      toast.error("Terjadi kesalahan saat memulai kuis utama");
    }
  };

  // Render MainQuizButton component
  const renderMainQuizButton = () => (
    <MainQuizButton
      quizId={quizId}
      onStartQuiz={handleStartMainQuiz}
      isStartingQuiz={isStartingQuiz}
      className="mb-6"
    />
  );

  // Function untuk mengecek apakah level bantuan dapat diakses
  const canAccessAssistanceLevel = (level: 1 | 2 | 3) => {
    if (!assistanceStatus) return false;
    
    switch (level) {
      case 1:
        return assistanceStatus.level1Accessible && !assistanceStatus.level1Completed;
      case 2:
        return assistanceStatus.level2Accessible && !assistanceStatus.level2Completed;
      case 3:
        return assistanceStatus.level3Accessible && !assistanceStatus.level3Completed;
      default:
        return false;
    }
  };

  // Function untuk mengecek apakah level bantuan sudah diselesaikan
  const isAssistanceLevelCompleted = (level: 1 | 2 | 3) => {
    if (!assistanceStatus) return false;
    
    switch (level) {
      case 1:
        return assistanceStatus.level1Completed;
      case 2:
        return assistanceStatus.level2Completed;
      case 3:
        return assistanceStatus.level3Completed;
      default:
        return false;
    }
  };

  return {
    assistanceStatus,
    assistanceLoading,
    handleCompleteLevel1,
    handleCompleteLevel2,
    handleCompleteLevel3,
    handleStartMainQuiz,
    renderMainQuizButton,
    canAccessAssistanceLevel,
    isAssistanceLevelCompleted,
  };
}

/**
 * Komponen untuk menampilkan informasi wajib mengerjakan kuis utama
 */
interface MustRetakeMainQuizAlertProps {
  assistanceStatus: {
    mustRetakeMainQuiz?: boolean;
    canTakeMainQuiz?: boolean;
    level1Completed?: boolean;
    level2Completed?: boolean;
    level3Completed?: boolean;
  } | null;
  onStartQuiz: () => void;
  isStartingQuiz: boolean;
}

export function MustRetakeMainQuizAlert({ 
  assistanceStatus, 
  onStartQuiz, 
  isStartingQuiz 
}: MustRetakeMainQuizAlertProps) {
  if (!assistanceStatus?.mustRetakeMainQuiz || !assistanceStatus?.canTakeMainQuiz) {
    return null;
  }

  const completedLevels: string[] = [];
  if (assistanceStatus.level1Completed) completedLevels.push("Level 1");
  if (assistanceStatus.level2Completed) completedLevels.push("Level 2");
  if (assistanceStatus.level3Completed) completedLevels.push("Level 3");

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Wajib Mengerjakan Kuis Utama
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Anda telah menyelesaikan bantuan <strong>{completedLevels.join(", ")}</strong> dan sekarang 
              <strong> WAJIB</strong> mengerjakan kuis utama lagi sebelum dapat melanjutkan ke tahap berikutnya.
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={onStartQuiz}
              disabled={isStartingQuiz}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-md text-sm disabled:opacity-50"
            >
              {isStartingQuiz ? "Memulai..." : "Mulai Kuis Utama Sekarang (Wajib)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default useAssistanceTracking;
