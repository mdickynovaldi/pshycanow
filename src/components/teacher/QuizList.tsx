"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PencilIcon, TrashIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { deleteQuiz } from "@/lib/actions/quiz-actions";
import { useRouter } from "next/navigation";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  classId: string | null;
  createdAt: Date;
  class: {
    id: string;
    name: string;
  } | null;
}

interface QuizListProps {
  quizzes: Quiz[];
}

export default function QuizList({ quizzes }: QuizListProps) {
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const router = useRouter();
  
  // Handle untuk menghapus kuis
  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm("Anda yakin ingin menghapus kuis ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua pertanyaan.")) {
      setDeletingQuizId(quizId);
      
      try {
        const response = await deleteQuiz(quizId);
        
        if (response.success) {
          router.refresh();
        } else {
          alert(response.message || "Gagal menghapus kuis");
        }
      } catch (error) {
        console.error("Error deleting quiz:", error);
        alert("Terjadi kesalahan saat menghapus kuis");
      } finally {
        setDeletingQuizId(null);
      }
    }
  };
  
  // Jika tidak ada kuis
  if (quizzes.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg">
        <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Belum Ada Kuis</h3>
        <p className="mt-1 text-sm text-gray-500">
          Belum ada kuis yang dibuat
        </p>
        <div className="mt-6">
          <Link
            href="/teacher/quizzes/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Buat Kuis Baru
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {quizzes.map((quiz) => (
          <li key={quiz.id}>
            <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
              <div>
                <Link 
                  href={`/teacher/quizzes/${quiz.id}`}
                  className="text-lg font-medium text-blue-600 hover:text-blue-800"
                >
                  {quiz.title}
                </Link>
                {quiz.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{quiz.description}</p>
                )}
                {quiz.class && (
                  <div className="mt-1">
                    <Link 
                      href={`/teacher/classes/${quiz.class.id}`}
                      className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                    >
                      Kelas: {quiz.class.name}
                    </Link>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Link
                  href={`/teacher/quizzes/${quiz.id}/edit`}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-1 text-gray-500" />
                  Edit
                </Link>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  disabled={deletingQuizId === quiz.id}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1 text-red-500" />
                  {deletingQuizId === quiz.id ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 