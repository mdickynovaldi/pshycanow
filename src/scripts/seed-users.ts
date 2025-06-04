import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";


async function main() {
  console.log("Mulai menambahkan pengguna percobaan...");

  // 1. Hapus semua pengguna yang ada (opsional, hanya untuk percobaan)
  await prisma.user.deleteMany({});
  
  // 2. Buat pengguna guru
  const teacherPassword = await hash("password123", 10);
  const teacher = await prisma.user.create({
    data: {
      name: "Guru Demo",
      email: "guru@example.com",
      password: teacherPassword,
      // Gunakan string literal untuk role
      role: "TEACHER"
    } as Prisma.UserCreateInput
  });
  console.log(`Pengguna guru berhasil dibuat dengan ID: ${teacher.id}`);

  // 3. Buat pengguna siswa
  const studentPassword = await hash("password123", 10);
  const student = await prisma.user.create({
    data: {
      name: "Siswa Demo",
      email: "siswa@example.com",
      password: studentPassword,
      // Gunakan string literal untuk role
      role: "STUDENT"
    } as Prisma.UserCreateInput
  });
  console.log(`Pengguna siswa berhasil dibuat dengan ID: ${student.id}`);

  console.log("Selesai menambahkan pengguna percobaan!");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 