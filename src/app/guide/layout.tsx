import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'คู่มือการใช้งาน — Money Street',
  description:
    'คู่มือการใช้งาน Money Street ครบทุกฟีเจอร์ ตั้งแต่ดูราคาหุ้น กราฟ Candlestick วิเคราะห์เทคนิค Watchlist Portfolio AI วิเคราะห์ ข่าว ปฏิทิน และอื่นๆ',
  alternates: {
    canonical: 'https://moneystreet.co/guide',
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
