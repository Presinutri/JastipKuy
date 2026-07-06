import React, { useState, useRef } from 'react';
import { useWilayah, LocationItem } from '@/hooks/useWilayah';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface LocationSelectProps {
  label: string;
  initialValue?: string;
  onLocationChange: (areaId: string, areaName: string) => void;
}

export function LocationSelect({ label, initialValue, onLocationChange }: LocationSelectProps) {
  const { searchWilayah, loading } = useWilayah();

  const [query, setQuery] = useState(initialValue || '');
  const [results, setResults] = useState<LocationItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<LocationItem | null>(initialValue ? { value: '', text: initialValue } : null);

  React.useEffect(() => {
    if (initialValue !== undefined) {
      setQuery(initialValue);
      setSelected(initialValue ? { value: '', text: initialValue } : null);
    }
  }, [initialValue]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    setSelected(null);
    onLocationChange('', ''); // clear parent selection

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length >= 3) {
      debounceRef.current = setTimeout(() => {
        searchWilayah(text).then((data) => {
          setResults(data);
          setShowResults(true);
        });
      }, 500);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSelect = (item: LocationItem) => {
    setSelected(item);
    setQuery(item.text);
    setShowResults(false);
    onLocationChange(item.value, item.text);
  };

  return (
    <div className="space-y-2 relative">
      <Label className="flex items-center text-sm font-semibold text-primary/80">
        <MapPin className="w-4 h-4 mr-1 transition-colors group-focus-within:text-primary" />
        {label}
      </Label>
      
      <div className="relative group">
        <Input 
          placeholder="Cari Kecamatan/Kota (Cth: Grogol)" 
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className={`h-10 transition-all ${selected ? 'border-primary ring-1 ring-primary/20' : 'focus:border-primary/50'}`}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {!loading && !selected && (
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <ul className="absolute z-[100] w-full bg-background border rounded-md mt-1 shadow-xl max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-muted">
          {results.map((item) => (
            <li 
              key={item.value} 
              className="px-4 py-2.5 text-sm hover:bg-primary/10 cursor-pointer transition-colors border-b last:border-b-0"
              onClick={() => handleSelect(item)}
            >
              <div className="font-medium">{item.text.split(',')[0]}</div>
              <div className="text-xs text-muted-foreground">{item.text.split(',').slice(1).join(',')}</div>
            </li>
          ))}
        </ul>
      )}
      
      {showResults && query.length >= 3 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full bg-background border rounded-md mt-1 p-3 text-sm text-muted-foreground text-center shadow-lg">
          Lokasi tidak ditemukan.
        </div>
      )}
    </div>
  );
}
