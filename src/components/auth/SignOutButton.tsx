"use client";

import { signOut } from "next-auth/react";
import React, { ReactNode } from "react";

interface SignOutButtonProps {
  children?: ReactNode;
  className?: string;
}

export function SignOutButton({ children, className }: SignOutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className || "inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"}
    >
      {children || "Keluar"}
    </button>
  );
} 