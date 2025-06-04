import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getClassDetail } from "@/lib/actions/class-actions";
import Link from "next/link";
import { ArrowLeftIcon, PencilIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import StudentList from "@/components/teacher/StudentList";

// Halaman detail kelas untuk guru
export default async function ClassDetailPage({ params }: any) {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/classes");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  const classId = params.classId;
  
  // Ambil detail kelas beserta siswa yang terdaftar
  const { success, data: classData, message } = await getClassDetail(classId);
  
  if (!success || !classData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Detail Kelas</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {message || "Terjadi kesalahan saat mengambil data kelas"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/teacher/classes"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali ke Daftar Kelas
        </Link>
      </div>
      
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold">{classData.name}</h1>
        <div className="space-x-2">
          <Link
            href={`/teacher/classes/${classId}/edit`}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit Kelas
          </Link>
        </div>
      </div>
      
      {classData.description && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-lg font-medium mb-2">Deskripsi</h2>
            <p className="text-gray-600">{classData.description}</p>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">Daftar Siswa</h2>
          <Link
            href={`/teacher/classes/${classId}/enroll`}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Tambah Siswa
          </Link>
        </div>
        
        <StudentList students={classData.students || []} />
      </div>
    </div>
  );
} 