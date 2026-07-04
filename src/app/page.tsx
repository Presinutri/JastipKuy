'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calculator, Package, ArrowRight, TrendingUp, Globe, Truck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-foreground">
      <main className="container max-w-5xl mx-auto px-4 py-12 space-y-10">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
            Smart &amp; Effortless
            <br />
            <span className="text-primary">Jastip Management</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Konversi mata uang otomatis, cek ongkir real-time, kalkulasi profit — semua dalam satu aplikasi.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link
              href="/kalkulator"
              className="group block bg-card border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Calculator className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                    🧮 Kalkulator Jastip
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Hitung harga jual, fee, ongkir, dan profit per customer. Konversi mata uang otomatis dan broadcast via WhatsApp.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/5 text-primary/80 px-2 py-1 rounded-full font-medium">
                      <Globe className="w-3 h-3" /> Multi Currency
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/5 text-primary/80 px-2 py-1 rounded-full font-medium">
                      <Truck className="w-3 h-3" /> Cek Ongkir
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/5 text-primary/80 px-2 py-1 rounded-full font-medium">
                      <TrendingUp className="w-3 h-3" /> Auto Profit
                    </span>
                  </div>
                  <span className="inline-flex items-center text-sm font-semibold text-primary group-hover:gap-2 gap-1 transition-all">
                    Buka Kalkulator <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Link
              href="/master-barang"
              className="group block bg-card border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors">
                  <Package className="w-7 h-7 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1 group-hover:text-orange-600 transition-colors">
                    📦 Master Barang
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Simpan daftar barang yang sering dijastipkan. Saat input pesanan, cukup search &amp; auto-fill — tidak perlu ketik ulang dari nol.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600/80 px-2 py-1 rounded-full font-medium">
                      🔍 Search & Auto-fill
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600/80 px-2 py-1 rounded-full font-medium">
                      💰 Harga Referensi
                    </span>
                  </div>
                  <span className="inline-flex items-center text-sm font-semibold text-orange-600 group-hover:gap-2 gap-1 transition-all">
                    Kelola Master Barang <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

      </main>
    </div>
  );
}
