"use client";

import Link from "next/link";
import { ArrowLeftIcon, PencilIcon } from "@heroicons/react/24/outline";
import { Class } from "@prisma/client";

interface ClassDetailHeaderProps {
  classData: Class & {
    students?: Array<{
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    }>;
  };
}

export default function ClassDetailHeader({ classData }: ClassDetailHeaderProps) {
  return (
    <div>
      <div className="mb-8">
        <Link
          href="/teacher/classes"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali ke Daftar Kelas
        </Link>
      </div>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2">{classData.name}</h1>
          {classData.description && (
            <p className="text-gray-600 mb-2">{classData.description}</p>
          )}
          <p className="text-sm text-gray-500">
            {classData.students?.length || 0} siswa terdaftar
          </p>
        </div>
        
        <Link
          href={`/teacher/classes/${classData.id}/edit`}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <PencilIcon className="w-4 h-4 mr-2" />
          Edit Kelas
        </Link>
      </div>
    </div>
  );
} 