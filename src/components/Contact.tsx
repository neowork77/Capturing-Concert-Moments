'use client';

import ScrollReveal from './ScrollReveal';

export default function Contact() {
  return (
    <section id="contact" className="relative py-12 sm:py-32 px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto">
      {/* Decorative blob */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#D8CCE8]/[0.08] blur-[120px] pointer-events-none" />

      <ScrollReveal className="text-center max-w-2xl mx-auto relative z-10">
        <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-[#F4A0B5] mb-4">
          ✦ Contact
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-[#3D3040] leading-tight mb-5">
          For Bookings <span className="font-light bg-gradient-to-r from-[#F4A0B5] to-[#D8CCE8] bg-clip-text text-transparent">Contact</span>
        </h2>
        <p className="text-[#9E8E95] text-sm sm:text-base font-light mb-12">
          หากสนใจจองคิวหรือสอบถามรายละเอียดเพิ่มเติม สามารถติดต่อได้ทางแชทนี้ หรือผ่านช่องทางที่ระบุไว้ด้านล่าง แจ้งวัน เวลา และสถานที่คร่าวๆ ได้เลย ทางเราจะเช็กคิวและตอบกลับโดยเร็วที่สุดค่ะ
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.15} className="max-w-3xl mx-auto relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* X (Twitter) Card */}
          <div className="relative flex flex-col items-center gap-6 p-10 sm:p-12 rounded-[2rem] bg-gradient-to-br from-white via-white to-[#F9F5FA] border border-[rgba(0,0,0,0.05)] shadow-[0_12px_60px_rgba(244,160,181,0.08)] hover:shadow-[0_20px_80px_rgba(244,160,181,0.18)] hover:-translate-y-1 transition-all duration-600 group overflow-hidden">
            {/* Decorative gradient orb */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-[#F4A0B5]/10 to-[#D8CCE8]/10 blur-[60px] group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
            {/* Floating sparkle dots */}
            <div className="absolute top-6 right-8 w-1.5 h-1.5 rounded-full bg-[#F4A0B5]/30 animate-pulse" />
            <div className="absolute bottom-16 left-6 w-1 h-1 rounded-full bg-[#D8CCE8]/40 animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Icon with animated ring */}
            <div className="relative">
              <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-dashed border-[#1D1D1F]/10 group-hover:rotate-180 transition-transform duration-[2s]" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1D1D1F] to-[#3a3a3c] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-transform duration-500">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            </div>

            <div className="text-center space-y-1.5">
              <p className="text-[#3D3040] font-bold text-xl tracking-tight">X (Twitter)</p>
              <p className="text-[#C8BBC0] text-sm font-medium">@watashiwajp</p>
            </div>
            <p className="text-[#B0A3A8] text-xs text-center leading-relaxed max-w-[200px]">
              สำหรับสอบถามรายละเอียดและจองคิวถ่ายรูปหน้าคอน สามารถทักมาได้เลย ♡
            </p>
            <a
              href="https://x.com/watashiwajp?s=21"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1D1D1F] to-[#2d2d2f] text-white font-semibold text-sm tracking-wide hover:from-[#333] hover:to-[#444] hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all duration-300 text-center"
            >
              Direct Message ✦
            </a>
          </div>

          {/* LINE Card */}
          <div className="relative flex flex-col items-center gap-6 p-10 sm:p-12 rounded-[2rem] bg-gradient-to-br from-white via-white to-[#F0FAF0] border border-[rgba(0,0,0,0.05)] shadow-[0_12px_60px_rgba(0,185,0,0.05)] hover:shadow-[0_20px_80px_rgba(0,185,0,0.12)] hover:-translate-y-1 transition-all duration-600 group overflow-hidden">
            {/* Decorative gradient orb */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-[#00B900]/8 to-[#7CFC00]/5 blur-[60px] group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
            {/* Floating sparkle dots */}
            <div className="absolute top-6 right-8 w-1.5 h-1.5 rounded-full bg-[#00B900]/25 animate-pulse" />
            <div className="absolute bottom-16 left-6 w-1 h-1 rounded-full bg-[#00B900]/20 animate-pulse" style={{ animationDelay: '1.5s' }} />

            {/* Icon with animated ring */}
            <div className="relative">
              <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-dashed border-[#00B900]/15 group-hover:rotate-180 transition-transform duration-[2s]" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00B900] to-[#00D400] flex items-center justify-center shadow-[0_8px_32px_rgba(0,185,0,0.3)] group-hover:scale-110 transition-transform duration-500">
                <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
            </div>

            <div className="text-center space-y-1.5">
              <p className="text-[#3D3040] font-bold text-xl tracking-tight">LINE</p>
              <p className="text-[#C8BBC0] text-sm font-medium">ID :@893ecxvq (มี@ข้างหน้า)</p>
            </div>
            <p className="text-[#B0A3A8] text-xs text-center leading-relaxed max-w-[200px]">
              สำหรับสอบถามรายละเอียดและจองคิวถ่ายรูปหน้าคอน สามารถทักมาได้เลย ♡
            </p>
            <a
              href="https://line.me/ti/p/K9sonH6QXO"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00B900] to-[#00D400] text-white font-semibold text-sm tracking-wide hover:from-[#00A000] hover:to-[#00C000] hover:shadow-[0_8px_32px_rgba(0,185,0,0.25)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Add Friend</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </a>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
