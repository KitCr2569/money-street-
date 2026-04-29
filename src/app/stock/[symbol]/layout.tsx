import type { Metadata } from 'next';

interface Props {
  params: Promise<{ symbol: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const url = `https://moneystreet.co/stock/${upperSymbol}`;

  return {
    title: `${upperSymbol} — กราฟราคาและวิเคราะห์เทคนิค`,
    description: `ดูกราฟราคา ${upperSymbol} แนวรับแนวต้าน RSI EMA วิเคราะห์เทคนิคหุ้น ${upperSymbol} แบบ Real-time บน Money Street`,
    keywords: [
      upperSymbol,
      `หุ้น ${upperSymbol}`,
      `วิเคราะห์ ${upperSymbol}`,
      'วิเคราะห์เทคนิค',
      'กราฟหุ้น',
      'แนวรับแนวต้าน',
      'หุ้นอเมริกา',
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${upperSymbol} — กราฟและวิเคราะห์เทคนิค | Money Street`,
      description: `ดูกราฟราคา ${upperSymbol} แนวรับแนวต้าน RSI EMA และวิเคราะห์เทคนิคบน Money Street`,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${upperSymbol} — กราฟและวิเคราะห์เทคนิค | Money Street`,
      description: `ดูกราฟราคา ${upperSymbol} แนวรับแนวต้าน RSI EMA บน Money Street`,
    },
  };
}

export default function StockSymbolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
