'use client';

import { useState, useEffect } from 'react';
import { useJastipStore } from '@/store/useJastipStore';
import { loadAllData, syncAllToSupabase } from '@/lib/supabaseSync';

export type SyncStatus = 'loading' | 'synced' | 'error';

/**
 * Hook yang dijalankan sekali saat app mount.
 * - Ambil data dari Supabase
 * - Jika ada data → hydrate Zustand store (Supabase is source of truth)
 * - Jika kosong → migrasikan data localStorage ke Supabase
 * - Jika gagal → tetap pakai localStorage (graceful degradation)
 */
export function useSupabaseInit() {
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cloudData = await loadAllData();
        if (cancelled) return;

        if (cloudData && cloudData.sessions.length > 0) {
          // Supabase punya data → gunakan sebagai source of truth
          useJastipStore.setState({
            sessions: cloudData.sessions,
            activeSessionId: cloudData.activeSessionId,
          });
          if (!cancelled) setStatus('synced');
        } else {
          // Supabase kosong atau error → coba migrasikan localStorage ke Supabase
          const localState = useJastipStore.getState();
          try {
            await syncAllToSupabase(localState.sessions, localState.activeSessionId);
            if (!cancelled) setStatus('synced');
          } catch (syncErr: unknown) {
            // Sync migration gagal (tabel belum ada, dll) → tetap pakai localStorage
            const msg = syncErr instanceof Error ? syncErr.message : JSON.stringify(syncErr);
            console.warn('[Supabase] Migration gagal (tabel mungkin belum dibuat):', msg);
            if (!cancelled) {
              setErrorMsg('Tabel Supabase belum dibuat. Jalankan SQL schema terlebih dahulu.');
              setStatus('error');
            }
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : JSON.stringify(err);
          console.error('[Supabase Init] Gagal:', msg);
          setErrorMsg('Gagal sinkronisasi cloud. Menggunakan data lokal.');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, errorMsg };
}
