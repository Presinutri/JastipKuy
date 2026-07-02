'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AddProductForm } from '@/components/features/AddProductForm';
import { ShippingSection } from '@/components/features/ShippingSection';
import { SummaryTable } from '@/components/features/SummaryTable';
import { StickySummary } from '@/components/features/StickySummary';
import { CustomerSelector } from '@/components/features/CustomerSelector';
import { SessionSelector } from '@/components/features/SessionSelector';
import { useJastipStore, useActiveCustomer, useActiveSession } from '@/store/useJastipStore';
import { useSupabaseInit } from '@/hooks/useSupabaseInit';
import { Loader2, Cloud, CloudOff } from 'lucide-react';

export default function Home() {
  const { sessions } = useJastipStore();
  const activeSession = useActiveSession();
  const activeCustomer = useActiveCustomer();
  const { status: syncStatus, errorMsg } = useSupabaseInit();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-36 font-sans text-foreground">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
        </div>
        <div className="container max-w-5xl mx-auto px-4 relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-1 flex items-center" style={{ fontFamily: 'var(--font-display)' }}>
                <span className="text-secondary mr-2">✈️</span> JastipKuy
              </h1>
              <p className="text-primary-foreground/75 text-sm md:text-base font-medium">
                Smart &amp; automatically calculate your Jastip costs and profits.
              </p>
            </div>
            {/* Cloud Sync Status */}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-primary-foreground/70 bg-white/10 px-3 py-1.5 rounded-full">
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
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Session Selector */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <SessionSelector />
        </motion.div>

        {/* Customer Selector */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
        >
          <CustomerSelector />
        </motion.div>

        {/* Form and Shipping Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-bold mb-3">🛒 Tambah Barang Pesanan</h2>
              <AddProductForm />
            </motion.div>
          </div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <ShippingSection />
            </motion.div>
          </div>
        </div>

        {/* Summary Table per active customer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-2"
        >
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-xl font-bold">
              📋 Rekapitulasi —{' '}
              <span className="text-muted-foreground font-medium text-base">
                {activeSession.name}
              </span>
              {' '}
              <span className="text-primary">{activeCustomer.name}</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-muted-foreground bg-white px-3 py-1 rounded-full border shadow-sm">
                {activeCustomer.items.length} Barang
              </div>
              {activeSession.customers.length > 1 && (
                <div className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full border shadow-sm">
                  {activeSession.customers.length} Customer
                </div>
              )}
              {sessions.length > 1 && (
                <div className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 shadow-sm font-semibold">
                  {sessions.length} Sesi
                </div>
              )}
            </div>
          </div>
          <SummaryTable />
        </motion.div>
      </main>

      <StickySummary />
    </div>
  );
}
