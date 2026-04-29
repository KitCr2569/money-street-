'use client';

import { useRef, useEffect, useState } from 'react';

interface Props {
  value: number | null | undefined;
  children: React.ReactNode;
  className?: string;
}

/** Wraps children with a brief green/red flash when `value` changes */
export default function FlashValue({ value, children, className = '' }: Props) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;

    if (prev == null || value == null || prev === value) return;

    setFlash(value > prev ? 'up' : 'down');
    const timer = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span
      key={flash ? `${flash}-${value}` : 'idle'}
      className={`${flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''} ${className}`}
    >
      {children}
    </span>
  );
}
