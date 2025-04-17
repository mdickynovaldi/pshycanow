"use client";

import { useState, useEffect } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { 
  QuizAssistanceLevel1Input, 
  AssistanceQuestionYesNoInput 
} from "@/lib/validations/quiz-assistance";
import { upsertQuizAssistanceLevel1, deleteQuizAssistanceLevel1 } from "@/lib/actions/quiz-assistance-actions";
import { QuizAssistanceLevel1 } from "@/types";

interface QuizAssistanceLevel1FormProps {
  quizId: string;
  initialData?: QuizAssistanceLevel1 | null;
  onSaved?: () => void;
}

export default function QuizAssistanceLevel1Form({
  quizId,
  initialData,
  onSaved
}: QuizAssistanceLevel1FormProps) {
  const [formData, setFormData] = useState<Partial<QuizAssistanceLevel1Input>>({
    id: initialData?.id,
    title: initialData?.title || "Bantuan Level 1",
    description: initialData?.description || "Pertanyaan Ya/Tidak untuk membantu siswa memahami materi",
    quizId: quizId
  });
  
  const [questions, setQuestions] = useState<Partial<AssistanceQuestionYesNoInput>[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [questionErrors, setQuestionErrors] = useState<Record<string, Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Inisialisasi pertanyaan jika data awal ada
  useEffect(() => {
    if (initialData?.questions && initialData.questions.length > 0) {
      setQuestions(initialData.questions.map(q => ({
        id: q.id,
        question: q.question, 
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : true,
        explanation: q.explanation
      })));
    } else {
      // Tambahkan satu pertanyaan kosong jika tidak ada
      setQuestions([{ question: "", correctAnswer: true }]);
    }
  }, [initialData]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Hapus error saat input berubah
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleQuestionTextChange = (index: number, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      question: value
    };
    setQuestions(updatedQuestions);
    
    // Hapus error pertanyaan saat input berubah
    if (questionErrors[index]?.question) {
      setQuestionErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[index]) {
          delete newErrors[index].question;
          if (Object.keys(newErrors[index]).length === 0) {
            delete newErrors[index];
          }
        }
        return newErrors;
      });
    }
  };
  
  const handleQuestionAnswerChange = (index: number, value: boolean) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      correctAnswer: value
    };
    setQuestions(updatedQuestions);
  };
  
  const addQuestion = () => {
    setQuestions([...questions, { question: "", correctAnswer: true }]);
  };
  
  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      return; // Minimal harus ada 1 pertanyaan
    }
    
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
    
    // Hapus error pertanyaan jika ada
    if (questionErrors[index]) {
      setQuestionErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const newQuestionErrors: Record<string, Record<string, string>> = {};
    
    // Validasi judul
    if (!formData.title?.trim()) {
      newErrors.title = "Judul bantuan wajib diisi";
    }
    
    // Validasi pertanyaan
    if (questions.length === 0) {
      newErrors.questions = "Bantuan harus memiliki minimal 1 pertanyaan";
    } else {
      questions.forEach((question, index) => {
        const questionError: Record<string, string> = {};
        
        if (!question.question || question.question.trim() === "") {
          questionError.question = "Teks pertanyaan wajib diisi";
        } else if (question.question.length < 3) {
          questionError.question = "Teks pertanyaan minimal 3 karakter";
        }
        
        if (Object.keys(questionError).length > 0) {
          newQuestionErrors[index] = questionError;
        }
      });
    }
    
    setErrors(newErrors);
    setQuestionErrors(newQuestionErrors);
    
    return Object.keys(newErrors).length === 0 && Object.keys(newQuestionErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const dataToSend: QuizAssistanceLevel1Input = {
        id: formData.id,
        title: formData.title || "Bantuan Level 1",
        description: formData.description,
        quizId: quizId,
        questions: questions.map(q => ({
          id: q.id,
          question: q.question || "",
          correctAnswer: q.correctAnswer === undefined ? true : q.correctAnswer,
          explanation: q.explanation
        }))
      };
      
      // Debug: Log data yang dikirim
      console.log("Sending level 1 data:", JSON.stringify(dataToSend, null, 2));
      
      const response = await upsertQuizAssistanceLevel1(dataToSend);
      
      // Debug: Log response
      console.log("Response:", JSON.stringify(response, null, 2));
      
      if (response.success) {
        onSaved?.();
        alert("Bantuan level 1 berhasil disimpan");
      } else {
        // Tampilkan detail error jika ada
        if (response.errors) {
          console.error("Validation errors:", response.errors);
          alert(`Validasi gagal: ${JSON.stringify(response.errors)}`);
        } else {
          alert(response.message || "Gagal menyimpan bantuan level 1");
        }
      }
    } catch (error) {
      console.error("Error saving quiz assistance level 1:", error);
      alert("Terjadi kesalahan saat menyimpan bantuan level 1");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm("Anda yakin ingin menghapus bantuan level 1 ini?")) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await deleteQuizAssistanceLevel1(quizId);
      
      if (response.success) {
        onSaved?.();
        alert("Bantuan level 1 berhasil dihapus");
      } else {
        alert(response.message || "Gagal menghapus bantuan level 1");
      }
    } catch (error) {
      console.error("Error deleting quiz assistance level 1:", error);
      alert("Terjadi kesalahan saat menghapus bantuan level 1");
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Judul <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title || ""}
                onChange={handleChange}
                className={`block w-full px-3 py-2 border ${
                  errors.title ? "border-red-300" : "border-gray-300 dark:border-gray-600"
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
              )}
            </div>
            
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Deskripsi
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                rows={2}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Pertanyaan Ya/Tidak
            </h3>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Tambah Pertanyaan
            </button>
          </div>
          
          {errors.questions && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">{errors.questions}</p>
          )}
          
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div 
                key={index} 
                className="p-4 border border-gray-300 dark:border-gray-600 rounded-md relative"
              >
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  disabled={questions.length <= 1}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                  title={questions.length <= 1 ? "Minimal harus ada 1 pertanyaan" : "Hapus pertanyaan"}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                
                <div className="mb-4">
                  <label
                    htmlFor={`question-${index}`}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Pertanyaan {index + 1} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id={`question-${index}`}
                    value={question.question || ""}
                    onChange={(e) => handleQuestionTextChange(index, e.target.value)}
                    rows={2}
                    className={`block w-full px-3 py-2 border ${
                      questionErrors[index]?.question ? "border-red-300" : "border-gray-300 dark:border-gray-600"
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
                    placeholder="Contoh: Apakah fotosintesis terjadi pada malam hari?"
                  />
                  {questionErrors[index]?.question && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{questionErrors[index].question}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jawaban yang Benar <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        checked={question.correctAnswer === true}
                        onChange={() => handleQuestionAnswerChange(index, true)}
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Ya</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        checked={question.correctAnswer === false}
                        onChange={() => handleQuestionAnswerChange(index, false)}
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Tidak</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end items-center gap-3 mt-6">
          {initialData && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : initialData ? "Perbarui" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
} 