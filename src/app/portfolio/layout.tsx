import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio — จำลองพอร์ตลงทุนหุ้น',
  description:
    'จำลองพอร์ตลงทุนหุ้น ติดตามผลตอบแทน กำไร/ขาดทุน สัดส่วน Asset Allocation วิเคราะห์พอร์ตโฟลิโอบน Money Street',
  alternates: {
    canonical: 'https://moneystreet.co/portfolio',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
