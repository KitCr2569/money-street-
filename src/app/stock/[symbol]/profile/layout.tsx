import type { Metadata } from 'next';

interface Props {
  params: Promise<{ symbol: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const url = `https://moneystreet.co/stock/${upperSymbol}/profile`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'หน้าแรก',
        item: 'https://moneystreet.co',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'ดัชนีหุ้น',
        item: 'https://moneystreet.co/indices',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${upperSymbol} กราฟ`,
        item: `https://moneystreet.co/stock/${upperSymbol}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: `${upperSymbol} โปรไฟล์`,
        item: url,
      },
    ],
  };

  return {
    title: `${upperSymbol} — ข้อมูลบริษัท งบการเงิน วิเคราะห์พื้นฐาน`,
    description: `ข้อมูลบริษัท ${upperSymbol} มูลค่าตลาด กำไร รายได้ P/E ratio ROE งบการเงิน วิเคราะห์พื้นฐานพร้อม AI สรุปโดย Money Street`,
    keywords: [
      upperSymbol,
      `${upperSymbol} โปรไฟล์`,
      `${upperSymbol} งบการเงิน`,
      'วิเคราะห์พื้นฐาน',
      'P/E ratio',
      'มูลค่าตลาด',
      'หุ้นอเมริกา',
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${upperSymbol} — ข้อมูลบริษัทและวิเคราะห์พื้นฐาน | Money Street`,
      description: `ข้อมูลบริษัท ${upperSymbol} งบการเงิน มูลค่าตลาด P/E ratio ROE พร้อม AI วิเคราะห์`,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${upperSymbol} — ข้อมูลบริษัทและวิเคราะห์พื้นฐาน | Money Street`,
      description: `ข้อมูลบริษัท ${upperSymbol} งบการเงิน มูลค่าตลาด P/E ratio ROE พร้อม AI วิเคราะห์`,
    },
    other: {
      'script:ld+json': JSON.stringify(jsonLd),
    },
  };
}

export default function StockProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
