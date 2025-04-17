import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getAllStudents } from "@/lib/actions/student-actions";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import StudentList from "@/components/teacher/StudentList";

// Halaman daftar siswa untuk guru
export default async function TeacherStudentsPage() {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/students");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  // Ambil daftar siswa
  const { success, data: students, message } = await getAllStudents();
  
  if (!success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Manajemen Siswa</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {message || "Terjadi kesalahan saat mengambil data siswa"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manajemen Siswa</h1>
        <Link
          href="/teacher/students/create"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-5 h-5 mr-1" />
          Tambah Siswa Baru
        </Link>
      </div>
      
      <StudentList students={students || []} />
    </div>
  );
} 