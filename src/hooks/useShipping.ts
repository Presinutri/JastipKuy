import { useState, useCallback } from 'react';

export function useShipping() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRates = useCallback(async (origin: string, destination: string, weight: number, courier: string = 'jne') => {
    setLoading(true);
    setError(null);
    try {
      // Ensure we hit the backend route
      const res = await fetch(`/api/shipping?origin=${origin}&destination=${destination}&weight=${weight}&courier=${courier}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      // Return the raw response data rather than parsing BinderByte's old structure
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { calculateRates, loading, error };
}
