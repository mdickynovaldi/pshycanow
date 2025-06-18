import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getClassDetail } from "@/lib/actions/class-actions";
import { getAvailableStudents } from "@/lib/actions/student-actions";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowLeftIcon, 
  UsersIcon, 
  UserPlusIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import EnrollStudentsButton from "@/components/teacher/EnrollStudentsButton";

interface PageProps {
  params: Promise<{ classId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EnrollStudentsPage({ params }: PageProps) {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/classes");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  // Await params untuk mendapatkan classId
  const { classId } = await params;
  
  // Ambil detail kelas
  const { success: classSuccess, data: classData } = await getClassDetail(classId);
  
  if (!classSuccess || !classData) {
    redirect("/teacher/classes");
  }
  
  // Ambil daftar siswa yang tersedia (belum terdaftar di kelas)
  const { data: availableStudents } = await getAvailableStudents(classId);
  
  const students = availableStudents || [];
  const enrolledCount = classData.students?.length || 0;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href={`/teacher/classes/${classId}`}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali ke Detail Kelas
          </Link>
        </div>
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 rounded-t-xl">
            <div className="flex items-center">
              <AcademicCapIcon className="w-10 h-10 text-white mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Kelola Siswa Kelas
                </h1>
                <p className="text-blue-100">
                  {classData.name}
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Class Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-blue-800">Info Kelas</h3>
                  <AcademicCapIcon className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-blue-600 mb-2">Deskripsi:</p>
                <p className="text-sm text-blue-700 line-clamp-2">
                  {classData.description || "Tidak ada deskripsi"}
                </p>
              </div>
              
              {/* Enrolled Students */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-green-800">Siswa Terdaftar</h3>
                  <UsersIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">{enrolledCount}</div>
                <p className="text-xs text-green-600">siswa aktif</p>
              </div>
              
              {/* Available Students */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-orange-800">Siswa Tersedia</h3>
                  <UserPlusIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-700 mb-1">{students.length}</div>
                <p className="text-xs text-orange-600">belum terdaftar</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        {students.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Tambah Siswa ke Kelas
                  </h2>
                  <p className="text-gray-600">
                    Pilih siswa yang ingin Anda daftarkan ke kelas ini
                  </p>
                </div>
                <EnrollStudentsButton classId={classId} availableStudents={students} />
              </div>
            </div>
            
            {/* Info Banner */}
            <div className="px-8 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex items-start">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-800 font-medium mb-1">Tips untuk mengelola siswa:</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• Gunakan fitur pencarian untuk menemukan siswa dengan cepat</li>
                    <li>• Anda dapat memilih beberapa siswa sekaligus untuk pendaftaran massal</li>
                    <li>• Siswa yang sudah terdaftar tidak akan muncul dalam daftar ini</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.slice(0, 9).map((student) => (
                  <div 
                    key={student.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                        {student.image ? (
                          <Image
                            src={student.image}
                            alt={student.name || "Siswa"}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <UsersIcon className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-900 transition-colors duration-200">
                          {student.name || "Nama tidak tersedia"}
                        </p>
                        {student.email && (
                          <p className="text-xs text-gray-500 truncate">
                            {student.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {students.length > 9 && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <SparklesIcon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold text-purple-700 mb-1">
                        +{students.length - 9}
                      </div>
                      <p className="text-xs text-purple-600">siswa lainnya</p>
                    </div>
                  </div>
                )}
              </div>
              
              {students.length > 9 && (
                <div className="mt-6 text-center bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Klik <strong className="text-blue-600">Tambah Siswa</strong> untuk melihat dan memilih semua siswa yang tersedia
                  </p>
                  <EnrollStudentsButton classId={classId} availableStudents={students} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ExclamationTriangleIcon className="w-10 h-10 text-yellow-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Tidak Ada Siswa Tersedia
              </h3>
              
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Semua siswa telah terdaftar ke kelas ini atau belum ada siswa yang dibuat di sistem. 
                Buat siswa baru untuk melanjutkan.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/teacher/students/create"
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation"
                >
                  <UserPlusIcon className="w-6 h-6 mr-3" />
                  Buat Siswa Baru
                </Link>
                
                <Link
                  href="/teacher/students"
                  className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-lg font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 active:scale-95 touch-manipulation"
                >
                  <UsersIcon className="w-6 h-6 mr-3" />
                  Lihat Semua Siswa
                </Link>
              </div>
              
              {/* Help Text */}
              <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-left">
                    <p className="text-blue-800 font-medium mb-2">Butuh bantuan?</p>
                    <p className="text-blue-700">
                      Pastikan Anda sudah membuat akun siswa terlebih dahulu di halaman 
                      <Link href="/teacher/students" className="font-semibold hover:underline mx-1">
                        Kelola Siswa
                      </Link>
                      sebelum mendaftarkan mereka ke kelas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 