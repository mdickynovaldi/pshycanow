"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { createStudent, updateStudent } from "@/lib/actions/student-actions";
import { CreateStudentInput, UpdateStudentInput } from "@/lib/validations/student";

interface UserData {
  id?: string;
  name: string | null;
  email: string | null;
}

interface StudentFormProps {
  student?: UserData;
}

export default function StudentForm({ student }: StudentFormProps) {
  const isEditMode = !!student?.id;
  
  const [formData, setFormData] = useState<CreateStudentInput | UpdateStudentInput>({
    name: student?.name || "",
    email: student?.email || "",
    password: "", // Selalu kosong untuk form edit
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
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
    
    if (!formData.name) {
      newErrors.name = "Nama siswa harus diisi";
    } else if (formData.name.length < 3) {
      newErrors.name = "Nama siswa minimal 3 karakter";
    }
    
    if (!formData.email) {
      newErrors.email = "Email harus diisi";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }
    
    // Validasi password untuk mode tambah
    if (!isEditMode && !formData.password) {
      newErrors.password = "Password harus diisi";
    } else if (!isEditMode && formData.password && formData.password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
    } else if (isEditMode && formData.password && formData.password.length > 0 && formData.password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let response;
      
      if (isEditMode && student?.id) {
        response = await updateStudent(student.id, formData as UpdateStudentInput);
      } else {
        response = await createStudent(formData as CreateStudentInput);
      }
      
      if (response.success) {
        router.push("/teacher/students");
      } else {
        if (response.errors) {
          const serverErrors: Record<string, string> = {};
          
          // Format error dari zod
          Object.entries(response.errors as any).forEach(([key, value]: [string, any]) => {
            if (key !== "_errors" && value._errors && value._errors[0]) {
              serverErrors[key] = value._errors[0];
            }
          });
          
          setErrors(serverErrors);
        } else {
          alert(response.message || (isEditMode ? "Gagal memperbarui siswa" : "Gagal membuat siswa baru"));
        }
      }
    } catch (error) {
      console.error("Error submitting student form:", error);
      alert("Terjadi kesalahan saat menyimpan data siswa");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/teacher/students"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali ke Daftar Siswa
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nama Siswa <span className="text-red-500">*</span>
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
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border ${
                errors.email ? "border-red-300" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password {isEditMode ? "(Kosongkan jika tidak ingin mengubah)" : <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border ${
                errors.password ? "border-red-300" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
            <Link
              href="/teacher/students"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : isEditMode ? "Simpan Perubahan" : "Buat Siswa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 