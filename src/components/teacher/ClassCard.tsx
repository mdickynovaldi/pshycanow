"use client";

import Link from "next/link";
import { Class } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { 
  EllipsisHorizontalIcon, 
  PencilIcon, 
  TrashIcon, 
  UsersIcon, 
  AcademicCapIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserPlusIcon
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { deleteClass } from "@/lib/actions/class-actions";
import { useRouter } from "next/navigation";

interface ClassCardProps {
  classData: Class & {
    _count?: {
      students: number;
      quizzes: number;
    };
  };
}

export default function ClassCard({ classData }: ClassCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  
  // Format waktu pembuatan kelas
  const formattedTime = formatDistanceToNow(new Date(classData.createdAt), {
    addSuffix: true,
    locale: id,
  });
  
  // Handle untuk menghapus kelas
  const handleDelete = async () => {
    if (confirm("Anda yakin ingin menghapus kelas ini? Semua data yang terkait dengan kelas ini akan dihapus secara permanen.")) {
      setIsDeleting(true);
      try {
        const response = await deleteClass(classData.id);
        
        if (response.success) {
          router.refresh();
        } else {
          alert(response.message || "Gagal menghapus kelas");
        }
      } catch (error) {
        console.error("Error deleting class:", error);
        alert("Terjadi kesalahan saat menghapus kelas");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const studentCount = classData._count?.students || 0;
  const quizCount = classData._count?.quizzes || 0;
  
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <AcademicCapIcon className="w-8 h-8 text-white mr-3" />
            <div>
              <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">
                {classData.name}
              </h3>
              <div className="flex items-center text-blue-100 text-sm">
                <CalendarIcon className="w-4 h-4 mr-1" />
                Dibuat {formattedTime}
              </div>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-white hover:text-blue-200 rounded-full p-2 hover:bg-white/10 transition-colors duration-200"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 border border-gray-100">
                  <div className="py-2">
                    <Link 
                      href={`/teacher/classes/${classData.id}/edit`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => setShowMenu(false)}
                    >
                      <PencilIcon className="w-4 h-4 mr-3 text-blue-500" />
                      Edit Kelas
                    </Link>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors duration-200"
                    >
                      <TrashIcon className="w-4 h-4 mr-3" />
                      {isDeleting ? "Menghapus..." : "Hapus Kelas"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Description */}
        <div className="mb-4">
          <div className="flex items-start">
            <DocumentTextIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
              {classData.description || "Tidak ada deskripsi untuk kelas ini"}
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <UsersIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">{studentCount}</div>
            <div className="text-xs text-blue-600 font-medium">Siswa</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <AcademicCapIcon className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">{quizCount}</div>
            <div className="text-xs text-green-600 font-medium">Quiz</div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col space-y-2">
          <Link
            href={`/teacher/classes/${classData.id}`}
            className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
          >
            <UsersIcon className="w-4 h-4 mr-2" />
            Kelola Kelas
          </Link>
          
          <Link
            href={`/teacher/classes/${classData.id}/enroll`}
            className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Tambah Siswa
          </Link>
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-xs text-gray-600 font-medium">Aktif</span>
          </div>
          
          <span className="text-xs text-gray-500">
            ID: {classData.id.slice(0, 8)}...
          </span>
        </div>
      </div>
    </div>
  );
} 