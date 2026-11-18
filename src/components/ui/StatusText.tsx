import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function StatusText({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const colorMap: Record<Tone, string> = {
    success: 'text-[#26865B]',
    warning: 'text-[#BD8123]',
    danger: 'text-[#D9534F]',
    info: 'text-[#477BAA]',
    neutral: 'text-[#738091]',
  };

  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
      ? AlertTriangle
      : tone === 'danger'
      ? XCircle
      : Info;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${colorMap[tone]}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
