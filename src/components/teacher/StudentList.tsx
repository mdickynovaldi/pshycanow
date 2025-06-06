"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  PencilIcon, 
  TrashIcon, 
  UserIcon, 
  EnvelopeIcon,
  UsersIcon,
  EllipsisHorizontalIcon
} from "@heroicons/react/24/outline";
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
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
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-100">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <UsersIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Siswa Terdaftar</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Kelas ini belum memiliki siswa. Tambahkan siswa untuk memulai pembelajaran.
        </p>
        
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {students.map((student, index) => (
        <div 
          key={student.id}
          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  {student.image ? (
                    <Image
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100"
                      src={student.image}
                      alt={student.name || ""}
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-gray-100">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
              </div>
              
              {/* Student Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {student.name || "Nama tidak tersedia"}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Aktif
                  </span>
                </div>
                {student.email && (
                  <div className="flex items-center text-sm text-gray-500">
                    <EnvelopeIcon className="w-4 h-4 mr-1" />
                    {student.email}
                  </div>
                )}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                  <span>Siswa #{index + 1}</span>
                  <span>•</span>
                  <span>ID: {student.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Link
                href={`/teacher/students/${student.id}/edit`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 active:scale-95 touch-manipulation"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </Link>
              
              <div className="relative">
                <button
                  onClick={() => setActiveMenuId(activeMenuId === student.id ? null : student.id)}
                  className="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  <EllipsisHorizontalIcon className="w-5 h-5" />
                </button>
                
                {activeMenuId === student.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setActiveMenuId(null)}
                    ></div>
                    <div 
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 border border-gray-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-2">
                        <Link
                          href={`/teacher/students/${student.id}`}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                          onClick={() => setActiveMenuId(null)}
                        >
                          <UserIcon className="w-4 h-4 mr-3 text-gray-500" />
                          Lihat Detail
                        </Link>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            handleDeleteStudent(student.id);
                          }}
                          disabled={deletingStudentId === student.id}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors duration-200"
                        >
                          <TrashIcon className="w-4 h-4 mr-3" />
                          {deletingStudentId === student.id ? "Menghapus..." : "Hapus Siswa"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Summary */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <UsersIcon className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">
              Total {students.length} siswa terdaftar
            </span>
          </div>
          <Link
            href="enroll"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            Tambah Siswa Lagi →
          </Link>
        </div>
      </div>
    </div>
  );
} 