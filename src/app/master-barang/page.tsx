'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MasterBarangTab } from '@/components/features/MasterBarangTab';

export default function MasterBarangPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-foreground">
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MasterBarangTab />
        </motion.div>
      </main>
    </div>
  );
}
