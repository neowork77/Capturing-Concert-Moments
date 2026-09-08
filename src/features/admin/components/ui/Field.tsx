import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

/**
 * ช่องกรอกข้อมูลมาตรฐาน
 *
 * ขนาดตัวอักษรของ input/select/textarea ตั้งไว้ที่ 16px เสมอ เพราะ Safari บน iOS
 * จะซูมหน้าจอเข้าอัตโนมัติเมื่อโฟกัสช่องกรอกที่ตัวอักษรเล็กกว่านั้น
 * (ของเดิมบางช่องเป็น 11px)
 */

const CONTROL =
  'w-full px-3.5 py-2.5 rounded-xl border border-[var(--hairline)] text-base text-[var(--ink)] bg-white transition-all focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 focus:border-[#F4A0B5]/50 disabled:opacity-60';

export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center justify-between gap-2 text-xs font-bold text-[var(--ink-muted)] mb-1.5"
    >
      <span className="flex items-center gap-1.5">{children}</span>
      {hint && <span className="font-normal">{hint}</span>}
    </label>
  );
}

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={htmlFor} hint={hint}>
        {label}
      </FieldLabel>
      {children}
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${CONTROL} ${className}`} />;
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={`${CONTROL} cursor-pointer ${className}`} />;
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${CONTROL} ${className}`} />;
}

export default Field;
