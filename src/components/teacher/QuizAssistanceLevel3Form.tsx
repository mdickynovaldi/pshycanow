"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { QuizAssistanceLevel3Input } from "@/lib/validations/quiz-assistance";
import { upsertQuizAssistanceLevel3, deleteQuizAssistanceLevel3 } from "@/lib/actions/quiz-assistance-actions";
import { QuizAssistanceLevel3 } from "@/types";

interface QuizAssistanceLevel3FormProps {
  quizId: string;
  initialData?: QuizAssistanceLevel3 | null;
  onSaved?: () => void;
}

export default function QuizAssistanceLevel3Form({
  quizId,
  initialData,
  onSaved
}: QuizAssistanceLevel3FormProps) {
  const [formData, setFormData] = useState<Partial<QuizAssistanceLevel3Input>>({
    id: initialData?.id,
    title: initialData?.title || "Bantuan Level 3",
    description: initialData?.description || "Materi dalam format PDF untuk membantu siswa",
    pdfUrl: initialData?.pdfUrl || "",
    quizId: quizId
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasPdfData, setHasPdfData] = useState<boolean>(!!initialData?.pdfUrl);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validasi tipe file
    if (file.type !== 'application/pdf') {
      setErrors(prev => ({ ...prev, file: "Hanya file PDF yang diperbolehkan" }));
      return;
    }
    
    // Validasi ukuran file (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB dalam bytes
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, file: "Ukuran file tidak boleh lebih dari 10MB" }));
      return;
    }
    
    setSelectedFile(file);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.file;
      delete newErrors.pdfUrl;
      return newErrors;
    });
  };
  
  const uploadFile = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("quizId", quizId);
      
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Upload failed");
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Set pdfUrl to database URL endpoint
        setFormData(prev => ({ ...prev, pdfUrl: `/api/pdf/${quizId}` }));
        setHasPdfData(true);
      } else {
        setErrors(prev => ({ ...prev, file: data.message || "Gagal mengunggah file" }));
      }
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setErrors(prev => ({ ...prev, file: "Terjadi kesalahan saat mengunggah file" }));
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, quizId]);
  
  useEffect(() => {
    if (selectedFile) {
      uploadFile();
    }
  }, [selectedFile, uploadFile]);
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validasi judul
    if (!formData.title?.trim()) {
      newErrors.title = "Judul bantuan wajib diisi";
    }
    
    // Validasi PDF - cek apakah ada PDF data di database atau baru diupload
    if (!hasPdfData && !selectedFile) {
      newErrors.pdfUrl = "PDF wajib diupload";
    }
    
    setErrors(newErrors);
    
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const dataToSend: QuizAssistanceLevel3Input = {
        id: formData.id,
        title: formData.title || "Bantuan Level 3",
        description: formData.description,
        pdfUrl: formData.pdfUrl || `/api/pdf/${quizId}`,
        quizId: quizId
      };
      
      const response = await upsertQuizAssistanceLevel3(dataToSend);
      
      if (response.success) {
        onSaved?.();
        alert("Bantuan level 3 berhasil disimpan");
      } else {
        alert(response.message || "Gagal menyimpan bantuan level 3");
      }
    } catch (error) {
      console.error("Error saving quiz assistance level 3:", error);
      alert("Terjadi kesalahan saat menyimpan bantuan level 3");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm("Anda yakin ingin menghapus bantuan level 3 ini?")) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await deleteQuizAssistanceLevel3(quizId);
      
      if (response.success) {
        onSaved?.();
        alert("Bantuan level 3 berhasil dihapus");
      } else {
        alert(response.message || "Gagal menghapus bantuan level 3");
      }
    } catch (error) {
      console.error("Error deleting quiz assistance level 3:", error);
      alert("Terjadi kesalahan saat menghapus bantuan level 3");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemovePdf = () => {
    setFormData(prev => ({ ...prev, pdfUrl: "" }));
    setSelectedFile(null);
    setHasPdfData(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Dokumen PDF <span className="text-red-500">*</span>
          </h3>
          
          <div className="mt-2">
            {hasPdfData ? (
              <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Dokumen PDF
                      </h4>
                      <a
                        href={`/api/pdf/${quizId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Lihat Dokumen
                      </a>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Unggah Dokumen PDF
                </label>
                
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label
                        htmlFor="pdf-upload"
                        className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Pilih file PDF</span>
                        <input
                          id="pdf-upload"
                          ref={fileInputRef}
                          name="pdf-upload"
                          type="file"
                          accept="application/pdf"
                          className="sr-only"
                          onChange={handleFileChange}
                          disabled={isUploading}
                        />
                      </label>
                      <p className="pl-1">atau drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF maksimal 10MB
                    </p>
                    {isUploading && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Mengunggah...
                      </p>
                    )}
                    {errors.file && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.file}</p>
                    )}
                  </div>
                </div>
                {errors.pdfUrl && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pdfUrl}</p>
                )}
              </div>
            )}
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
            disabled={isSubmitting || isUploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : initialData ? "Perbarui" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
} 