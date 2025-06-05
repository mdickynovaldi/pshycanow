import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getClassDetail } from "@/lib/actions/class-actions";
import { getAvailableStudents } from "@/lib/actions/student-actions";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href={`/teacher/classes/${classId}`}
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali ke Detail Kelas
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Tambah Siswa ke Kelas {classData.name}</h1>
      
      {students.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-medium mb-4">Siswa Tersedia</h2>
            <EnrollStudentsButton classId={classId} availableStudents={students} />
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
          <p className="text-yellow-700">
            Tidak ada siswa yang tersedia untuk didaftarkan ke kelas ini.
            Semua siswa telah terdaftar atau belum ada siswa yang dibuat.
          </p>
          <div className="mt-4">
            <Link
              href="/teacher/students/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Buat Siswa Baru
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 