import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getClassDetail } from "@/lib/actions/class-actions";
import Link from "next/link";
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  UserPlusIcon, 
  AcademicCapIcon,
  UsersIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline";
import StudentList from "@/components/teacher/StudentList";

interface PageProps {
  params: Promise<{ classId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Halaman detail kelas untuk guru
export default async function ClassDetailPage({ params }: PageProps) {
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
  
  // Ambil detail kelas beserta siswa yang terdaftar
  const { success, data: classData, message } = await getClassDetail(classId);
  
  if (!success || !classData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 rounded-t-xl">
              <h1 className="text-2xl font-bold text-white">Detail Kelas</h1>
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

  const studentCount = classData.students?.length || 0;
  const createdDate = new Date(classData.createdAt);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/teacher/classes"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali ke Daftar Kelas
          </Link>
        </div>
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 rounded-t-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center mb-4 lg:mb-0">
                <AcademicCapIcon className="w-12 h-12 text-white mr-4" />
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{classData.name}</h1>
                  <div className="flex items-center text-blue-100 text-sm">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    Dibuat pada {createdDate.toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <Link
                  href={`/teacher/classes/${classId}/edit`}
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-white/20 text-base font-medium rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-200 active:scale-95 touch-manipulation"
                >
                  <PencilIcon className="w-5 h-5 mr-2" />
                  Edit Kelas
                </Link>
                
                <Link
                  href={`/teacher/classes/${classId}/enroll`}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-lg text-blue-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-95 touch-manipulation"
                >
                  <UserPlusIcon className="w-5 h-5 mr-2" />
                  Tambah Siswa
                </Link>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <UsersIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-700 mb-1">{studentCount}</div>
                <div className="text-sm text-blue-600 font-medium">Siswa Terdaftar</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AcademicCapIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">0</div>
                <div className="text-sm text-green-600 font-medium">Quiz Aktif</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-700 mb-1">-</div>
                <div className="text-sm text-purple-600 font-medium">Rata-rata Nilai</div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Cog6ToothIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-700 mb-1">Aktif</div>
                <div className="text-sm text-orange-600 font-medium">Status Kelas</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Class Description */}
            {classData.description && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="px-8 py-6 border-b border-gray-100">
                  <div className="flex items-center">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-xl font-bold text-gray-900">Deskripsi Kelas</h2>
                  </div>
                </div>
                <div className="px-8 py-6">
                  <p className="text-gray-700 leading-relaxed">{classData.description}</p>
                </div>
              </div>
            )}
            
            {/* Students List */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UsersIcon className="w-6 h-6 text-green-600 mr-3" />
                    <h2 className="text-xl font-bold text-gray-900">
                      Daftar Siswa ({studentCount})
                    </h2>
                  </div>
                  
                  <Link
                    href={`/teacher/classes/${classId}/enroll`}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 active:scale-95 touch-manipulation"
                  >
                    <UserPlusIcon className="w-4 h-4 mr-2" />
                    Tambah Siswa
                  </Link>
                </div>
              </div>
              
              <div className="p-8">
                <StudentList students={classData.students || []} />
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Aksi Cepat</h3>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  href={`/teacher/classes/${classId}/enroll`}
                  className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 group active:scale-95 touch-manipulation"
                >
                  <div className="flex items-center">
                    <UserPlusIcon className="w-5 h-5 text-blue-600 mr-3" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-blue-800">
                        Kelola Siswa
                      </div>
                      <div className="text-xs text-blue-600">
                        Tambah atau hapus siswa
                      </div>
                    </div>
                  </div>
                  <div className="text-blue-600 group-hover:text-blue-800 transition-transform duration-200 group-hover:translate-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
                
                <Link
                  href={`/teacher/quizzes/create?classId=${classId}`}
                  className="w-full flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors duration-200 group active:scale-95 touch-manipulation"
                >
                  <div className="flex items-center">
                    <AcademicCapIcon className="w-5 h-5 text-green-600 mr-3" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-green-800">
                        Buat Quiz
                      </div>
                      <div className="text-xs text-green-600">
                        Tambah quiz untuk kelas ini
                      </div>
                    </div>
                  </div>
                  <div className="text-green-600 group-hover:text-green-800 transition-transform duration-200 group-hover:translate-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
                
                <Link
                  href={`/teacher/classes/${classId}/edit`}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200 group active:scale-95 touch-manipulation"
                >
                  <div className="flex items-center">
                    <PencilIcon className="w-5 h-5 text-gray-600 mr-3" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-800">
                        Edit Kelas
                      </div>
                      <div className="text-xs text-gray-600">
                        Ubah nama atau deskripsi
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-600 group-hover:text-gray-800 transition-transform duration-200 group-hover:translate-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>
            
            {/* Class Info */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Informasi Kelas</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">ID Kelas</span>
                  <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {classId.slice(0, 8)}...
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Total Siswa</span>
                  <span className="text-sm font-semibold text-gray-900">{studentCount}</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                    Aktif
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Dibuat</span>
                  <span className="text-sm text-gray-900">
                    {createdDate.toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 