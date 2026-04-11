import { useState, useCallback, useEffect } from 'react';

export function useCurrency() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/currency');
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      if (data && data.conversion_rates) {
        setRates(data.conversion_rates);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convertToIDR = useCallback((amount: number, fromCurrency: string) => {
    if (fromCurrency === 'IDR') return amount;
    if (!rates[fromCurrency]) return amount; // Fallback if rates not loaded
    
    // The base is IDR (if route default is IDR). Wait!
    // If the base in API is IDR, then rates[fromCurrency] is how much 1 IDR is in fromCurrency.
    // So 1 IDR = rates[SGD] SGD.
    // To convert amount in SGD to IDR: IDR = amount / rates[SGD]
    
    return amount / rates[fromCurrency];
  }, [rates]);

  return { rates, loading, error, convertToIDR, fetchRates };
}
