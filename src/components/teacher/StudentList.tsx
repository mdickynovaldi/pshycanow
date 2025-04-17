"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilIcon, TrashIcon, UserIcon } from "@heroicons/react/24/outline";
import { deleteStudent } from "@/lib/actions/student-actions";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface StudentListProps {
  students: Student[];
}

export default function StudentList({ students }: StudentListProps) {
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const router = useRouter();
  
  // Handle untuk menghapus siswa
  const handleDeleteStudent = async (studentId: string) => {
    if (confirm("Anda yakin ingin menghapus siswa ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data siswa.")) {
      setDeletingStudentId(studentId);
      
      try {
        const response = await deleteStudent(studentId);
        
        if (response.success) {
          router.refresh();
        } else {
          alert(response.message || "Gagal menghapus siswa");
        }
      } catch (error) {
        console.error("Error deleting student:", error);
        alert("Terjadi kesalahan saat menghapus siswa");
      } finally {
        setDeletingStudentId(null);
      }
    }
  };
  
  // Jika tidak ada siswa
  if (students.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Belum Ada Siswa</h3>
        <p className="mt-1 text-sm text-gray-500">
          Belum ada siswa yang terdaftar
        </p>
      </div>
    );
  }
  
  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {students.map((student) => (
          <li key={student.id}>
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10">
                  {student.image ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={student.image}
                      alt={student.name || ""}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">
                    {student.name || "Nama tidak tersedia"}
                  </div>
                  <div className="text-sm text-gray-500">{student.email || ""}</div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Link
                  href={`/teacher/students/${student.id}/edit`}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-1 text-gray-500" />
                  Edit
                </Link>
                <button
                  onClick={() => handleDeleteStudent(student.id)}
                  disabled={deletingStudentId === student.id}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1 text-red-500" />
                  {deletingStudentId === student.id ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 