import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import StudentForm from "@/components/teacher/StudentForm";

// Halaman untuk menambahkan siswa baru
export default async function CreateStudentPage() {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/students/create");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Tambah Siswa Baru</h1>
      <StudentForm />
    </div>
  );
} 