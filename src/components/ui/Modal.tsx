import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, subtitle, maxWidth = 'md', children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    maxWidth === 'sm'
      ? 'max-w-md'
      : maxWidth === 'lg'
      ? 'max-w-2xl'
      : maxWidth === 'xl'
      ? 'max-w-4xl'
      : 'max-w-lg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172332]/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
    >
      <div className={`w-full ${widthClass} bg-white border border-[#E5E9EF] rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#E5E9EF]">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-[#202B38] leading-snug">{title}</h2>
            {subtitle && <p className="text-xs text-[#738091] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#738091] hover:text-[#202B38] p-1 rounded hover:bg-[#F5F6F8] transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
