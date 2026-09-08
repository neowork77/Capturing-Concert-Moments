'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white border-transparent shadow-xs hover:shadow-md',
  secondary:
    'bg-white text-[var(--ink)] border-[var(--hairline)] hover:bg-neutral-50 hover:border-[#F4A0B5]/50',
  danger: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
  ghost:
    'bg-transparent text-[var(--ink-muted)] border-transparent hover:bg-neutral-100 hover:text-[var(--ink)]',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-5 py-2.5 text-sm rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** ข้อความระหว่างกำลังทำงาน — ถ้าไม่ระบุจะคงข้อความเดิมไว้ */
  loadingLabel?: ReactNode;
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  loadingLabel,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 font-bold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <Spinner size="sm" className="border-current/30 border-t-current" />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
