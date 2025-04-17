import { prisma } from "../lib/prisma";
import { Role } from "@prisma/client";

async function main() {
  console.log("Mulai menambahkan data kelas contoh...");

  // 1. Mendapatkan ID guru dan siswa yang sudah ada
  const teacher = await prisma.user.findFirst({
    where: { 
      role: "TEACHER",
      email: "guru@example.com"
    }
  });

  if (!teacher) {
    console.log("Guru tidak ditemukan! Pastikan Anda telah menjalankan seed-users.ts terlebih dahulu.");
    return;
  }

  const students = await prisma.user.findMany({
    where: { 
      role: "STUDENT"
    },
    take: 5 // Ambil maksimal 5 siswa
  });

  if (students.length === 0) {
    console.log("Tidak ada siswa ditemukan! Pastikan Anda telah menjalankan seed-users.ts terlebih dahulu.");
    return;
  }

  // 2. Membuat beberapa kelas
  const classes = [
    {
      name: "Psikologi Dasar",
      description: "Pengenalan konsep-konsep dasar dalam ilmu psikologi"
    },
    {
      name: "Psikologi Perkembangan",
      description: "Mempelajari perkembangan psikologis manusia dari anak-anak hingga dewasa"
    },
    {
      name: "Psikologi Sosial",
      description: "Studi tentang bagaimana pikiran, perasaan, dan perilaku individu dipengaruhi oleh kehadiran orang lain"
    }
  ];

  // 3. Hapus data kelas yang mungkin sudah ada
  await prisma.classEnrollment.deleteMany({});
  await prisma.class.deleteMany({});

  // 4. Menambahkan kelas-kelas baru dan mendaftarkan siswa
  for (const classData of classes) {
    const newClass = await prisma.class.create({
      data: {
        name: classData.name,
        description: classData.description,
        teacherId: teacher.id
      }
    });
    
    console.log(`Kelas "${newClass.name}" berhasil dibuat dengan ID: ${newClass.id}`);

    // Daftarkan beberapa siswa ke kelas (tidak semua siswa ke semua kelas)
    const classStudents = students.slice(0, Math.floor(Math.random() * students.length) + 1);
    
    for (const student of classStudents) {
      const enrollment = await prisma.classEnrollment.create({
        data: {
          classId: newClass.id,
          studentId: student.id
        }
      });
      
      console.log(`Siswa ${student.name} (${student.email}) berhasil didaftarkan ke kelas "${newClass.name}"`);
    }
  }

  console.log("Selesai menambahkan data kelas contoh!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 