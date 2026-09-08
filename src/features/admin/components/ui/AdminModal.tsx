'use client';

import { useEffect, useRef, ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const WIDTHS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-6xl',
};

interface AdminModalProps {
  open?: boolean;
  onClose: () => void;
  size?: ModalSize;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** แถบเครื่องมือเพิ่มเติมด้านขวาของหัวเรื่อง (เช่น ปุ่มรีเฟรช) */
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** เต็มความสูงจอ เหมาะกับ modal ที่มีสองคอลัมน์อย่าง SlotManager */
  fullHeight?: boolean;
  /** เนื้อหาจัดการ scroll เอง (ไม่ห่อด้วย overflow-y-auto) */
  rawBody?: boolean;
}

/**
 * เปลือก modal มาตรฐานของหน้า admin
 *
 * ก่อนหน้านี้มี modal 8 สำเนาที่ก๊อปกันมา โดยความกว้างต่างกัน 6 แบบ รัศมี 4 แบบ
 * padding 4 แบบ และบางอันปิดด้วยการคลิกพื้นหลังไม่ได้ ส่วน `data-lenis-prevent`
 * (จำเป็นเพราะทั้งแอปใช้ Lenis smooth scroll) ก็ใส่ไว้แค่ 5 จาก 8 อัน
 */
export default function AdminModal({
  open = true,
  onClose,
  size = 'md',
  icon,
  title,
  subtitle,
  headerActions,
  footer,
  children,
  fullHeight = false,
  rawBody = false,
}: AdminModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ปิดด้วย Esc — เดิมไม่มี modal ตัวไหนรองรับเลย
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className={`bg-[#FDFBFC] rounded-2xl sm:rounded-3xl w-full ${WIDTHS[size]} shadow-2xl border border-[var(--hairline)] relative flex flex-col overflow-hidden ${
          fullHeight
            ? 'h-[calc(100dvh-1.5rem)] sm:h-[88vh]'
            : 'max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh]'
        }`}
      >
        <header className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[var(--hairline)] bg-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-lg flex-shrink-0">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--ink)] truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-[var(--ink-muted)] mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="w-9 h-9 rounded-full border border-[var(--hairline)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-neutral-100 transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </header>

        {rawBody ? (
          children
        ) : (
          <div
            data-lenis-prevent
            className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          >
            {children}
          </div>
        )}

        {footer && (
          <footer className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-[var(--hairline)] bg-white flex-shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
