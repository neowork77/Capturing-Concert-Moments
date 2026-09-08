interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** สถานะ "ยังไม่มีข้อมูล" มาตรฐาน พร้อมปุ่มชวนทำต่อ */
export default function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="py-14 px-6 text-center bg-white/70 rounded-2xl border border-[var(--hairline)]">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/12 to-[#D4B5E0]/20 border border-[#F4A0B5]/20 flex items-center justify-center mx-auto mb-4 text-2xl">
        <span aria-hidden>{icon}</span>
      </div>
      <p className="font-bold text-base text-[var(--ink)] mb-1.5">{title}</p>
      {description && (
        <p className="text-sm text-[var(--ink-muted)] max-w-sm mx-auto">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-bold text-[#D4708F] bg-[#F4A0B5]/12 hover:bg-[#F4A0B5]/20 transition-all cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** แถบแจ้งข้อผิดพลาด */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-sm text-center"
    >
      {message}
    </div>
  );
}
