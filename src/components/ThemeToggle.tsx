"use client";

import { useState, useEffect } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export default function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Deteksi tema saat komponen dimount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-gray-500 rounded-md hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-50 dark:hover:bg-gray-800"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
} 