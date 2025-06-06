"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  PlusIcon, 
  XMarkIcon, 
  AcademicCapIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  UserPlusIcon,
  UsersIcon
} from "@heroicons/react/24/outline";
import { createClass } from "@/lib/actions/class-actions";
import { CreateClassInput } from "@/lib/validations/class";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ZodFormattedError {
  _errors: string[];
}

type FormErrors = Record<string, ZodFormattedError | string[]>;

export default function NewClassButton() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdClass, setCreatedClass] = useState<any>(null);
  const [formData, setFormData] = useState<CreateClassInput>({
    name: "",
    description: "",
  });
  
  const router = useRouter();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validasi sederhana
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nama kelas harus diisi";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Nama kelas minimal 3 karakter";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Nama kelas maksimal 50 karakter";
    }
    
    if (formData.description && formData.description.length > 200) {
      newErrors.description = "Deskripsi maksimal 200 karakter";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await createClass(formData);
      
      if (response.success && response.data) {
        // Simpan data kelas yang baru dibuat
        setCreatedClass(response.data);
        // Tampilkan success modal
        setShowSuccessModal(true);
        setFormData({ name: "", description: "" });
        setErrors({});
        router.refresh();
      } else {
        // Tampilkan error dari server jika ada
        if (response.errors) {
          const serverErrors: Record<string, string> = {};
          
          // Format error dari zod
          Object.entries(response.errors as FormErrors).forEach(([key, value]) => {
            if (key !== "_errors") {
              const errorValue = value as ZodFormattedError;
              if (errorValue._errors && errorValue._errors[0]) {
                serverErrors[key] = errorValue._errors[0];
              }
            }
          });
          
          setErrors(serverErrors);
        } else {
          alert(response.message || "Gagal membuat kelas baru");
        }
      }
    } catch (error) {
      console.error("Error creating class:", error);
      alert("Terjadi kesalahan saat membuat kelas baru");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedClass(null);
  };

  const goToEnrollStudents = () => {
    if (createdClass) {
      closeSuccessModal();
      router.push(`/teacher/classes/${createdClass.id}/enroll`);
    }
  };

  const goToClassDetail = () => {
    if (createdClass) {
      closeSuccessModal();
      router.push(`/teacher/classes/${createdClass.id}`);
    }
  };
  
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <button className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation">
            <PlusIcon className="w-5 h-5 mr-2" />
            Buat Kelas Baru
          </button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 -mx-6 -mt-6 px-6 py-4 mb-6">
              <div className="flex items-center">
                <AcademicCapIcon className="w-8 h-8 text-white mr-3" />
                <DialogTitle className="text-xl font-bold text-white">Buat Kelas Baru</DialogTitle>
              </div>
              <DialogDescription className="text-blue-100 text-sm mt-2">
                Buat kelas baru untuk mengelola siswa dan materi pembelajaran
              </DialogDescription>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Nama Kelas */}
              <div>
                <label htmlFor="name" className="block mb-2 text-sm font-semibold text-gray-700">
                  <div className="flex items-center">
                    <AcademicCapIcon className="w-4 h-4 mr-1 text-blue-600" />
                    Nama Kelas
                    <span className="text-red-500 ml-1">*</span>
                  </div>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Contoh: Kelas 10A IPA"
                  className={`block w-full px-4 py-3 rounded-lg border-2 ${
                    errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 ${
                    errors.name ? 'focus:ring-red-200' : 'focus:ring-blue-200'
                  } transition-all duration-200`}
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {formData.name.length}/50 karakter
                </p>
              </div>

              {/* Deskripsi */}
              <div>
                <label htmlFor="description" className="block mb-2 text-sm font-semibold text-gray-700">
                  <div className="flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-1 text-blue-600" />
                    Deskripsi Kelas
                  </div>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Deskripsi singkat tentang kelas (opsional)"
                  rows={3}
                  className={`block w-full px-4 py-3 rounded-lg border-2 ${
                    errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 ${
                    errors.description ? 'focus:ring-red-200' : 'focus:ring-blue-200'
                  } transition-all duration-200 resize-none`}
                />
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {formData.description?.length || 0}/200 karakter
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                } transition-all duration-200`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Membuat Kelas...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Buat Kelas
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">
              Kelas Berhasil Dibuat!
            </DialogTitle>
            <DialogDescription className="text-center text-gray-500 mt-2">
              Kelas baru telah berhasil dibuat. Apa yang ingin Anda lakukan selanjutnya?
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <button
              onClick={goToEnrollStudents}
              className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
            >
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Tambah Siswa ke Kelas
            </button>
            
            <button
              onClick={goToClassDetail}
              className="w-full inline-flex justify-center items-center px-6 py-3 border-2 border-gray-200 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all duration-200"
            >
              <UsersIcon className="w-5 h-5 mr-2" />
              Lihat Detail Kelas
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 