"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  addToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border bg-[#111118]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
              style={{
                borderColor:
                  toast.type === "success"
                    ? "rgba(16, 185, 129, 0.2)"
                    : toast.type === "error"
                    ? "rgba(239, 68, 68, 0.2)"
                    : "rgba(59, 130, 246, 0.2)",
              }}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === "success" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                {toast.type === "error" && (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
                {toast.type === "info" && (
                  <Info className="w-5 h-5 text-sky-400" />
                )}
              </div>

              {/* Message */}
              <div className="flex-grow text-xs text-white/80 font-medium leading-relaxed">
                {toast.message}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-0.5 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 text-white/30 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
