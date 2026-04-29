import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ค้นหาหุ้น — Discover หุ้นน่าสนใจใน S&P 500 Nasdaq-100',
  description:
    'ค้นหาหุ้นน่าสนใจ กรองตามหมวดอุตสาหกรรม มูลค่าตลาด ประเมิน Composite Score จาก RSI EMA แนวรับแนวต้าน Trend เลือกหุ้นดีบน Money Street',
  keywords: [
    'ค้นหาหุ้น',
    'discover หุ้น',
    'หุ้นน่าสนใจ',
    'คัดกรองหุ้น',
    'Stock screener',
    'S&P 500',
    'Nasdaq-100',
  ],
  alternates: {
    canonical: 'https://moneystreet.co/discover',
  },
  openGraph: {
    title: 'Discover หุ้นน่าสนใจ | Money Street',
    description:
      'ค้นหาและคัดกรองหุ้นใน S&P 500 Nasdaq-100 ตาม Composite Score RSI EMA',
    url: 'https://moneystreet.co/discover',
    type: 'website',
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
