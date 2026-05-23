'use client';

import { useEffect, useRef, useState } from 'react';

interface ComboboxProps {
  label: string;
  field: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function Combobox({
  label,
  field,
  value,
  onChange,
  placeholder = '',
  disabled = false,
}: ComboboxProps) {
  const [inputVal, setInputVal] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipFetch = useRef(false);

  // Keep input in sync with external value changes
  useEffect(() => {
    if (value !== inputVal) {
      skipFetch.current = true;
      setInputVal(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function fetchSuggestions(q: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/suggestions?field=${encodeURIComponent(field)}&q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const { data } = await res.json();
        setSuggestions(data ?? []);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        // silently ignore
      }
    }, 250);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInputVal(v);
    onChange(v);
    if (skipFetch.current) { skipFetch.current = false; return; }
    fetchSuggestions(v);
  }

  function handleFocus() {
    if (!open && inputVal === '') fetchSuggestions('');
  }

  function handleSelect(s: string) {
    skipFetch.current = true;
    setInputVal(s);
    onChange(s);
    setOpen(false);
    setSuggestions([]);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={inputVal}
        onChange={handleInput}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full h-9 border border-border rounded px-3 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 disabled:bg-gray-50"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-border rounded shadow-lg max-h-48 overflow-y-auto text-sm">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className={`px-3 py-1.5 cursor-pointer ${i === activeIdx ? 'bg-accent/10 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
