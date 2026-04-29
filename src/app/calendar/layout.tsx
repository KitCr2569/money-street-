import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ปฏิทินตลาดหุ้น — Earnings Calendar วันประกาศผลประกอบการ',
  description:
    'ปฏิทินตลาดหุ้นอเมริกา Earnings Calendar วันประกาศผลประกอบการบริษัทใน S&P 500 Nasdaq-100 วันหยุดตลาด Federal Reserve Meeting',
  keywords: [
    'Earnings Calendar',
    'ปฏิทินหุ้น',
    'วันประกาศผลประกอบการ',
    'วันหยุดตลาดหุ้น',
    'Federal Reserve',
    'ปฏิทินตลาด',
  ],
  alternates: {
    canonical: 'https://moneystreet.co/calendar',
  },
  openGraph: {
    title: 'ปฏิทินตลาดหุ้น Earnings Calendar | Money Street',
    description:
      'ปฏิทินตลาดหุ้นอเมริกา วันประกาศผลประกอบการ S&P 500 Nasdaq-100',
    url: 'https://moneystreet.co/calendar',
    type: 'website',
  },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
