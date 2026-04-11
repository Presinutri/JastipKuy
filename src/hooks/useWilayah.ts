import { useState, useCallback } from 'react';

export interface LocationItem {
  value: string; // village code 10 digits
  text: string;  // formatted name (Village, District, City)
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
      
      // Expected API.co.id Response: { is_success: true, data: [ { code: "...", name: "...", district: "...", regency: "..." } ] }
      if (data && data.is_success && data.data) {
        interface VillageItem { code: string; name: string; district: string; regency: string; }
        return data.data.map((item: VillageItem) => ({
          value: item.code,
          text: `${item.name}, ${item.district}, ${item.regency}`
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
