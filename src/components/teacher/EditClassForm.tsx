"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { updateClass } from "@/lib/actions/class-actions";
import { UpdateClassInput } from "@/lib/validations/class";
import { Class } from "@prisma/client";

interface EditClassFormProps {
  classData: Class;
}

export default function EditClassForm({ classData }: EditClassFormProps) {
  const [formData, setFormData] = useState<UpdateClassInput>({
    name: classData.name,
    description: classData.description || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
      const response = await updateClass(classData.id, formData);
      
      if (response.success) {
        router.push(`/teacher/classes/${classData.id}`);
      } else {
        if (response.errors) {
          const serverErrors: Record<string, string> = {};
          
          // Format error dari zod
          Object.entries(response.errors).forEach(([key, value]: [string, any]) => {
            if (key !== "_errors" && value._errors && value._errors[0]) {
              serverErrors[key] = value._errors[0];
            }
          });
          
          setErrors(serverErrors);
        } else {
          alert(response.message || "Gagal memperbarui kelas");
        }
      }
    } catch (error) {
      console.error("Error updating class:", error);
      alert("Terjadi kesalahan saat memperbarui kelas");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/teacher/classes/${classData.id}`}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali ke Detail Kelas
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
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
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Deskripsi kelas (opsional)"
            />
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
            <Link
              href={`/teacher/classes/${classData.id}`}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 