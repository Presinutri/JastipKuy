'use client';

import React, { useState, useMemo } from 'react';
import { useJastipStore } from '@/store/useJastipStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart
} from 'recharts';
import { TrendingUp, Package, Wallet } from 'lucide-react';

export default function DashboardPage() {
  const { sessions } = useJastipStore();

  const [showAllSessions, setShowAllSessions] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<'qty' | 'profit'>('qty');

  // Filter sessions based on completion status
  const filteredSessions = useMemo(() => {
    if (showAllSessions) return sessions;
    
    // Default: only completed sessions (all customers isPaid = true)
    return sessions.filter(session => {
      if (session.customers.length === 0) return false;
      return session.customers.every(customer => customer.isPaid);
    });
  }, [sessions, showAllSessions]);

  // Aggregate Data for Charts
  const chartData = useMemo(() => {
    return filteredSessions.map(session => {
      let totalModal = 0;
      let totalProfit = 0;
      
      session.customers.forEach(c => {
        c.items.forEach(item => {
          totalModal += item.idrPrice;
          totalProfit += item.feeAmount;
        });
      });

      const totalRevenue = totalModal + totalProfit;
      const marginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return {
        name: session.name,
        'Profit (Rp)': totalProfit,
        'Margin (%)': parseFloat(marginPercent.toFixed(1)),
        date: session.createdAt ? new Date(session.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : ''
      };
    });
  }, [filteredSessions]);

  // Aggregate Data for Leaderboard
  const leaderboardData = useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; profit: number }>();

    filteredSessions.forEach(session => {
      session.customers.forEach(c => {
        c.items.forEach(item => {
          const existing = itemMap.get(item.name);
          if (existing) {
            existing.qty += item.qty;
            existing.profit += item.feeAmount;
          } else {
            itemMap.set(item.name, {
              name: item.name,
              qty: item.qty,
              profit: item.feeAmount
            });
          }
        });
      });
    });

    const dataArray = Array.from(itemMap.values());
    
    if (leaderboardMode === 'qty') {
      return dataArray.sort((a, b) => b.qty - a.qty).slice(0, 10);
    } else {
      return dataArray.sort((a, b) => b.profit - a.profit).slice(0, 10);
    }
  }, [filteredSessions, leaderboardMode]);

  // Format currency for Tooltip
  const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg z-50 relative">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('%') ? `${entry.value}%` : formatRupiah(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      
      {/* Header & Global Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Performa</h1>
          <p className="text-slate-500">Ringkasan tren dan performa bisnis jastip Anda.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <button 
            onClick={() => setShowAllSessions(false)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${!showAllSessions ? 'bg-white shadow-sm text-primary border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sesi Selesai Saja (Lunas)
          </button>
          <button 
            onClick={() => setShowAllSessions(true)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${showAllSessions ? 'bg-white shadow-sm text-primary border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Semua Sesi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-800">Trend Margin & Profit per Sesi</h2>
            </div>
            
            {chartData.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                    
                    {/* Y Axis for Profit (Left) */}
                    <YAxis 
                      yAxisId="left" 
                      tickFormatter={(value) => `Rp ${(value / 1000)}k`}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b' }}
                      dx={-10}
                    />
                    
                    {/* Y Axis for Margin % (Right) */}
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tickFormatter={(value) => `${value}%`}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b' }}
                      dx={10}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    
                    <Bar yAxisId="left" dataKey="Profit (Rp)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Line yAxisId="right" type="monotone" dataKey="Margin (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                Belum ada data sesi untuk ditampilkan.
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-slate-800">Barang Terlaris</h2>
              </div>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-lg mb-4 shrink-0">
              <button 
                onClick={() => setLeaderboardMode('qty')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${leaderboardMode === 'qty' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
              >
                Volume (Qty)
              </button>
              <button 
                onClick={() => setLeaderboardMode('profit')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${leaderboardMode === 'profit' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
              >
                Profit (Rp)
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 shrink-0">
              {leaderboardMode === 'qty' 
                ? 'ℹ️ Diurutkan berdasarkan total jumlah kuantitas barang terjual.' 
                : 'ℹ️ Diurutkan berdasarkan total kontribusi profit (margin).'}
            </p>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {leaderboardData.length > 0 ? (
                leaderboardData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between group py-1">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                        {index + 1}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-sm text-slate-800 truncate" title={item.name}>{item.name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {leaderboardMode === 'qty' ? (
                        <p className="font-bold text-slate-800">{item.qty} <span className="text-xs text-slate-500 font-normal">pcs</span></p>
                      ) : (
                        <p className="font-bold text-green-600 text-sm">+{item.profit.toLocaleString('id-ID')}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm space-y-2">
                  <Package className="w-8 h-8 opacity-20" />
                  <p>Belum ada data barang.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
