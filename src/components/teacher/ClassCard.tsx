"use client";

import Link from "next/link";
import { Class } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { deleteClass } from "@/lib/actions/class-actions";
import { useRouter } from "next/navigation";

interface ClassCardProps {
  classData: Class;
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
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {classData.name}
          </h3>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100"
            >
              <EllipsisHorizontalIcon className="w-6 h-6" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <div className="py-1">
                  <Link 
                    href={`/teacher/classes/${classData.id}/edit`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    Edit Kelas
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    {isDeleting ? "Menghapus..." : "Hapus Kelas"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 mb-4 text-sm">
          {classData.description || "Tidak ada deskripsi"}
        </p>
        
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-500">
            Dibuat {formattedTime}
          </span>
          
          <Link
            href={`/teacher/classes/${classData.id}`}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <UsersIcon className="w-4 h-4 mr-1" />
            Kelola Siswa
          </Link>
        </div>
      </div>
    </div>
  );
} 