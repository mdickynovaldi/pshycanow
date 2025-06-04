import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation Bar */}
      {/* <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PsycaNow
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Masuk
              </Link>
            </div>
          </div>
        </div>
      </nav> */}

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Title */}
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Selamat Datang di{" "}
            <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PsycaNow
            </span>
          </h1>
          
          {/* Hero Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed">
            Platform pembelajaran interaktif untuk kuis dan asistensi yang membantu 
            siswa dan guru dalam proses belajar mengajar
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 mb-12">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Kuis Interaktif</h3>
              <p className="text-gray-600">
                Sistem kuis yang mudah digunakan dengan berbagai jenis soal dan penilaian otomatis
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sistem Asistensi</h3>
              <p className="text-gray-600">
                Bantuan bertingkat untuk membantu siswa memahami materi dengan lebih baik
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analisis Progress</h3>
              <p className="text-gray-600">
                Monitoring dan evaluasi progress belajar siswa secara real-time
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Mulai Sekarang
            </Link>
            <Link
              href="/login"
              className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 px-8 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Pelajari Lebih Lanjut
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-md border-t border-gray-200/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 PsycaNow. Platform pembelajaran interaktif.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
