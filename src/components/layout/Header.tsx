'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';

const NAV_LINKS = [
  { href: '/watchlist', label: 'รายการจับตา', icon: '👁️' },
  { href: '/discover', label: 'หมวดหุ้น', icon: '🧭' },
  { href: '/indices', label: 'ดัชนี', icon: '📊' },
  { href: '/analysis', label: 'บทวิเคราะห์', icon: '🤖' },
  { href: '/portfolio/popular', label: 'พอร์ตยอดนิยม', icon: '🌟' },
  { href: '/articles', label: 'บทความ', icon: '✏️' },
  { href: '/news', label: 'ข่าวหุ้น', icon: '📰' },
  { href: '/calendar', label: 'ปฏิทิน', icon: '📅' },
  { href: '/bot', label: 'Bot เทรด', icon: '🤖', highlight: true },
  { href: '/portfolio', label: 'พอร์ตของฉัน', icon: '💼', highlight: true },
  { href: '/guide', label: 'คู่มือ', icon: '📖' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    setMobileMenu(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="px-3 sm:px-4 lg:px-6 h-12 flex items-center gap-3 sm:gap-6">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-md text-dim hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            {mobileMenu ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Logo */}
          <Link href="/watchlist" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo.png"
              alt="Money Street"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-sm font-semibold tracking-tight text-foreground hidden sm:block">
              Money Street
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5 text-[13px] overflow-x-auto">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href + '/'));
              const hl = 'highlight' in link && link.highlight;
              return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 rounded-md whitespace-nowrap transition-all flex items-center gap-1 ${
                  isActive
                    ? hl ? 'text-green bg-green/15 font-semibold' : 'text-accent bg-accent/10'
                    : hl ? 'text-green/70 hover:text-green hover:bg-green/10' : 'text-dim hover:text-foreground hover:bg-surface-2'
                }`}
              >
                <span className="text-[12px]">{link.icon}</span>
                {link.label}
              </Link>
              );
            })}
          </nav>

          {/* Search */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="w-full max-w-[200px] sm:max-w-[320px]">
              <SearchBar />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
            onClick={() => setMobileMenu(false)}
          />
          <div className="fixed top-12 left-0 right-0 z-40 bg-background border-b border-border sm:hidden overflow-y-auto max-h-[70vh]">
            <nav className="py-2">
              {NAV_LINKS.map((link) => {
                const hl = 'highlight' in link && link.highlight;
                return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenu(false)}
                  className={`flex items-center gap-2.5 px-5 py-3 text-[15px] font-medium transition-colors ${
                    pathname === link.href
                      ? hl ? 'text-green bg-green/5' : 'text-accent bg-accent/5'
                      : hl ? 'text-green/70 hover:bg-green/5' : 'text-foreground hover:bg-surface-2'
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
