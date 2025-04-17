import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, UserRole } from "@/lib/auth";
import { getClassDetail } from "@/lib/actions/class-actions";
import EditClassForm from "@/components/teacher/EditClassForm";

// Halaman edit kelas untuk guru
export default async function EditClassPage({
  params,
}: {
  params: { classId: string };
}) {
  // Cek autentikasi dan peran guru
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/classes");
  }
  
  if (session.user.role !== UserRole.TEACHER) {
    redirect("/dashboard");
  }
  
  const classId = params.classId;
  
  // Ambil detail kelas
  const { success, data: classData, message } = await getClassDetail(classId);
  
  if (!success || !classData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Edit Kelas</h1>
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {message || "Terjadi kesalahan saat mengambil data kelas"}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Kelas</h1>
      <EditClassForm classData={classData} />
    </div>
  );
} 