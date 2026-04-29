'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { STOCK_CATEGORIES } from '@/lib/stock-categories';

interface BotSettingsData {
  enabled: boolean;
  initialCapital: number;
  maxPositionPct: number;
  maxDrawdownPct: number;
  maxOpenPositions: number;
  riskRewardMinimum: number;
  trailingStopPct: number;
  scanIntervalMinutes: number;
  scanSymbols: string[];
  autoTrade: boolean;
  useAiConfirm: boolean;
  lastScanAt: string | null;
}

export default function BotSettingsPage() {
  const [settings, setSettings] = useState<BotSettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [symbolInput, setSymbolInput] = useState('');

  useEffect(() => {
    fetch('/api/bot/settings')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setSettings(data);
      });
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch('/api/bot/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const addSymbol = () => {
    if (!settings || !symbolInput.trim()) return;
    const sym = symbolInput.trim().toUpperCase();
    if (!settings.scanSymbols.includes(sym)) {
      setSettings({ ...settings, scanSymbols: [...settings.scanSymbols, sym] });
    }
    setSymbolInput('');
  };

  const removeSymbol = (sym: string) => {
    if (!settings) return;
    setSettings({ ...settings, scanSymbols: settings.scanSymbols.filter(s => s !== sym) });
  };

  const addCategory = (categoryId: string) => {
    if (!settings) return;
    const cat = STOCK_CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return;
    const newSymbols = cat.stocks.map(s => s.symbol).filter(s => !settings.scanSymbols.includes(s));
    setSettings({ ...settings, scanSymbols: [...settings.scanSymbols, ...newSymbols] });
  };

  if (!settings) {
    return (
      <div className="px-4 py-12 max-w-3xl mx-auto">
        <div className="text-dim text-sm">กำลังโหลดการตั้งค่า...</div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/bot" className="text-dim hover:text-foreground text-xs">← Bot Dashboard</Link>
      </div>

      <h1 className="text-xl font-bold">⚙️ ตั้งค่า Trading Bot</h1>

      {/* Main Toggle */}
      <div className="bg-surface-1 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">เปิด/ปิด Bot</h2>
            <p className="text-xs text-dim">เมื่อเปิด Bot จะสแกนหุ้นตามเวลาที่ตั้ง</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.enabled ? 'bg-green' : 'bg-surface-3'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
              settings.enabled ? 'left-6' : 'left-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Risk Management */}
      <div className="bg-surface-1 rounded-xl border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold">⚖️ การจัดการความเสี่ยง</h2>

        <div className="grid grid-cols-2 gap-3">
          <SettingInput label="เงินเริ่มต้น ($)" value={settings.initialCapital}
            onChange={v => setSettings({ ...settings, initialCapital: Number(v) })} />
          <SettingInput label="Max Position (%)" value={(settings.maxPositionPct * 100).toFixed(0)}
            onChange={v => setSettings({ ...settings, maxPositionPct: Number(v) / 100 })} />
          <SettingInput label="Max Drawdown (%)" value={(settings.maxDrawdownPct * 100).toFixed(0)}
            onChange={v => setSettings({ ...settings, maxDrawdownPct: Number(v) / 100 })} />
          <SettingInput label="Max Open Positions" value={settings.maxOpenPositions}
            onChange={v => setSettings({ ...settings, maxOpenPositions: Number(v) })} />
          <SettingInput label="Min Risk/Reward" value={settings.riskRewardMinimum}
            onChange={v => setSettings({ ...settings, riskRewardMinimum: Number(v) })} />
          <SettingInput label="Trailing Stop (%)" value={(settings.trailingStopPct * 100).toFixed(0)}
            onChange={v => setSettings({ ...settings, trailingStopPct: Number(v) / 100 })} />
        </div>
      </div>

      {/* Scan Settings */}
      <div className="bg-surface-1 rounded-xl border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold">📡 การสแกน</h2>

        <SettingInput label="สแกนทุกกี่นาที" value={settings.scanIntervalMinutes}
          onChange={v => setSettings({ ...settings, scanIntervalMinutes: Number(v) })} />

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium">เทรดอัตโนมัติ</div>
            <div className="text-[10px] text-dim">Bot จะซื้อ/ขายตามสัญญาณโดยอัตโนมัติ</div>
          </div>
          <button
            onClick={() => setSettings({ ...settings, autoTrade: !settings.autoTrade })}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.autoTrade ? 'bg-green' : 'bg-surface-3'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
              settings.autoTrade ? 'left-6' : 'left-0.5'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium">AI ยืนยันสัญญาณ</div>
            <div className="text-[10px] text-dim">ใช้ Claude ช่วยกรองสัญญาณก่อนเทรด (ต้องมี API Key)</div>
          </div>
          <button
            onClick={() => setSettings({ ...settings, useAiConfirm: !settings.useAiConfirm })}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.useAiConfirm ? 'bg-accent' : 'bg-surface-3'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
              settings.useAiConfirm ? 'left-6' : 'left-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Scan Symbols */}
      <div className="bg-surface-1 rounded-xl border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold">🎯 หุ้น/คริปโตที่สแกน ({settings.scanSymbols.length})</h2>

        {/* Add symbol */}
        <div className="flex gap-2">
          <input
            type="text"
            value={symbolInput}
            onChange={e => setSymbolInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSymbol()}
            className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
            placeholder="เพิ่ม symbol เช่น AAPL, BTC-USD"
          />
          <button onClick={addSymbol}
            className="px-3 py-1.5 text-xs bg-accent/15 text-accent rounded-lg hover:bg-accent/25">
            + เพิ่ม
          </button>
        </div>

        {/* Quick add categories */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-dim self-center">เพิ่มทั้งกลุ่ม:</span>
          {STOCK_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => addCategory(cat.id)}
              className="text-[10px] px-2 py-0.5 bg-surface-2 text-dim rounded hover:text-foreground hover:bg-surface-3">
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Current symbols */}
        <div className="flex flex-wrap gap-1.5">
          {settings.scanSymbols.map(sym => (
            <span key={sym} className="inline-flex items-center gap-1 text-xs bg-surface-2 px-2 py-1 rounded-md">
              {sym}
              <button onClick={() => removeSymbol(sym)} className="text-dim hover:text-red text-[10px]">×</button>
            </span>
          ))}
          {settings.scanSymbols.length === 0 && (
            <span className="text-xs text-dim">ยังไม่ได้เลือก — จะใช้รายการ default</span>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
        </button>
        {saved && <span className="text-xs text-green">✅ บันทึกแล้ว!</span>}
      </div>

      {/* Info */}
      {settings.lastScanAt && (
        <div className="text-[10px] text-dim">
          สแกนล่าสุด: {new Date(settings.lastScanAt).toLocaleString('th-TH')}
        </div>
      )}
    </div>
  );
}

function SettingInput({ label, value, onChange }: {
  label: string; value: string | number; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-dim uppercase block mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
      />
    </div>
  );
}
