import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-md shrink-0 ${
            destructive ? 'bg-[#D9534F]/10 text-[#D9534F]' : 'bg-[#D99A32]/12 text-[#D99A32]'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-[#202B38] leading-relaxed">{message}</p>
      </div>
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E5E9EF]">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-xs font-medium text-[#202B38] bg-white border border-[#E5E9EF] rounded-md hover:bg-[#F5F6F8] transition-colors whitespace-nowrap shrink-0"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-xs font-medium text-white rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
            destructive ? 'bg-[#D9534F] hover:bg-[#c34440]' : 'bg-[#D99A32] hover:bg-[#BD8123]'
          }`}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
