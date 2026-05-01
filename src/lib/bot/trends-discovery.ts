import { BotSignal } from './bot-engine';

export interface TrendTopic {
  keyword: string;
  category: string;
  relevance: number; // 0-100
  relatedSymbols: string[];
  aiReasoning: string;
}

/**
 * Use AI to discover which Stock/Crypto symbols are related to a trending keyword
 */
export async function discoverSymbolsFromTrend(keyword: string): Promise<TrendTopic> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return {
      keyword,
      category: 'General',
      relevance: 50,
      relatedSymbols: ['AAPL', 'TSLA', 'BTC-USD'],
      aiReasoning: 'No API Key — returned default symbols.',
    };
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const prompt = `You are a financial analyst expert in market trends. 
Given the trending keyword "${keyword}", identify the top 3-5 most relevant Stock Symbols (US Market) or Crypto Symbols (e.g. BTC-USD) that are most likely to be affected by or related to this trend.

Rules:
1. Provide valid Yahoo Finance symbols (e.g., NVDA, MSFT, GC=F, BTC-USD).
2. Explain briefly why these symbols are related.
3. Determine the category (e.g., Tech, Energy, Crypto, Commodity).
4. Assign a relevance score (0-100).

Respond in JSON format only:
{
  "keyword": "${keyword}",
  "category": "string",
  "relevance": number,
  "relatedSymbols": ["SYM1", "SYM2", ...],
  "aiReasoning": "1-2 sentence explanation"
}`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.type === 'text' ? b.text : '')
      .join('');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as TrendTopic;
    }

    throw new Error('Failed to parse AI response');
  } catch (err) {
    console.error('Trend discovery error:', err);
    return {
      keyword,
      category: 'Error',
      relevance: 0,
      relatedSymbols: [],
      aiReasoning: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
    };
  }
}

/**
 * Pre-defined trending categories for quick discovery
 */
export const TRENDING_CATEGORIES = [
  { name: 'AI & Tech', keywords: ['Artificial Intelligence', 'Large Language Models', 'NVIDIA Blackwell', 'Cloud Computing'] },
  { name: 'Energy & Commodities', keywords: ['Crude Oil', 'Gold Price', 'Uranium', 'Electric Vehicles'] },
  { name: 'Crypto & Finance', keywords: ['Bitcoin ETF', 'Ethereum', 'DeFi', 'Federal Reserve Rate'] },
];
