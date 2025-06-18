"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useParams } from "next/navigation";
import QuizAssistanceLevel1Form from "@/components/teacher/QuizAssistanceLevel1Form";
import QuizAssistanceLevel2Form from "@/components/teacher/QuizAssistanceLevel2Form";
import QuizAssistanceLevel3Form from "@/components/teacher/QuizAssistanceLevel3Form";
import { 
  getQuizAssistanceLevel1, 
  getQuizAssistanceLevel2, 
  getQuizAssistanceLevel3 
} from "@/lib/actions/quiz-assistance-actions";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { QuizAssistanceLevel1, QuizAssistanceLevel2, QuizAssistanceLevel3 } from "@/types";

export default function QuizAssistancePage() {
  const params = useParams();
  const quizId = params.quizId as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("level1");
  
  const [level1Data, setLevel1Data] = useState<QuizAssistanceLevel1 | null>(null);
  const [level2Data, setLevel2Data] = useState<QuizAssistanceLevel2 | null>(null);
  const [level3Data, setLevel3Data] = useState<QuizAssistanceLevel3 | null>(null);
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [l1, l2, l3] = await Promise.all([
        getQuizAssistanceLevel1(quizId),
        getQuizAssistanceLevel2(quizId),
        getQuizAssistanceLevel3(quizId)
      ]);
      if (l1.success && l1.data) {
        setLevel1Data(l1.data);
      }
      if (l2.success && l2.data) {
        setLevel2Data(l2.data);
      }
      if (l3.success && l3.data) {
        // Pastikan pdfUrl bertipe string, bukan null
        setLevel3Data({
          ...l3.data,
          pdfUrl: l3.data.pdfUrl ?? "",
        });
      }
    } catch (error) {
      console.error("Error loading quiz assistance data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleDataSaved = () => {
    loadData();
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <ShieldCheckIcon className="h-8 w-8 mr-2 text-blue-500" />
        <Heading title="Bantuan Kuis" description="Kelola bantuan tambahan untuk siswa yang gagal pada ujian utama" />
      </div>
      
      <Separator className="my-4" />
      
      <div className="mt-6">
        <Tabs defaultValue="level1" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="level1">
              Level 1: Pertanyaan Ya/Tidak
            </TabsTrigger>
            <TabsTrigger value="level2">
              Level 2: Pertanyaan Essay
            </TabsTrigger>
            <TabsTrigger value="level3">
              Level 3: Referensi PDF
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="level1">
            <div className="mt-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md mb-6">
                <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Bantuan Level 1 - Pertanyaan Ya/Tidak
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Buatlah pertanyaan sederhana dengan jawaban Ya/Tidak untuk membantu siswa memahami 
                  materi dasar. Tambahkan penjelasan untuk setiap jawaban.
                </p>
              </div>
              
              <QuizAssistanceLevel1Form
                quizId={quizId}
                initialData={level1Data}
                onSaved={handleDataSaved}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="level2">
            <div className="mt-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md mb-6">
                <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Bantuan Level 2 - Pertanyaan Essay
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Buatlah pertanyaan essay dengan jawaban pendek dan petunjuk opsional. 
                  Level ini membantu siswa memperdalam pemahaman terhadap materi.
                </p>
              </div>
              
              <QuizAssistanceLevel2Form
                quizId={quizId}
                initialData={level2Data}
                onSaved={handleDataSaved}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="level3">
            <div className="mt-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md mb-6">
                <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Bantuan Level 3 - Referensi PDF
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Unggah dokumen PDF yang berisi materi lengkap atau referensi
                  tambahan untuk membantu siswa yang masih kesulitan setelah level 2.
                </p>
              </div>
              
              <QuizAssistanceLevel3Form
                quizId={quizId}
                initialData={level3Data}
                onSaved={handleDataSaved}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 