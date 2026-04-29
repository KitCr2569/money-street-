import { NextResponse } from 'next/server';

const CNN_API_URL =
  'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';

interface CNNFearGreedResponse {
  fear_and_greed: {
    score: number;
    rating: string;
    timestamp: string;
    previous_close: number;
    previous_1_week: number;
    previous_1_month: number;
    previous_1_year: number;
  };
}

export async function GET() {
  try {
    const res = await fetch(CNN_API_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://www.cnn.com/markets/fear-and-greed',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Fear & Greed data' },
        { status: res.status },
      );
    }

    const data: CNNFearGreedResponse = await res.json();
    const fg = data.fear_and_greed;

    return NextResponse.json({
      score: Math.round(fg.score),
      rating: fg.rating,
      previous_close: Math.round(fg.previous_close),
      previous_1_week: Math.round(fg.previous_1_week),
      previous_1_month: Math.round(fg.previous_1_month),
      previous_1_year: Math.round(fg.previous_1_year),
      timestamp: fg.timestamp,
    });
  } catch (error) {
    console.error('Fear & Greed API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Fear & Greed data' },
      { status: 500 },
    );
  }
}
