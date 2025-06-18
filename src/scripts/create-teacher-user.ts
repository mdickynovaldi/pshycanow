import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma"; // Path relatif dari src/scripts/ ke src/lib/prisma.ts
import { Prisma } from "@prisma/client";

async function createTeacher() {
  const name = "Guru Admin";
  const email = "guru@admin.com";
  const password = "123456";

  console.log(`Mulai membuat akun guru dengan email: ${email}...`);

  // Validasi dasar
  if (!email.includes('@')) {
    console.error("Format email tidak valid.");
    return;
  }
  if (password.length < 6) {
    console.error("Password minimal harus 6 karakter.");
    return;
  }

  try {
    // 1. Cek apakah pengguna dengan email tersebut sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.warn(`Pengguna dengan email ${email} sudah ada.`);
      // Anda bisa memutuskan untuk berhenti atau memperbarui pengguna yang ada
      // Untuk saat ini, kita akan berhenti jika pengguna sudah ada.
      return;
    }

    // 2. Hash password
    const hashedPassword = await hash(password, 10);

    // 3. Buat pengguna guru baru
    const teacher = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: "TEACHER", // Sesuai dengan enum Role di schema.prisma dan contoh di seed-users.ts
      } as Prisma.UserCreateInput, // Menggunakan type assertion seperti di seed-users.ts
    });

    console.log(`Akun guru berhasil dibuat dengan ID: ${teacher.id} dan email: ${teacher.email}`);

  } catch (error) {
    console.error("Gagal membuat akun guru:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTeacher()
  .then(() => {
    console.log("Proses pembuatan akun guru selesai.");
  })
  .catch((e) => {
    console.error("Terjadi kesalahan dalam menjalankan skrip:", e);
    process.exit(1);
  }); 