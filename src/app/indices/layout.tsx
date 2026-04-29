import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ดัชนีหุ้น S&P 500 และ Nasdaq-100 — รายชื่อหุ้นทั้งหมด',
  description:
    'รายชื่อหุ้นทั้งหมดใน S&P 500 และ Nasdaq-100 แยกตามหมวดอุตสาหกรรม พร้อมข้อมูล Market Cap ค้นหาและวิเคราะห์หุ้นอเมริกาได้ที่นี่',
  keywords: [
    'S&P 500',
    'Nasdaq-100',
    'ดัชนีหุ้น',
    'รายชื่อหุ้นอเมริกา',
    'หุ้น S&P 500',
    'หุ้น Nasdaq',
    'ลงทุนหุ้นต่างประเทศ',
  ],
  alternates: {
    canonical: 'https://moneystreet.co/indices',
  },
  openGraph: {
    title: 'ดัชนีหุ้น S&P 500 และ Nasdaq-100 | Money Street',
    description:
      'รายชื่อหุ้นทั้งหมดใน S&P 500 และ Nasdaq-100 พร้อม Market Cap และวิเคราะห์หุ้นอเมริกา',
    url: 'https://moneystreet.co/indices',
    type: 'website',
  },
};

export default function IndicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
