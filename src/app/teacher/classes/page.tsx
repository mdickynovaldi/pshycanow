import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getTeacherClasses } from "@/lib/actions/class-actions";
import ClassCard from "@/components/teacher/ClassCard";
import NewClassButton from "@/components/teacher/NewClassButton";

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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Kelas Saya</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {message || "Terjadi kesalahan saat mengambil data kelas"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kelas Saya</h1>
        <NewClassButton />
      </div>
      
      {classes && classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <ClassCard key={classItem.id} classData={classItem} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-600 mb-4">
            Anda belum memiliki kelas
          </h3>
          <p className="text-gray-500 mb-6">
            Mulai buat kelas untuk mengelola siswa Anda
          </p>
          <NewClassButton />
        </div>
      )}
    </div>
  );
} 