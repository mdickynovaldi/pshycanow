"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300); // Animation duration
  }, [onClose, toast.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration, handleClose]);

  const getToastStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "bg-green-50 border-green-200",
          text: "text-green-800",
          icon: <CheckCircleIcon className="w-6 h-6 text-green-600" />,
          progress: "bg-green-500"
        };
      case "error":
        return {
          bg: "bg-red-50 border-red-200",
          text: "text-red-800",
          icon: <XCircleIcon className="w-6 h-6 text-red-600" />,
          progress: "bg-red-500"
        };
      case "warning":
        return {
          bg: "bg-yellow-50 border-yellow-200",
          text: "text-yellow-800",
          icon: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />,
          progress: "bg-yellow-500"
        };
      case "info":
        return {
          bg: "bg-blue-50 border-blue-200",
          text: "text-blue-800",
          icon: <InformationCircleIcon className="w-6 h-6 text-blue-600" />,
          progress: "bg-blue-500"
        };
      default:
        return {
          bg: "bg-gray-50 border-gray-200",
          text: "text-gray-800",
          icon: <InformationCircleIcon className="w-6 h-6 text-gray-600" />,
          progress: "bg-gray-500"
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div 
      className={`
        max-w-sm w-full ${styles.bg} border rounded-lg shadow-lg p-4
        transform transition-all duration-300 ease-in-out
        ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className={`text-sm font-medium ${styles.text}`}>
            {toast.message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={handleClose}
            className={`
              rounded-md inline-flex ${styles.text} hover:bg-opacity-50 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
              transition-colors duration-200 p-1
            `}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
        <div 
          className={`${styles.progress} h-1 rounded-full transition-all duration-100`}
          style={{
            animation: `progress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
      
      <style jsx>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Toast Provider Context
interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              toast={toast}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
} 