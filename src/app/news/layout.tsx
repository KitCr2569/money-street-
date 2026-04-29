import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ข่าวหุ้นอเมริกา — วิเคราะห์ผลกระทบต่อนักลงทุน',
  description:
    'ข่าวหุ้นอเมริกาล่าสุด วิเคราะห์ผลกระทบต่อตลาด S&P 500 Nasdaq สรุปข่าวเศรษฐกิจ ข่าวบริษัทชั้นนำ พร้อมมุมมองนักลงทุน',
  keywords: [
    'ข่าวหุ้น',
    'ข่าวหุ้นอเมริกา',
    'ข่าวตลาดหุ้น',
    'วิเคราะห์ข่าว',
    'S&P 500 ข่าว',
    'ข่าวเศรษฐกิจ',
  ],
  alternates: {
    canonical: 'https://moneystreet.co/news',
  },
  openGraph: {
    title: 'ข่าวหุ้นอเมริกา — วิเคราะห์ผลกระทบ | Money Street',
    description:
      'ข่าวหุ้นอเมริกาล่าสุด วิเคราะห์ผลกระทบต่อตลาด S&P 500 Nasdaq สรุปข่าวเศรษฐกิจ',
    url: 'https://moneystreet.co/news',
    type: 'website',
  },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
