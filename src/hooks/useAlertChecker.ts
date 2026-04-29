import { useEffect, useRef } from 'react';
import { usePriceAlerts } from './usePriceAlerts';
import { useToast } from '@/components/ui/Toast';
import type { StockQuote } from '@/types';

/**
 * Checks active alerts against current quotes every time quotes update.
 * Triggers alerts and shows toast notifications.
 */
export function useAlertChecker(quotes: StockQuote[]) {
  const alerts = usePriceAlerts((s) => s.alerts);
  const triggerAlert = usePriceAlerts((s) => s.triggerAlert);
  const { showToast } = useToast();
  // Track which alerts we've already processed to avoid re-triggering
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!quotes.length) return;

    const priceMap: Record<string, number> = {};
    for (const q of quotes) {
      priceMap[q.symbol] = q.regularMarketPrice;
    }

    for (const alert of alerts) {
      if (alert.triggered || alert.dismissed) continue;
      if (processedRef.current.has(alert.id)) continue;

      const price = priceMap[alert.symbol];
      if (price == null) continue;

      const shouldTrigger =
        (alert.direction === 'above' && price >= alert.targetPrice) ||
        (alert.direction === 'below' && price <= alert.targetPrice);

      if (shouldTrigger) {
        processedRef.current.add(alert.id);
        triggerAlert(alert.id);

        const dirText = alert.direction === 'above' ? 'ขึ้นถึง' : 'ลงถึง';
        showToast({
          type: 'alert',
          symbol: alert.symbol,
          message: `ราคา${dirText} ${alert.targetPrice.toFixed(2)} แล้ว! (ปัจจุบัน ${price.toFixed(2)})`,
        });
      }
    }
  }, [quotes, alerts, triggerAlert, showToast]);
}
