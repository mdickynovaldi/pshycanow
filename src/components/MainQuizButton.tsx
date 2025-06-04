/**
 * Komponen untuk menampilkan button kuis utama berdasarkan status bantuan
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Play, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAssistanceStatus } from "@/hooks/useAssistanceStatus";

interface MainQuizButtonProps {
  quizId: string;
  onStartQuiz: () => void;
  isStartingQuiz?: boolean;
  className?: string;
}

export function MainQuizButton({
  quizId,
  onStartQuiz,
  isStartingQuiz = false,
  className = "",
}: MainQuizButtonProps) {
  const { assistanceStatus, loading, resetMainQuizFlag } = useAssistanceStatus(quizId);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Memuat status kuis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assistanceStatus) {
    return null;
  }

  const handleStartQuiz = async () => {
    // Reset flag sebelum memulai kuis utama
    if (assistanceStatus.mustRetakeMainQuiz) {
      await resetMainQuizFlag();
    }
    onStartQuiz();
  };

  // Jika user wajib mengerjakan kuis utama setelah bantuan
  if (assistanceStatus.mustRetakeMainQuiz && assistanceStatus.canTakeMainQuiz) {
    return (
      <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
        <CardHeader className="bg-yellow-100">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <CardTitle className="text-yellow-800">Wajib Mengerjakan Kuis Utama</CardTitle>
          </div>
          <CardDescription className="text-yellow-700">
            Anda telah menyelesaikan bantuan dan sekarang wajib mengerjakan kuis utama
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Status Bantuan:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {assistanceStatus.level1Completed && (
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    Bantuan Level 1 telah diselesaikan
                  </li>
                )}
                {assistanceStatus.level2Completed && (
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    Bantuan Level 2 telah diselesaikan
                  </li>
                )}
                {assistanceStatus.level3Completed && (
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    Bantuan Level 3 telah diselesaikan
                  </li>
                )}
              </ul>
            </div>
            <Button
              onClick={handleStartQuiz}
              disabled={isStartingQuiz}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              size="lg"
            >
              {isStartingQuiz ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memulai Kuis...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Mulai Kuis Utama Sekarang (Wajib)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Jika user dapat mengerjakan kuis utama (normal flow)
  if (assistanceStatus.canTakeMainQuiz && !assistanceStatus.mustRetakeMainQuiz) {
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <CardHeader className="bg-blue-100">
          <div className="flex items-center">
            <Play className="h-5 w-5 text-blue-600 mr-2" />
            <CardTitle className="text-blue-800">Kuis Utama</CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            Anda dapat mengerjakan kuis utama sekarang
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button
            onClick={handleStartQuiz}
            disabled={isStartingQuiz}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {isStartingQuiz ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memulai Kuis...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Mulai Kuis Utama
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Jika user tidak dapat mengerjakan kuis utama
  return (
    <Card className={`border-gray-200 bg-gray-50 ${className}`}>
      <CardHeader className="bg-gray-100">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-gray-500 mr-2" />
          <CardTitle className="text-gray-700">Kuis Utama Tidak Tersedia</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Selesaikan bantuan yang diperlukan terlebih dahulu
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Button
          disabled
          className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
          size="lg"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Tidak Dapat Mengerjakan Kuis
        </Button>
        
        {assistanceStatus.nextStep && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Langkah selanjutnya: {assistanceStatus.nextStep}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Komponen sederhana untuk hanya menampilkan status boolean
 */
interface AssistanceStatusIndicatorProps {
  quizId: string;
  className?: string;
}

export function AssistanceStatusIndicator({
  quizId,
  className = "",
}: AssistanceStatusIndicatorProps) {
  const { assistanceStatus, loading } = useAssistanceStatus(quizId);

  if (loading) {
    return (
      <div className={`flex items-center ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-500">Memuat...</span>
      </div>
    );
  }

  if (!assistanceStatus) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="font-medium text-sm">Status Bantuan:</h4>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center">
          {assistanceStatus.level1Completed ? (
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 text-gray-400 mr-1" />
          )}
          <span className={assistanceStatus.level1Completed ? "text-green-700" : "text-gray-500"}>
            Level 1
          </span>
        </div>
        <div className="flex items-center">
          {assistanceStatus.level2Completed ? (
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 text-gray-400 mr-1" />
          )}
          <span className={assistanceStatus.level2Completed ? "text-green-700" : "text-gray-500"}>
            Level 2
          </span>
        </div>
        <div className="flex items-center">
          {assistanceStatus.level3Completed ? (
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 text-gray-400 mr-1" />
          )}
          <span className={assistanceStatus.level3Completed ? "text-green-700" : "text-gray-500"}>
            Level 3
          </span>
        </div>
      </div>
      
      {assistanceStatus.mustRetakeMainQuiz && (
        <div className="flex items-center text-yellow-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          <span className="text-xs font-medium">Wajib mengerjakan kuis utama</span>
        </div>
      )}
    </div>
  );
}
