import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watchlist — ติดตามหุ้นที่สนใจ',
  description:
    'ติดตามราคาหุ้นที่สนใจแบบ Real-time จัดการพอร์ตติดตาม วิเคราะห์เทคนิค แนวรับแนวต้าน RSI EMA บน Money Street',
  alternates: {
    canonical: 'https://moneystreet.co/watchlist',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
