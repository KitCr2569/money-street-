'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/guide', label: 'คู่มือ' },
  { href: '/articles', label: 'บทความ' },
];

export default function Footer() {
  const pathname = usePathname();

  // No hidden paths in standalone

  return (
    <footer className="px-4 lg:px-6 py-6 border-t border-border mt-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-[11px] text-dim">
          <Image src="/logo.png" alt="Money Street" width={18} height={18} className="rounded opacity-50" />
          <span>&copy; 2026 บริษัท เอไอ อันล็อก อินโนเวชั่น จำกัด</span>
          <span className="hidden sm:inline">·</span>
          <span>Powered by <a href="https://aiunlock.co" target="_blank" rel="noopener noreferrer" className="text-green hover:underline">AI Unlocked</a></span>
        </div>
        <div className="flex items-center gap-5 text-[11px] text-dim">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
