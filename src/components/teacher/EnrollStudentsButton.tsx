"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { enrollStudents } from "@/lib/actions/class-actions";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface EnrollStudentsButtonProps {
  classId: string;
  availableStudents: Student[];
}

export default function EnrollStudentsButton({
  classId,
  availableStudents,
}: EnrollStudentsButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const router = useRouter();
  
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStudentIds.length === 0) {
      alert("Pilih minimal satu siswa untuk didaftarkan ke kelas");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await enrollStudents({
        classId,
        studentIds: selectedStudentIds,
      });
      
      if (response.success) {
        setShowModal(false);
        setSelectedStudentIds([]);
        router.refresh();
      } else {
        alert(response.message || "Gagal mendaftarkan siswa ke kelas");
      }
    } catch (error) {
      console.error("Error enrolling students:", error);
      alert("Terjadi kesalahan saat mendaftarkan siswa ke kelas");
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
        <UserPlusIcon className="w-5 h-5 mr-1" />
        Tambah Siswa
      </button>
      
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
            
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <h3 className="text-lg font-medium text-gray-900">Tambah Siswa ke Kelas</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="px-6 pt-2 pb-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Pilih siswa yang ingin didaftarkan ke kelas ini:
                  </p>
                  
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-200">
                    {availableStudents.map((student) => (
                      <label
                        key={student.id}
                        htmlFor={`student-${student.id}`}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          id={`student-${student.id}`}
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => handleToggleStudent(student.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-700">
                            {student.name || "Nama tidak tersedia"}
                          </p>
                          {student.email && (
                            <p className="text-sm text-gray-500">{student.email}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between mt-6">
                  <p className="text-sm text-gray-500">
                    {selectedStudentIds.length} siswa dipilih
                  </p>
                  
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 mr-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || selectedStudentIds.length === 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isSubmitting ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 