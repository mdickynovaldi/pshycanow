"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  UserPlusIcon, 
  MagnifyingGlassIcon, 
  CheckIcon,
  UsersIcon,
  UserIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { enrollStudents } from "@/lib/actions/class-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  
  // Filter siswa berdasarkan search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return availableStudents;
    
    const query = searchQuery.toLowerCase();
    return availableStudents.filter(student => 
      student.name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  }, [availableStudents, searchQuery]);
  
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(student => student.id));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedStudentIds.length === 0) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await enrollStudents({
        classId,
        studentIds: selectedStudentIds,
      });
      
      if (response.success) {
        // Get enrolled students data
        const enrolled = availableStudents.filter(student => 
          selectedStudentIds.includes(student.id)
        );
        setEnrolledStudents(enrolled);
        
        // Show success modal
        setShowSuccessModal(true);
        setSelectedStudentIds([]);
        setSearchQuery("");
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

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setEnrolledStudents([]);
  };
  
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <button className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation">
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Tambah Siswa
          </button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="bg-gradient-to-r from-green-600 to-green-700 -mx-6 -mt-6 px-6 py-4 mb-6">
              <div className="flex items-center">
                <UsersIcon className="w-8 h-8 text-white mr-3" />
                <DialogTitle className="text-xl font-bold text-white">Tambah Siswa ke Kelas</DialogTitle>
              </div>
              <DialogDescription className="text-green-100 text-sm mt-2">
                Pilih siswa yang ingin didaftarkan ke kelas ini
              </DialogDescription>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            {/* Search & Stats */}
            <div className="mb-6">
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari siswa berdasarkan nama atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {filteredStudents.length} siswa tersedia
                  </span>
                  {filteredStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-green-600 hover:text-green-800 font-medium transition-colors duration-200"
                    >
                      {selectedStudentIds.length === filteredStudents.length ? "Batalkan Semua" : "Pilih Semua"}
                    </button>
                  )}
                </div>
                
                <div className="bg-green-50 px-3 py-1 rounded-full">
                  <span className="text-sm text-green-700">
                    {selectedStudentIds.length} siswa terpilih
                  </span>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="max-h-[400px] overflow-y-auto mb-6">
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedStudentIds.includes(student.id)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-200 hover:bg-green-50/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {student.image ? (
                          <Image
                            src={student.image}
                            alt={student.name || ""}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {student.name || "Tanpa Nama"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.email || "Email tidak tersedia"}
                        </div>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                      selectedStudentIds.includes(student.id)
                        ? "bg-green-500 border-green-500"
                        : "border-gray-300"
                    }`}>
                      {selectedStudentIds.includes(student.id) && (
                        <CheckIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <UsersIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      Tidak ada siswa ditemukan
                    </h3>
                    <p className="text-sm text-gray-500">
                      Coba gunakan kata kunci pencarian yang berbeda
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <button
                type="submit"
                disabled={isSubmitting || selectedStudentIds.length === 0}
                className={`w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  (isSubmitting || selectedStudentIds.length === 0) ? 'opacity-75 cursor-not-allowed' : ''
                } transition-all duration-200`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mendaftarkan Siswa...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="w-5 h-5 mr-2" />
                    Tambahkan {selectedStudentIds.length} Siswa
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
              Siswa Berhasil Ditambahkan!
            </DialogTitle>
            <DialogDescription className="text-center text-gray-500 mt-2">
              {enrolledStudents.length} siswa telah berhasil didaftarkan ke kelas ini
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {enrolledStudents.map((student) => (
                  <div key={student.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {student.image ? (
                        <Image
                          src={student.image}
                          alt={student.name || ""}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {student.name || "Tanpa Nama"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.email || "Email tidak tersedia"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <button
              onClick={closeSuccessModal}
              className="w-full inline-flex justify-center items-center px-6 py-3 border-2 border-gray-200 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all duration-200"
            >
              Tutup
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 