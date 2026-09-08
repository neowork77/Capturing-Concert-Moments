import { ReactNode } from 'react';

type Tone = 'neutral' | 'emerald' | 'amber' | 'rose' | 'purple';

const TONES: Record<Tone, { box: string; label: string; value: string; bar: string }> = {
  neutral: {
    box: 'bg-white border-[var(--hairline)]',
    label: 'text-[var(--ink-muted)]',
    value: 'text-[var(--ink)]',
    bar: 'bg-[#F4A0B5]',
  },
  emerald: {
    box: 'bg-emerald-50/70 border-emerald-200',
    label: 'text-emerald-800',
    value: 'text-emerald-900',
    bar: 'bg-emerald-500',
  },
  amber: {
    box: 'bg-amber-50/70 border-amber-200',
    label: 'text-amber-800',
    value: 'text-amber-900',
    bar: 'bg-amber-500',
  },
  rose: {
    box: 'bg-rose-50/70 border-rose-200',
    label: 'text-rose-800',
    value: 'text-rose-900',
    bar: 'bg-rose-500',
  },
  purple: {
    box: 'bg-purple-50/70 border-purple-200',
    label: 'text-purple-800',
    value: 'text-purple-900',
    bar: 'bg-purple-500',
  },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** หน่วยต่อท้ายตัวเลข เช่น "คิว" "รายการ" */
  unit?: string;
  icon?: string;
  tone?: Tone;
  /** 0-100 — แสดงแถบความคืบหน้าใต้ตัวเลข */
  percent?: number;
}

/**
 * การ์ดตัวเลขสรุปแบบเดียวกันทั้งระบบ
 * แทนที่ BookingKPI กับ ScheduleKPI ที่เดิมออกแบบคนละแบบสำหรับงานเดียวกัน
 */
export default function StatCard({
  label,
  value,
  unit,
  icon,
  tone = 'neutral',
  percent,
}: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className={`p-4 rounded-2xl border shadow-xs ${t.box}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon && (
          <span aria-hidden className="text-base leading-none flex-shrink-0">
            {icon}
          </span>
        )}
        <span className={`text-xs font-bold ${t.label}`}>{label}</span>
      </div>
      <div className={`font-display text-xl sm:text-2xl font-bold ${t.value}`}>
        {value}
        {unit && <span className={`text-sm font-normal ml-1 ${t.label}`}>{unit}</span>}
      </div>
      {percent !== undefined && (
        <div className="mt-2 h-1.5 bg-black/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${t.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
