import type { BotSignal } from './bot-engine';

// =====================================================
// AI Confirmation — Use Claude to validate signals
// =====================================================

export interface AIConfirmation {
  confirmed: boolean;
  confidence: number;      // 0-100
  reason: string;
  adjustedStopLoss?: number;
  adjustedTakeProfit?: number;
  warnings: string[];
}

/**
 * Ask Claude AI to confirm/reject a trading signal
 * Only called for strong signals (score ≥ 2.5)
 */
export async function confirmSignalWithAI(
  signal: BotSignal,
): Promise<AIConfirmation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      confirmed: true,
      confidence: 50,
      reason: 'ไม่มี ANTHROPIC_API_KEY — ข้ามการยืนยันด้วย AI',
      warnings: ['AI confirmation disabled — no API key'],
    };
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const factorsText = signal.factors
      .map(f => `- ${f.name}: ${f.score > 0 ? '+' : ''}${f.score} (${f.reason})`)
      .join('\n');

    const prompt = `คุณเป็นนักวิเคราะห์การลงทุนมืออาชีพ ช่วยยืนยันสัญญาณเทรดนี้:

## สัญญาณ: ${signal.signal.toUpperCase()} — ${signal.symbol}
- ราคา: $${signal.price}
- คะแนนรวม: ${signal.totalScore}/10 (${signal.normalizedScore}%)
- กลยุทธ์: ${signal.strategy}
- Confidence: ${signal.confidence}%
- Stop-Loss: $${signal.stopLoss}
- Take-Profit 1: $${signal.takeProfit1}
- Take-Profit 2: $${signal.takeProfit2}
- Risk/Reward: 1:${signal.riskRewardRatio}

## ปัจจัยที่วิเคราะห์:
${factorsText}

## คำถาม:
1. สัญญาณนี้น่าเชื่อถือหรือไม่? (ตอบ YES หรือ NO)
2. มีความเสี่ยงอะไรที่ technical analysis อาจพลาดไป?
3. ควรปรับ Stop-Loss หรือ Take-Profit ไหม?

## กฎการตอบ:
ตอบเป็น JSON format เท่านั้น:
{
  "confirmed": true/false,
  "confidence": 0-100,
  "reason": "เหตุผลสั้นๆ 1-2 ประโยค",
  "warnings": ["คำเตือน 1", "คำเตือน 2"],
  "adjustedStopLoss": null หรือ ราคาใหม่,
  "adjustedTakeProfit": null หรือ ราคาใหม่
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse AI response
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.type === 'text' ? b.text : '')
      .join('');

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as AIConfirmation;
      return {
        confirmed: parsed.confirmed ?? true,
        confidence: parsed.confidence ?? 50,
        reason: parsed.reason ?? 'AI ยืนยันสัญญาณ',
        adjustedStopLoss: parsed.adjustedStopLoss ?? undefined,
        adjustedTakeProfit: parsed.adjustedTakeProfit ?? undefined,
        warnings: parsed.warnings ?? [],
      };
    }

    return {
      confirmed: true,
      confidence: 50,
      reason: 'AI response could not be parsed — defaulting to confirm',
      warnings: ['AI response parsing failed'],
    };
  } catch (err) {
    console.error('AI confirmation error:', err);
    return {
      confirmed: true,
      confidence: 30,
      reason: `AI error: ${err instanceof Error ? err.message : 'Unknown'}`,
      warnings: ['AI confirmation failed — proceeding without AI validation'],
    };
  }
}
