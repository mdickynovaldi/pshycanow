/**
 * Contoh implementasi penggunaan MainQuizButton di halaman student quiz
 */

import React from "react";
import { MainQuizButton, AssistanceStatusIndicator } from "@/components/MainQuizButton";
import { useAssistanceStatus } from "@/hooks/useAssistanceStatus";
import { Button } from "@/components/ui/button";


interface ExampleStudentQuizPageProps {
  quizId: string;
  quizData: any; // Sesuaikan dengan tipe data quiz Anda
  onStartQuiz: () => void;
  isStartingQuiz: boolean;
}

export function ExampleStudentQuizPage({
  quizId,
  quizData,
  onStartQuiz,
  isStartingQuiz,
}: ExampleStudentQuizPageProps) {
  const { assistanceStatus } = useAssistanceStatus(quizId);

  // Example handlers - uncomment and use as needed
  /*
  const handleCompleteLevel1 = async (submissionId: string) => {
    const success = await markAssistanceCompleted(1, { submissionId });
    if (success) {
      toast.success("Bantuan Level 1 berhasil diselesaikan!");
    } else {
      toast.error("Gagal menyelesaikan bantuan Level 1");
    }
  };

  const handleCompleteLevel2 = async (submissionId: string, isApproved: boolean = false) => {
    const success = await markAssistanceCompleted(2, { submissionId, isApproved });
    if (success) {
      toast.success("Bantuan Level 2 berhasil diselesaikan!");
    } else {
      toast.error("Gagal menyelesaikan bantuan Level 2");
    }
  };

  const handleCompleteLevel3 = async (assistanceId: string, readingTime?: number) => {
    const success = await markAssistanceCompleted(3, { assistanceId, readingTime });
    if (success) {
      toast.success("Bantuan Level 3 berhasil diselesaikan!");
    } else {
      toast.error("Gagal menyelesaikan bantuan Level 3");
    }
  };
  */

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header Quiz */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{quizData.title}</h1>
        {quizData.description && (
          <p className="text-gray-600">{quizData.description}</p>
        )}
      </div>

      {/* Status Indicator */}
      <div className="bg-white p-4 rounded-lg border">
        <AssistanceStatusIndicator quizId={quizId} />
      </div>

      {/* Main Quiz Button */}
      <MainQuizButton
        quizId={quizId}
        onStartQuiz={onStartQuiz}
        isStartingQuiz={isStartingQuiz}
        className="mb-6"
      />

      {/* Bantuan Kuis Sections */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Bantuan Kuis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Level 1 */}
          <div className="space-y-2">
            <h3 className="font-semibold">Bantuan Level 1</h3>
            <div className="text-sm text-gray-600">
              Status: {assistanceStatus?.level1Completed ? "Selesai" : "Belum selesai"}
            </div>
            <div className="text-sm text-gray-600">
              Dapat diakses: {assistanceStatus?.level1Accessible ? "Ya" : "Tidak"}
            </div>
            {assistanceStatus?.level1Accessible && !assistanceStatus?.level1Completed && (
              <Button
                onClick={() => {
                  // Navigasi ke halaman bantuan level 1
                  // Setelah selesai, panggil handleCompleteLevel1(submissionId)
                }}
                className="w-full"
              >
                Kerjakan Bantuan Level 1
              </Button>
            )}
          </div>

          {/* Level 2 */}
          <div className="space-y-2">
            <h3 className="font-semibold">Bantuan Level 2</h3>
            <div className="text-sm text-gray-600">
              Status: {assistanceStatus?.level2Completed ? "Selesai" : "Belum selesai"}
            </div>
            <div className="text-sm text-gray-600">
              Dapat diakses: {assistanceStatus?.level2Accessible ? "Ya" : "Tidak"}
            </div>
            {assistanceStatus?.level2Accessible && !assistanceStatus?.level2Completed && (
              <Button
                onClick={() => {
                  // Navigasi ke halaman bantuan level 2
                  // Setelah selesai, panggil handleCompleteLevel2(submissionId, isApproved)
                }}
                className="w-full"
              >
                Kerjakan Bantuan Level 2
              </Button>
            )}
          </div>

          {/* Level 3 */}
          <div className="space-y-2">
            <h3 className="font-semibold">Bantuan Level 3</h3>
            <div className="text-sm text-gray-600">
              Status: {assistanceStatus?.level3Completed ? "Selesai" : "Belum selesai"}
            </div>
            <div className="text-sm text-gray-600">
              Dapat diakses: {assistanceStatus?.level3Accessible ? "Ya" : "Tidak"}
            </div>
            {assistanceStatus?.level3Accessible && !assistanceStatus?.level3Completed && (
              <Button
                onClick={() => {
                  // Navigasi ke halaman bantuan level 3
                  // Setelah selesai, panggil handleCompleteLevel3(assistanceId, readingTime)
                }}
                className="w-full"
              >
                Lihat Materi Level 3
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && assistanceStatus && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Debug - Assistance Status</h3>
          <pre className="text-xs bg-gray-200 p-2 rounded overflow-auto">
            {JSON.stringify(assistanceStatus, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ExampleStudentQuizPage;
