'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { PAESI } from '@/lib/paesi';

interface PaeseSelectProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}

export default function PaeseSelect({ value, onChange, label, placeholder = 'Seleziona paese...' }: PaeseSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? PAESI.filter((p) => p.toLowerCase().includes(query.toLowerCase()))
    : PAESI;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function handleSelect(paese: string) {
    onChange(paese);
    setOpen(false);
    setQuery('');
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <div
        onClick={handleOpen}
        className="flex items-center w-full h-9 border border-border rounded px-3 bg-white cursor-pointer focus-within:ring-1 focus-within:ring-accent"
      >
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={value || placeholder}
            className="flex-1 text-sm outline-none bg-transparent text-primary"
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setOpen(false); setQuery(''); }
              if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0]);
            }}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${value ? 'text-primary' : 'text-gray-400'}`}>
            {value || placeholder}
          </span>
        )}
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          {value && !open && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Nessun risultato</div>
          ) : (
            filtered.map((paese) => (
              <div
                key={paese}
                onClick={() => handleSelect(paese)}
                className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-cream transition-colors ${paese === value ? 'text-accent font-medium' : 'text-primary'}`}
              >
                {paese}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
