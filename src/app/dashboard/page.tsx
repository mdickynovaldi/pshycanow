import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@/lib/auth";
import { Unauthorized } from "@/components/unauthorized";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
      <Unauthorized />
      
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Selamat datang di dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Informasi Pengguna</h3>
              <p>Nama: {session.user.name}</p>
              <p>Email: {session.user.email}</p>
              <p>ID: {session.user.id}</p>
              <p>Peran: {session.user.role === UserRole.TEACHER ? "Guru" : "Siswa"}</p>
            </div>

            {session.user.role === UserRole.TEACHER && (
              <div className="border p-4 rounded-md bg-yellow-50">
                <h3 className="text-md font-semibold">Akses Khusus Guru</h3>
                <p className="text-sm">Anda memiliki akses ke fitur-fitur khusus guru.</p>
                <div className="mt-4">
                  <Button asChild size="sm" variant="outline">
                    <a href="/teacher/students">Manajemen Siswa</a>
                  </Button>
                </div>
              </div>
            )}

            {session.user.role === UserRole.STUDENT && (
              <div className="border p-4 rounded-md bg-blue-50">
                <h3 className="text-md font-semibold">Akses Khusus Siswa</h3>
                <p className="text-sm">Anda memiliki akses ke fitur-fitur khusus siswa.</p>
                <div className="mt-4">
                  <Button asChild size="sm" variant="outline">
                    <a href="/student/courses">Lihat Kursus</a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 