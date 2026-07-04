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

export default function KalkulatorPage() {
  const { sessions } = useJastipStore();
  const activeSession = useActiveSession();
  const activeCustomer = useActiveCustomer();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-36 font-sans text-foreground">
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
