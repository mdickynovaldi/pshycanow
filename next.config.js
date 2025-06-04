/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  typescript: {
    // !! PERINGATAN !!
    // Mengabaikan pengecekan tipe selama build
    // Ini hanya solusi sementara, idealnya masalah tipe harus diperbaiki
   
  },
};

module.exports = nextConfig; 