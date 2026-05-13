'use client';

import { useState, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidLotQuantity, roundToLot } from '@/lib/utils';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  lotSize?: number;
  min?: number;
  max?: number;
  compact?: boolean;
}

export default function QuantitySelector({
  value,
  onChange,
  lotSize = 1,
  min = 0,
  max,
  compact = false,
}: QuantitySelectorProps) {
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const hasWarning = value > 0 && !isValidLotQuantity(value, lotSize);

  function decrement() {
    const step = lotSize > 1 ? lotSize : 1;
    const next = Math.max(min, value - step);
    onChange(next);
    setInputValue(String(next));
  }

  function increment() {
    const step = lotSize > 1 ? lotSize : 1;
    const next = max !== undefined ? Math.min(max, value + step) : value + step;
    onChange(next);
    setInputValue(String(next));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }

  function handleInputBlur() {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= min) {
      const clamped = max !== undefined ? Math.min(max, parsed) : parsed;
      onChange(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(value));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') inputRef.current?.blur();
  }

  if (compact) {
    return (
      <div className="flex items-center">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-7 h-7 flex items-center justify-center border border-border rounded-l bg-cream hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={11} />
        </button>
        <input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-9 h-7 text-center text-xs font-medium border-y border-border bg-white focus:outline-none focus:border-accent',
            hasWarning && 'bg-amber-50 text-amber-700'
          )}
        />
        <button
          type="button"
          onClick={increment}
          disabled={max !== undefined && value >= max}
          className="w-7 h-7 flex items-center justify-center border border-border rounded-r bg-cream hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={11} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-8 h-8 flex items-center justify-center border border-border rounded-l bg-cream hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={12} />
        </button>
        <input
          ref={inputRef}
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-12 h-8 text-center text-sm font-medium border-y border-border bg-white focus:outline-none focus:border-accent',
            hasWarning && 'bg-amber-50 text-amber-700'
          )}
        />
        <button
          type="button"
          onClick={increment}
          disabled={max !== undefined && value >= max}
          className="w-8 h-8 flex items-center justify-center border border-border rounded-r bg-cream hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
      {hasWarning && (
        <p className="text-2xs text-amber-600">
          LOT {lotSize} — adjust to multiple
        </p>
      )}
    </div>
  );
}
