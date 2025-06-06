import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getTeacherClasses } from "@/lib/actions/class-actions";
import ClassCard from "@/components/teacher/ClassCard";
import NewClassButton from "@/components/teacher/NewClassButton";
import { AcademicCapIcon, UsersIcon } from "@heroicons/react/24/outline";

// Halaman daftar kelas untuk guru
export default async function TeacherClassesPage() {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/classes");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  // Ambil daftar kelas milik guru
  const { success, data: classes, message } = await getTeacherClasses();
  
  if (!success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 rounded-t-xl">
              <h1 className="text-2xl font-bold text-white">Kelas Saya</h1>
            </div>
            <div className="p-8">
              <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Terjadi Kesalahan</h3>
                    <p className="text-sm">{message || "Terjadi kesalahan saat mengambil data kelas"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const totalStudents = classes?.reduce((sum, classItem) => sum + (classItem._count?.students || 0), 0) || 0;
  const totalQuizzes = classes?.reduce((sum, classItem) => sum + (classItem._count?.quizzes || 0), 0) || 0;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <AcademicCapIcon className="w-10 h-10 text-white mr-4" />
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Kelas Saya</h1>
                  <p className="text-blue-100">
                    Kelola semua kelas dan siswa Anda dengan mudah
                  </p>
                </div>
              </div>
              <NewClassButton />
            </div>
          </div>
          
          {/* Stats */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AcademicCapIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-700 mb-1">
                  {classes?.length || 0}
                </div>
                <div className="text-sm text-blue-600 font-medium">Total Kelas</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <UsersIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">
                  {totalStudents}
                </div>
                <div className="text-sm text-green-600 font-medium">Total Siswa</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AcademicCapIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-700 mb-1">
                  {totalQuizzes}
                </div>
                <div className="text-sm text-purple-600 font-medium">Total Quiz</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        {classes && classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {classes.map((classItem) => (
              <ClassCard key={classItem.id} classData={classItem} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AcademicCapIcon className="w-8 h-8 text-blue-600" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Belum Ada Kelas
              </h3>
              
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Anda belum memiliki kelas. Mulai buat kelas pertama Anda untuk mengelola siswa dan materi pembelajaran.
              </p>
              
              <NewClassButton />
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-gray-400 mb-2">
                    <AcademicCapIcon className="w-6 h-6 mx-auto" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Buat Kelas</h4>
                  <p className="text-xs text-gray-500">Atur nama dan deskripsi kelas</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-gray-400 mb-2">
                    <UsersIcon className="w-6 h-6 mx-auto" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Tambah Siswa</h4>
                  <p className="text-xs text-gray-500">Daftarkan siswa ke kelas</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-gray-400 mb-2">
                    <AcademicCapIcon className="w-6 h-6 mx-auto" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Buat Quiz</h4>
                  <p className="text-xs text-gray-500">Mulai buat soal dan evaluasi</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 