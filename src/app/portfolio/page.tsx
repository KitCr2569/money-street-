'use client';

import { useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useHydration } from '@/hooks/useHydration';
import AddHoldingForm from '@/components/portfolio/AddHoldingForm';
import HoldingsList from '@/components/portfolio/HoldingsList';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import { PromptModal } from '@/components/ui/Modal';

export default function PortfolioPage() {
  const hydrated = useHydration();
  const portfolios = usePortfolio((s) => s.portfolios);
  const activeId = usePortfolio((s) => s.activePortfolioId);
  const setActive = usePortfolio((s) => s.setActivePortfolio);
  const createPort = usePortfolio((s) => s.createPortfolio);
  const renamePort = usePortfolio((s) => s.renamePortfolio);
  const deletePort = usePortfolio((s) => s.deletePortfolio);

  const [createModal, setCreateModal] = useState(false);
  const [renameModal, setRenameModal] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-5 pt-4 max-w-4xl mx-auto px-4 lg:px-6">
      <h1 className="text-xl font-bold tracking-tight">💼 พอร์ตหุ้น</h1>

      {/* Portfolio tabs */}
      {hydrated && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {portfolios.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              onDoubleClick={() => setRenameModal({ id: p.id, name: p.name })}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 ${
                activeId === p.id
                  ? 'bg-accent text-background'
                  : 'bg-surface border border-border text-dim hover:text-foreground hover:bg-surface-2'
              }`}
              title="ดับเบิ้ลคลิกเพื่อเปลี่ยนชื่อ"
            >
              <span>{p.name}</span>
              <span className={`text-[11px] ${activeId === p.id ? 'text-background/60' : 'text-dim/50'}`}>
                {p.holdings.length}
              </span>
            </button>
          ))}
          <button
            onClick={() => setCreateModal(true)}
            className="px-2.5 py-1.5 rounded-lg text-[13px] font-semibold bg-surface border border-dashed border-border text-dim hover:text-accent hover:border-accent/40 transition-all"
          >
            + สร้างพอร์ต
          </button>
          {portfolios.length > 1 && (
            <button
              onClick={() => {
                const active = portfolios.find((p) => p.id === activeId);
                if (active && confirm(`ลบพอร์ต "${active.name}"?`)) {
                  deletePort(activeId);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-red/60 hover:text-red hover:bg-red/10 transition-all"
              title="ลบพอร์ตนี้"
            >
              🗑️ ลบ
            </button>
          )}
        </div>
      )}

      <PortfolioSummary />
      <AddHoldingForm />
      <HoldingsList />

      {/* Create Modal */}
      <PromptModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        onConfirm={(name) => createPort(name)}
        title="สร้างพอร์ตใหม่"
        placeholder="ชื่อพอร์ต เช่น พอร์ต Growth, พอร์ตปันผล"
        confirmLabel="สร้าง"
      />

      {/* Rename Modal */}
      {renameModal && (
        <PromptModal
          open={true}
          onClose={() => setRenameModal(null)}
          onConfirm={(name) => { renamePort(renameModal.id, name); setRenameModal(null); }}
          title="เปลี่ยนชื่อพอร์ต"
          placeholder="ชื่อใหม่"
          defaultValue={renameModal.name}
          confirmLabel="บันทึก"
        />
      )}
    </div>
  );
}
