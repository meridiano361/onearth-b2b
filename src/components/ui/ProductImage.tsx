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
      <div className={`flex items-center justify-center bg-gray-100 ${className ?? ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-on-earth/onearth_pittogramma.png"
          alt="ON EARTH"
          className="w-1/3 h-1/3 object-contain opacity-15"
        />
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
