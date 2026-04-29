'use client';

import { useDBSync } from '@/hooks/useDBSync';
import type { ReactNode } from 'react';

export default function DBSyncProvider({ children }: { children: ReactNode }) {
  useDBSync();
  return <>{children}</>;
}
