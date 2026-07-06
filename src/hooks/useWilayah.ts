import { useState, useCallback } from 'react';

export interface LocationItem {
  value: string; // destination ID
  text: string;  // formatted name (label from API)
}

export function useWilayah() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchWilayah = useCallback(async (query: string): Promise<LocationItem[]> => {
    if (!query || query.length < 3) return [];
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wilayah?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      // Expected RajaOngkir V2 Response: { meta: { status: 'success' }, data: [ { id: 123, label: "..." } ] }
      if (data && data.meta?.status === 'success' && Array.isArray(data.data)) {
        interface RajaOngkirItem { id: number; label: string; }
        return data.data.map((item: RajaOngkirItem) => ({
          value: item.id.toString(),
          text: item.label
        }));
      }
      return [];
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { searchWilayah, loading, error };
}
