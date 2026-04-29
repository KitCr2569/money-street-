'use client';

export default function AiSparkleIcon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconDim = size === 'sm' ? 'w-[18px] h-[18px]' : 'w-5 h-5';

  return (
    <div className={`${dim} relative rounded-xl bg-gradient-to-br from-purple/20 via-accent/15 to-purple/20 flex items-center justify-center group/ai overflow-hidden`}>
      {/* Animated shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent translate-x-[-100%] group-hover/ai:translate-x-[100%] transition-transform duration-700" />

      {/* Sparkle SVG */}
      <svg className={`${iconDim} relative z-10`} viewBox="0 0 24 24" fill="none">
        {/* Main sparkle */}
        <path
          d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
          fill="url(#sparkleGrad)"
          className="group-hover/ai:animate-pulse"
        />
        {/* Small sparkle top-right */}
        <path
          d="M19 2L19.75 4.25L22 5L19.75 5.75L19 8L18.25 5.75L16 5L18.25 4.25L19 2Z"
          fill="url(#sparkleGrad2)"
          opacity="0.7"
        />
        {/* Small sparkle bottom-left */}
        <path
          d="M6 16L6.5 17.5L8 18L6.5 18.5L6 20L5.5 18.5L4 18L5.5 17.5L6 16Z"
          fill="url(#sparkleGrad2)"
          opacity="0.5"
        />
        <defs>
          <linearGradient id="sparkleGrad" x1="4" y1="2" x2="20" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa" />
            <stop offset="0.5" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="sparkleGrad2" x1="16" y1="2" x2="22" y2="8" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60a5fa" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>

      {/* Corner glow */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple/30 rounded-full blur-sm group-hover/ai:bg-purple/50 transition-colors" />
    </div>
  );
}
