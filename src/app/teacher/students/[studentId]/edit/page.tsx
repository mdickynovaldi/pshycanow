import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getStudentById } from "@/lib/actions/student-actions";
import StudentForm from "@/components/teacher/StudentForm";

// Halaman edit siswa untuk guru
export default async function EditStudentPage({ params }: any) {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/students");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  const studentId = params.studentId;
  
  // Ambil detail siswa
  const { success, data: student, message } = await getStudentById(studentId);
  
  if (!success || !student) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Edit Siswa</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {message || "Terjadi kesalahan saat mengambil data siswa"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Siswa</h1>
      <StudentForm student={student} />
    </div>
  );
} 