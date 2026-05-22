'use client';

import { useState } from 'react';

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className }: Props) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-[#C8C0B5]/30 ${className ?? ''}`}>
        <svg viewBox="0 0 100 100" className="w-1/3 h-1/3 opacity-15" aria-hidden>
          <circle cx="50" cy="45" r="28" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="45" r="5" fill="#000" />
          <line x1="50" y1="73" x2="50" y2="85" stroke="#000" strokeWidth="4" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
