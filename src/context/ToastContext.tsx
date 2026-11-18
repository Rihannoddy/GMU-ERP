import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (title: string, variant?: ToastVariant, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, variant: ToastVariant = 'info', description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, variant, description }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print"
      >
        {toasts.map((t) => {
          const Icon =
            t.variant === 'success'
              ? CheckCircle2
              : t.variant === 'error'
              ? AlertCircle
              : t.variant === 'warning'
              ? AlertTriangle
              : Info;
          const accentColor =
            t.variant === 'success'
              ? 'text-[#26865B]'
              : t.variant === 'error'
              ? 'text-[#D9534F]'
              : t.variant === 'warning'
              ? 'text-[#D99A32]'
              : 'text-[#477BAA]';

          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto bg-white border border-[#E5E9EF] rounded-md shadow-md px-4 py-3 flex items-start gap-3 transition-all"
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${accentColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#202B38] leading-snug">{t.title}</p>
                {t.description && <p className="text-xs text-[#738091] mt-0.5 leading-relaxed">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-[#738091] hover:text-[#202B38] p-0.5 rounded transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
