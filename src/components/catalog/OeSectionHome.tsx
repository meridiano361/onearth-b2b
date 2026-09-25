'use client';

import { Construction } from 'lucide-react';

interface Props {
  titolo: string;
  sottotitolo?: string;
}

export default function OeSectionHome({ titolo, sottotitolo }: Props) {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-primary px-5 pt-8 pb-28">
      <p className="text-2xs tracking-[0.2em] uppercase text-gray-400">sezione</p>
      <h1 className="font-display text-4xl font-light tracking-widest leading-tight mt-0.5">
        {titolo.toUpperCase()}
      </h1>
      {sottotitolo && <p className="text-sm text-gray-400 mt-1">{sottotitolo}</p>}
      <div className="mt-16 flex flex-col items-center gap-3">
        <Construction size={36} className="text-gray-300" />
        <p className="text-sm text-gray-400">Sezione in preparazione</p>
      </div>
    </div>
  );
}
