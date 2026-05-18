export default function Footer() {
  return (
    <footer className="border-t border-[rgba(0,0,0,0.05)] bg-[#FFF5F7]/50">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl border border-[#FDDDE6] bg-[#FFF5F7] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#F4A0B5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-display text-sm font-semibold tracking-tight text-[#9E8E95]">
              รับถ่ายรูปหน้าคอนเสิร์ต
            </span>
          </div>

          {/* Copyright */}
          <p className="text-xs text-[#C8BBC0] order-last sm:order-none">
            © {new Date().getFullYear()} รับถ่ายรูปหน้าคอนเสิร์ต. Made by @watashiwajp♡
          </p>
        </div>
      </div>
    </footer>
  );
}
