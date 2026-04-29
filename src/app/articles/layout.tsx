import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'บทความการลงทุน — ความรู้หุ้น กลยุทธ์ วิเคราะห์ตลาด',
  description:
    'บทความการลงทุนภาษาไทย ครอบคลุม กลยุทธ์การลงทุน วิเคราะห์หุ้น การออมเงิน วางแผนเกษียณ หุ้นอเมริกา S&P 500 เหมาะทั้งมือใหม่และมืออาชีพ',
  keywords: [
    'บทความการลงทุน',
    'ความรู้หุ้น',
    'กลยุทธ์การลงทุน',
    'วิเคราะห์หุ้น',
    'ออมเงิน',
    'วางแผนเกษียณ',
    'หุ้นอเมริกา',
  ],
  alternates: {
    canonical: 'https://moneystreet.co/articles',
  },
  openGraph: {
    title: 'บทความการลงทุน | Money Street',
    description:
      'บทความการลงทุนภาษาไทย กลยุทธ์หุ้น วิเคราะห์ตลาด ความรู้สำหรับนักลงทุนทุกระดับ',
    url: 'https://moneystreet.co/articles',
    type: 'website',
  },
};

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
