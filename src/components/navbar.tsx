"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { UserRole } from "@/lib/auth";
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  UserGroupIcon,
  BookOpenIcon,
  HomeIcon,
  ArrowLeftOnRectangleIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { SignOutButton } from "./auth/SignOutButton";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const isTeacher = session?.user?.role === UserRole.TEACHER;
  const isStudent = session?.user?.role === UserRole.STUDENT;

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.svg" alt="Logo" width={32} height={32} />
                <span className="font-bold text-xl">Psycanow</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {/* Links for larger screens */}
              <Link
                href="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === "/dashboard"
                    ? "border-indigo-500 text-gray-900 dark:text-gray-100"
                    : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <HomeIcon className="w-5 h-5 mr-1" />
                Dashboard
              </Link>

              {isTeacher && (
                <>
                  <Link
                    href="/teacher/classes"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname.startsWith("/teacher/classes")
                        ? "border-indigo-500 text-gray-900 dark:text-gray-100"
                        : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    <BookOpenIcon className="w-5 h-5 mr-1" />
                    Kelas
                  </Link>
                  <Link
                    href="/teacher/students"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname.startsWith("/teacher/students")
                        ? "border-indigo-500 text-gray-900 dark:text-gray-100"
                        : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    <UserGroupIcon className="w-5 h-5 mr-1" />
                    Siswa
                  </Link>
                  <Link
                    href="/teacher/quizzes"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname.startsWith("/teacher/quizzes")
                        ? "border-indigo-500 text-gray-900 dark:text-gray-100"
                        : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    <ClipboardDocumentListIcon className="w-5 h-5 mr-1" />
                    Kuis
                  </Link>
                </>
              )}

              {isStudent && (
                <>
                  <Link
                    href="/student/courses"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname.startsWith("/student/courses") || pathname.startsWith("/student/classes")
                        ? "border-indigo-500 text-gray-900 dark:text-gray-100"
                        : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    <BookOpenIcon className="w-5 h-5 mr-1" />
                    Kelas Saya
                  </Link>
                  <Link
                    href="/student/quizzes"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname.startsWith("/student/quizzes")
                        ? "border-indigo-500 text-gray-900 dark:text-gray-100"
                        : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    <ClipboardDocumentListIcon className="w-5 h-5 mr-1" />
                    Kuis
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-2">
            <ThemeToggle />
            {session ? (
              <>
                <Link
                  href="/profile"
                  className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                    pathname === "/profile"
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  }`}
                >
                  <UserCircleIcon className="w-5 h-5 mr-1" />
                  Profil
                </Link>
                <SignOutButton>
                  <span className="inline-flex items-center">
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-1" />
                    Keluar
                  </span>
                </SignOutButton>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white border-indigo-600 hover:bg-indigo-50"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
            >
              <span className="sr-only">Buka menu utama</span>
              {isOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? "block" : "hidden"} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/dashboard"
            className={`block pl-3 pr-4 py-2 text-base font-medium ${
              pathname === "/dashboard"
                ? "bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-indigo-300"
                : "border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            }`}
            onClick={closeMenu}
          >
            <div className="flex items-center">
              <HomeIcon className="w-5 h-5 mr-2" />
              Dashboard
            </div>
          </Link>

          {isTeacher && (
            <>
              <Link
                href="/teacher/classes"
                className={`block pl-3 pr-4 py-2 text-base font-medium ${
                  pathname.startsWith("/teacher/classes")
                    ? "bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-indigo-300"
                    : "border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
                onClick={closeMenu}
              >
                <div className="flex items-center">
                  <BookOpenIcon className="w-5 h-5 mr-2" />
                  Kelas
                </div>
              </Link>
              <Link
                href="/teacher/students"
                className={`block pl-3 pr-4 py-2 text-base font-medium ${
                  pathname.startsWith("/teacher/students")
                    ? "bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-indigo-300"
                    : "border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
                onClick={closeMenu}
              >
                <div className="flex items-center">
                  <UserGroupIcon className="w-5 h-5 mr-2" />
                  Siswa
                </div>
              </Link>
              <Link
                href="/teacher/quizzes"
                className={`block pl-3 pr-4 py-2 text-base font-medium ${
                  pathname.startsWith("/teacher/quizzes")
                    ? "bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-indigo-300"
                    : "border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
                onClick={closeMenu}
              >
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
                  Kuis
                </div>
              </Link>
            </>
          )}

          {isStudent && (
            <>
              <Link
                href="/student/courses"
                className={`block pl-3 pr-4 py-2 text-base font-medium ${
                  pathname.startsWith("/student/courses") || pathname.startsWith("/student/classes")
                    ? "bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-indigo-300"
                    : "border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
                onClick={closeMenu}
              >
                <div className="flex items-center">
                  <BookOpenIcon className="w-5 h-5 mr-2" />
                  Kelas Saya
                </div>
              </Link>
              <Link
                href="/student/quizzes"
                className={`block pl-3 pr-4 py-2 text-base font-medium ${
                  pathname.startsWith("/student/quizzes")
                    ? "bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 dark:bg-gray-800 dark:text-indigo-300"
                    : "border-l-4 border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
                onClick={closeMenu}
              >
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
                  Kuis
                </div>
              </Link>
            </>
          )}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center px-4">
            <div className="flex-shrink-0">
              {session?.user?.image ? (
                <Image
                  className="h-10 w-10 rounded-full"
                  src={session.user.image}
                  alt={`${session.user.name} avatar`}
                  width={40}
                  height={40}
                />
              ) : (
                <UserCircleIcon className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                {session?.user?.name}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {session?.user?.email}
              </div>
            </div>
            <ThemeToggle />
          </div>
          <div className="mt-3 space-y-1">
            {session ? (
              <>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800"
                  onClick={closeMenu}
                >
                  <div className="flex items-center">
                    <UserCircleIcon className="w-5 h-5 mr-2" />
                    Profil
                  </div>
                </Link>
                <SignOutButton className="w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800">
                  <div className="flex items-center">
                    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-2" />
                    Keluar
                  </div>
                </SignOutButton>
              </>
            ) : (
              <div className="px-4 pt-2 pb-3 space-y-1">
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  onClick={closeMenu}
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-indigo-600 bg-white border border-indigo-600 hover:bg-indigo-50 mt-2"
                  onClick={closeMenu}
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

const teacherNavItems = [
  {
    title: "Siswa",
    href: "/teacher/students",
    description: "Manajemen data siswa dan aktivitas mereka.",
  },
  {
    title: "Kelas",
    href: "/teacher/classes",
    description: "Membuat dan mengelola kelas dan jadwal.",
  },
  {
    title: "Kuis",
    href: "/teacher/quizzes",
    description: "Membuat dan mengelola kuis untuk penilaian.",
  },
  {
    title: "Materi",
    href: "/teacher/materials",
    description: "Mengunggah dan mengelola materi pembelajaran.",
  },
];

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string; href: string }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <Link
        ref={ref}
        className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className}`}
        {...props}
      >
        <div className="text-sm font-medium leading-none">{title}</div>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
          {children}
        </p>
      </Link>
    </li>
  );
});
ListItem.displayName = "ListItem"; 