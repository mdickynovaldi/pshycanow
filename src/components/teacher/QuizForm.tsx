"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon, PlusIcon, XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { createQuiz, updateQuiz } from "@/lib/actions/quiz-actions";
import { Quiz, Question } from "@/types";

interface ClassOption {
  id: string;
  name: string;
}

interface QuizFormProps {
  quiz?: Quiz;
  classes?: ClassOption[];
}

export default function QuizForm({ quiz, classes = [] }: QuizFormProps) {
  const isEditMode = !!quiz?.id;
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: quiz?.title || "",
    description: quiz?.description || "",
    classId: quiz?.classId || "",
  });
  
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [questionErrors, setQuestionErrors] = useState<Record<string, Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Inisialisasi pertanyaan jika dalam mode edit
  useEffect(() => {
    if (isEditMode && quiz.questions) {
      setQuestions(quiz.questions.map(q => ({
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl,
        expectedAnswer: q.expectedAnswer,
        quizId: q.quizId
      })));
    }
  }, [isEditMode, quiz]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Hapus error saat input berubah
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleQuestionChange = (index: number, field: string, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setQuestions(updatedQuestions);
    
    // Hapus error pertanyaan saat input berubah
    if (questionErrors[index]?.[field]) {
      setQuestionErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[index]) {
          delete newErrors[index][field];
          if (Object.keys(newErrors[index]).length === 0) {
            delete newErrors[index];
          }
        }
        return newErrors;
      });
    }
  };
  
  const addQuestion = () => {
    setQuestions([...questions, { text: "" }]);
  };
  
  const removeQuestion = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
    
    // Hapus error pertanyaan jika ada
    if (questionErrors[index]) {
      setQuestionErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };
  
  const handleImageUpload = async (index: number, file: File) => {
    if (!file) return;
    
    // Validasi tipe file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Hanya file gambar yang diperbolehkan (JPEG, PNG, GIF)');
      return;
    }
    
    // Batasi ukuran file (misalnya 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB dalam bytes
    if (file.size > maxSize) {
      alert('Ukuran file tidak boleh lebih dari 5MB');
      return;
    }
    
    try {
      // Membuat objek FormData untuk upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload gambar ke server
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload gagal');
      
      const data = await response.json();
      
      // Update imageUrl di state questions
      handleQuestionChange(index, 'imageUrl', data.url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Gagal mengunggah gambar. Silakan coba lagi.');
    }
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const newQuestionErrors: Record<string, Record<string, string>> = {};
    
    // Validasi judul
    if (!formData.title.trim()) {
      newErrors.title = "Judul kuis wajib diisi";
    } else if (formData.title.length < 3) {
      newErrors.title = "Judul kuis minimal 3 karakter";
    }
    
    // Validasi pertanyaan
    if (questions.length === 0) {
      newErrors.questions = "Kuis harus memiliki minimal 1 pertanyaan";
    } else {
      questions.forEach((question, index) => {
        const questionError: Record<string, string> = {};
        
        if (!question.text || question.text.trim() === "") {
          questionError.text = "Teks pertanyaan wajib diisi";
        } else if (question.text.length < 3) {
          questionError.text = "Teks pertanyaan minimal 3 karakter";
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
      let response;
      const baseData = {
        title: formData.title,
        description: formData.description,
        classId: formData.classId || undefined,
        questions: questions.map(q => ({
          id: q.id,
          text: q.text || "",
          imageUrl: q.imageUrl === null ? undefined : q.imageUrl,
          expectedAnswer: q.expectedAnswer === null ? undefined : q.expectedAnswer
        }))
      };
      
      if (isEditMode && quiz?.id) {
        const dataToUpdate = {
          ...baseData,
          id: quiz.id,
        };
        response = await updateQuiz(quiz.id, dataToUpdate);
      } else {
        response = await createQuiz(baseData);
      }
      
      if (response.success) {
        router.push("/teacher/quizzes");
      } else {
        if (response.errors) {
          console.error("Validation errors:", response.errors);
          alert(response.message || "Validasi gagal");
        } else {
          alert(response.message || (isEditMode ? "Gagal memperbarui kuis" : "Gagal membuat kuis baru"));
        }
      }
    } catch (error) {
      console.error("Error submitting quiz form:", error);
      alert("Terjadi kesalahan saat menyimpan kuis");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/teacher/quizzes"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali ke Daftar Kuis
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Informasi Kuis</h2>
            
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Judul Kuis <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`block w-full px-3 py-2 border ${
                  errors.title ? "border-red-300" : "border-gray-300"
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Deskripsi
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label
                htmlFor="classId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Kelas (Opsional)
              </label>
              <select
                id="classId"
                name="classId"
                value={formData.classId || ""}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Jika dipilih, kuis hanya akan tersedia untuk siswa di kelas ini
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Pertanyaan</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Tambah Pertanyaan
              </button>
            </div>
            
            {errors.questions && (
              <p className="mb-4 text-sm text-red-600">{errors.questions}</p>
            )}
            
            {questions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  Kuis belum memiliki pertanyaan. Klik Tambah Pertanyaan untuk menambahkan pertanyaan.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div key={index} className="border rounded-md p-4 relative">
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                    
                    <div className="mb-4">
                      <label
                        htmlFor={`question-${index}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Pertanyaan {index + 1} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id={`question-${index}`}
                        value={question.text || ""}
                        onChange={(e) => handleQuestionChange(index, "text", e.target.value)}
                        rows={3}
                        className={`block w-full px-3 py-2 border ${
                          questionErrors[index]?.text ? "border-red-300" : "border-gray-300"
                        } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      />
                      {questionErrors[index]?.text && (
                        <p className="mt-1 text-sm text-red-600">{questionErrors[index].text}</p>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <label
                        htmlFor={`expected-answer-${index}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Jawaban yang Diharapkan (Opsional)
                      </label>
                      <textarea
                        id={`expected-answer-${index}`}
                        value={question.expectedAnswer || ""}
                        onChange={(e) => handleQuestionChange(index, "expectedAnswer", e.target.value)}
                        rows={2}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Jawaban ini hanya sebagai referensi saat menilai jawaban siswa
                      </p>
                    </div>
                    
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gambar (Opsional)
                      </label>
                      
                      {question.imageUrl ? (
                        <div className="mb-2">
                          <div className="relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                            <Image
                              src={question.imageUrl}
                              alt={`Gambar untuk pertanyaan ${index + 1}`}
                              fill
                              className="object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(index, "imageUrl", "")}
                              className="absolute top-2 right-2 p-1 bg-red-100 rounded-md text-red-600 hover:bg-red-200"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-1 text-center">
                            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor={`image-upload-${index}`}
                                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                              >
                                <span>Upload gambar</span>
                                <input
                                  id={`image-upload-${index}`}
                                  name="file"
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleImageUpload(index, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                              <p className="pl-1">atau drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, GIF maksimal 5MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
            <Link
              href="/teacher/quizzes"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : isEditMode ? "Simpan Perubahan" : "Buat Kuis"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 