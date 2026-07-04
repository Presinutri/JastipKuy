'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, Package, Home } from 'lucide-react';
import { useSupabaseInit } from '@/hooks/useSupabaseInit';
import { Loader2, Cloud, CloudOff } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/kalkulator', label: 'Kalkulator Jastip', icon: Calculator },
  { href: '/master-barang', label: 'Master Barang', icon: Package },
];

export function AppNavbar() {
  const pathname = usePathname();
  const { status: syncStatus, errorMsg } = useSupabaseInit();

  return (
    <header className="bg-primary text-primary-foreground py-4 shadow-md relative overflow-hidden">
      <div className="container max-w-5xl mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <h1
              className="text-2xl font-black tracking-tight flex items-center"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="text-secondary mr-2">✈️</span> JastipKuy
            </h1>
          </Link>

          {/* Cloud Sync Status */}
          <div className="flex items-center gap-1.5 text-xs text-primary-foreground/70 bg-white/10 px-3 py-1.5 rounded-full">
            {syncStatus === 'loading' && (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sinkronisasi...</span></>
            )}
            {syncStatus === 'synced' && (
              <><Cloud className="w-3.5 h-3.5" /><span>Cloud</span></>
            )}
            {syncStatus === 'error' && (
              <><CloudOff className="w-3.5 h-3.5 text-yellow-300" /><span className="text-yellow-300" title={errorMsg ?? ''}>Offline</span></>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-1 mt-3 -mb-4 px-0">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-semibold transition-all
                  ${isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
