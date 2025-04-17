"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClass } from "@/lib/actions/class-actions";
import { CreateClassInput } from "@/lib/validations/class";

interface ZodFormattedError {
  _errors: string[];
}

type FormErrors = Record<string, ZodFormattedError | string[]>;

export default function NewClassButton() {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    
    // Validasi sederhana
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nama kelas harus diisi";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Nama kelas minimal 3 karakter";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await createClass(formData);
      
      if (response.success) {
        // Tutup modal dan reset form
        setShowModal(false);
        setFormData({ name: "", description: "" });
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
  
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon className="w-5 h-5 mr-1" />
        Buat Kelas Baru
      </button>
      
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
            
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <h3 className="text-lg font-medium text-gray-900">Buat Kelas Baru</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="px-6 pt-2 pb-6">
                <div className="mb-4">
                  <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-700">
                    Nama Kelas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`block w-full px-3 py-2 border ${
                      errors.name ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Masukkan nama kelas"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label htmlFor="description" className="block mb-1 text-sm font-medium text-gray-700">
                    Deskripsi
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Masukkan deskripsi kelas (opsional)"
                  />
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 mr-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 