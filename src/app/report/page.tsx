'use client';

import React, { useState, useMemo } from 'react';
import { useJastipStore } from '@/store/useJastipStore';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ReportPage() {
  const { sessions } = useJastipStore();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  // Determine available customers based on selected session
  const availableCustomers = useMemo(() => {
    if (selectedSessionId === 'all') {
      // Return all unique customers across all sessions
      const all = sessions.flatMap((s) => s.customers);
      // To avoid duplicates if somehow they have same ID, though they shouldn't
      return Array.from(new Map(all.map((c) => [c.id, c])).values());
    }
    const s = sessions.find((s) => s.id === selectedSessionId);
    return s ? s.customers : [];
  }, [sessions, selectedSessionId]);

  // If selected session changes, reset customer filter if the customer is not in the new list
  React.useEffect(() => {
    if (selectedCustomerId !== 'all') {
      const exists = availableCustomers.some((c) => c.id === selectedCustomerId);
      if (!exists) setSelectedCustomerId('all');
    }
  }, [availableCustomers, selectedCustomerId]);

  // Flatten and filter data
  const reportData = useMemo(() => {
    let data: any[] = [];
    
    sessions.forEach((session) => {
      // Filter by Date Range (using session createdAt)
      const sessionDate = session.createdAt ? new Date(session.createdAt) : new Date();
      sessionDate.setHours(0, 0, 0, 0); // normalize

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (sessionDate < start) return;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (sessionDate > end) return;
      }

      // Filter by Session
      if (selectedSessionId !== 'all' && session.id !== selectedSessionId) return;

      session.customers.forEach((customer) => {
        // Filter by Customer
        if (selectedCustomerId !== 'all' && customer.id !== selectedCustomerId) return;
        
        // Filter by Payment Status
        if (paymentStatus === 'paid' && !customer.isPaid) return;
        if (paymentStatus === 'unpaid' && customer.isPaid) return;

        customer.items.forEach((item) => {
          data.push({
            tanggal: session.createdAt ? new Date(session.createdAt).toLocaleDateString('id-ID') : '-',
            sesi: session.name,
            customer: customer.name,
            barang: item.name,
            qty: item.qty,
            hargaAsli: `${item.currency} ${item.originalPrice.toLocaleString('id-ID')}`,
            modalRp: item.idrPrice,
            profit: item.feeAmount,
            ongkir: item.shippingPerItem,
            totalDitagih: item.idrPrice + item.feeAmount + item.shippingPerItem,
            statusBayar: customer.isPaid ? 'Lunas' : 'Belum Lunas',
          });
        });
      });
    });

    return data;
  }, [sessions, startDate, endDate, selectedSessionId, selectedCustomerId, paymentStatus]);

  const handleExport = () => {
    if (reportData.length === 0) return;

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert JSON data to worksheet
    const ws = XLSX.utils.json_to_sheet(reportData.map(row => ({
      'Tanggal': row.tanggal,
      'Sesi': row.sesi,
      'Customer': row.customer,
      'Barang': row.barang,
      'Qty': row.qty,
      'Harga Asli': row.hargaAsli,
      'Modal (Rp)': row.modalRp,
      'Profit (Rp)': row.profit,
      'Ongkir (Rp)': row.ongkir,
      'Total Ditagih (Rp)': row.totalDitagih,
      'Status Bayar': row.statusBayar
    })));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Report Data');

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `Jastip_Report_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laporan Transaksi</h1>
          <p className="text-slate-500">Lihat detail transaksi dari setiap sesi jastip Anda.</p>
        </div>
        <Button onClick={handleExport} disabled={reportData.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
          <Download className="w-4 h-4 mr-2" />
          Export ke Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500">Rentang Tanggal (Mulai)</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500">Rentang Tanggal (Selesai)</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500">Sesi</label>
          <select 
            value={selectedSessionId} 
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="all">Semua Sesi</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500">Customer</label>
          <select 
            value={selectedCustomerId} 
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="all">Semua Customer</option>
            {availableCustomers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500">Status Bayar</label>
          <select 
            value={paymentStatus} 
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="unpaid">Belum Lunas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm text-left text-slate-600 relative">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50">Tanggal</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50">Sesi</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50">Customer</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50">Barang</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-right">Qty</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-right whitespace-nowrap">Harga Asli</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-right">Modal (Rp)</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-right">Profit</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-right">Ongkir</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-right">Total Ditagih</th>
                <th className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length > 0 ? (
                reportData.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{row.tanggal}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.sesi}</td>
                    <td className="px-4 py-3">{row.customer}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={row.barang}>{row.barang}</td>
                    <td className="px-4 py-3 text-right">{row.qty}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{row.hargaAsli}</td>
                    <td className="px-4 py-3 text-right">{row.modalRp.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">+{row.profit.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right">{row.ongkir.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{row.totalDitagih.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${row.statusBayar === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {row.statusBayar}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Grand Total Row Footer */}
            {reportData.length > 0 && (
              <tfoot className="bg-slate-50 text-slate-800 font-bold sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right border-t border-slate-200 bg-slate-50">Grand Total:</td>
                  <td className="px-4 py-3 text-right border-t border-slate-200 bg-slate-50">
                    {reportData.reduce((acc, row) => acc + row.modalRp, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right text-green-700 border-t border-slate-200 bg-slate-50">
                    +{reportData.reduce((acc, row) => acc + row.profit, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right border-t border-slate-200 bg-slate-50">
                    {reportData.reduce((acc, row) => acc + row.ongkir, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right text-primary text-base border-t border-slate-200 bg-slate-50">
                    {reportData.reduce((acc, row) => acc + row.totalDitagih, 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 border-t border-slate-200 bg-slate-50"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
