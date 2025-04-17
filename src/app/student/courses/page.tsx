import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { UserRole } from "../../../lib/auth";
import { getStudentCourses } from "../../../lib/actions/student-actions";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";

export default async function StudentCoursesPage() {
  const session = await getServerSession(authOptions);

  // Server-side protection
  if (!session?.user) {
    redirect("/login");
  }
  
  if (session.user.role !== UserRole.STUDENT) {
    redirect("/dashboard?unauthorized=true");
  }

  // Ambil kursus yang diikuti siswa
  const { success, data: courses, message } = await getStudentCourses();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Kursus Tersedia</h1>
      <p className="mb-6 text-muted-foreground">Halaman ini menampilkan kursus yang dapat Anda akses.</p>
      
      {!success && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {message || "Terjadi kesalahan saat memuat kursus"}
          </AlertDescription>
        </Alert>
      )}

      {success && courses && courses.length === 0 && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>
            Anda belum terdaftar pada kelas manapun. Silakan hubungi guru untuk mendaftarkan Anda ke kelas.
          </AlertDescription>
        </Alert>
      )}
      
      {success && courses && courses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm mb-2"><strong>Guru:</strong> {course.teacher}</p>
                <p className="text-sm mb-2"><strong>Durasi:</strong> {course.duration}</p>
                <p className="text-sm"><strong>Level:</strong> {course.level}</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <a href={`/student/courses/${course.id}`}>Lihat Kursus</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Contoh data kursus
const dummyCourses = [
  { 
    id: "1", 
    title: "Psikologi Dasar", 
    description: "Pengenalan dasar-dasar ilmu psikologi",
    teacher: "Dr. Budi Santoso",
    duration: "8 minggu",
    level: "Pemula"
  },
  { 
    id: "2", 
    title: "Psikologi Perkembangan", 
    description: "Mempelajari perkembangan psikologis manusia",
    teacher: "Dr. Ani Wijaya",
    duration: "10 minggu",
    level: "Menengah"
  },
  { 
    id: "3", 
    title: "Psikologi Sosial", 
    description: "Hubungan antara individu dan kelompok sosial",
    teacher: "Dr. Rudi Hartono",
    duration: "12 minggu",
    level: "Menengah"
  },
  { 
    id: "4", 
    title: "Psikologi Klinis", 
    description: "Dasar-dasar psikologi klinis dan terapeutik",
    teacher: "Dr. Dewi Susanti",
    duration: "14 minggu",
    level: "Lanjutan"
  },
  { 
    id: "5", 
    title: "Psikologi Kognitif", 
    description: "Proses berpikir, persepsi, dan memori",
    teacher: "Dr. Joko Widodo",
    duration: "10 minggu",
    level: "Menengah"
  },
  { 
    id: "6", 
    title: "Psikologi Abnormal", 
    description: "Studi tentang perilaku abnormal dan gangguan mental",
    teacher: "Dr. Siti Nurhaliza",
    duration: "12 minggu",
    level: "Lanjutan"
  },
]; 