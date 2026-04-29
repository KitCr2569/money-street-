'use client';

import type { ReactNode } from 'react';

interface ProGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Standalone: always show content (no paywall) */
export default function ProGate({ children }: ProGateProps) {
  return <>{children}</>;
}

/** Standalone: always admin */
export function useIsAdmin() {
  return true;
}

/** Standalone: always pro */
export function useIsPro() {
  return true;
}
