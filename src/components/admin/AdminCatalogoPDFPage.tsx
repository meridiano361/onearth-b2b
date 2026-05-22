'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Download,
  Eye,
  Save,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  CatalogFields,
  FieldStyle,
  CardFieldStyles,
  SeparatorStyle,
  PageHeaderStyle,
  PageFooterStyle,
  CardBoxStyle,
  CoverTypography,
  FinalPageTypography,
  CustomSection,
} from '@/components/admin/CatalogoPDFDocument';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  gruppoMerceologico: string;
  famiglia: string;
  classe: string;
  sottoclasse: string;
  gruppoOmogeneo: string;
  nomLinea: string;
  collezione: string;
  colore: string;
  produttore: string;
  tranche: string;
  soloAttivi: boolean;
  raggruppa: string;
  ordina: string;
  campi: CatalogFields;
  titolo: string;
  mostraLogo: boolean;
  mostraData: boolean;
  mostraPagina: boolean;
  // New fields
  formato: 'A4-P' | 'A4-L' | 'A3-P' | 'A3-L';
  colonne: number;
  righe: number;
  margine: 'stretto' | 'normale' | 'ampio';
  colori: {
    sfondoPagina: string;
    sfondoFoto: string;
    testoPrimario: string;
    testoSecondario: string;
  };
  modalitaSeparatore: 'pagina-intera' | 'inline' | 'nuova-riga';
  copertina: {
    attiva: boolean;
    immagineBase64: string | null;
    titolo: string;
    sottotitolo: string;
    layout: 'full-overlay' | 'half' | 'solo-testo';
    logoTipo: 'onearth' | 'custom' | 'none';
    logoCustomBase64: string | null;
    // ITEM 4: grid logo position
    logoPosX: 'left' | 'center' | 'right';
    logoPosY: 'top' | 'middle' | 'bottom';
    logoPosizione: 'top-left' | 'top-center' | 'top-right';
    logoDimensione: 'piccolo' | 'medio' | 'grande';
    titoloAllineamento: 'left' | 'center' | 'right';
    sottotitoloAllineamento: 'left' | 'center' | 'right';
    // ITEM 3: image controls
    imgOffsetX: number;
    imgOffsetY: number;
    imgScale: number;
    imgOpacity: number;
  };
  // ITEM 6: custom sections
  useSezioniPersonalizzate: boolean;
  sezioniPersonalizzate: CustomSection[];
  includiProdottiNonAssegnati: boolean;
  paginaFinale: {
    attiva: boolean;
    titolo: string;
    testo: string;
    mostraLogo: boolean;
    titoloAllineamento: 'left' | 'center' | 'right';
    testoAllineamento: 'left' | 'center' | 'right';
  };
  cardFieldStyles: CardFieldStyles;
  separatoreStyle: SeparatorStyle;
  headerStyle: PageHeaderStyle;
  footerStyle: PageFooterStyle;
  cardBoxStyle: CardBoxStyle;
  copertinaTypo: CoverTypography;
  paginaFinaleTypo: FinalPageTypography;
}

interface Template {
  id: string;
  nome: string;
  configurazione: FormState;
  createdAt: string;
}

interface PreviewResult {
  count: number;
  pages: number;
  productPages: number;
  groupPages: number;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_STATE: FormState = {
  gruppoMerceologico: '',
  famiglia: '',
  classe: '',
  sottoclasse: '',
  gruppoOmogeneo: '',
  nomLinea: '',
  collezione: '',
  colore: '',
  produttore: '',
  tranche: '',
  soloAttivi: true,
  raggruppa: '',
  ordina: 'code',
  campi: {
    foto: true,
    codice: true,
    descrizione: true,
    misure: true,
    produttore: true,
    paese: true,
    prezzoCosto: true,
    pvp: true,
    linea: false,
    collezione: false,
    confezione: false,
    iva: false,
  },
  titolo: 'Collezione CASA 2027',
  mostraLogo: true,
  mostraData: true,
  mostraPagina: true,
  formato: 'A4-P',
  colonne: 4,
  righe: 6,
  margine: 'normale',
  colori: {
    sfondoPagina: '#E8DDD0',
    sfondoFoto: '#FFFFFF',
    testoPrimario: '#1C1C1C',
    testoSecondario: '#9CA3AF',
  },
  modalitaSeparatore: 'pagina-intera',
  copertina: {
    attiva: false,
    immagineBase64: null,
    titolo: 'Collezione CASA 2027',
    sottotitolo: '',
    layout: 'full-overlay',
    logoTipo: 'onearth',
    logoCustomBase64: null,
    logoPosX: 'left',
    logoPosY: 'top',
    logoPosizione: 'top-left',
    logoDimensione: 'medio',
    titoloAllineamento: 'center',
    sottotitoloAllineamento: 'center',
    imgOffsetX: 0,
    imgOffsetY: 0,
    imgScale: 100,
    imgOpacity: 100,
  },
  paginaFinale: {
    attiva: false,
    titolo: '',
    testo: '',
    mostraLogo: true,
    titoloAllineamento: 'center',
    testoAllineamento: 'center',
  },
  cardFieldStyles: {
    codice:      { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    descrizione: { fontSize: 7,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
    misure:      { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    produttore:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    paese:       { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    prezzoCosto: { fontSize: 8,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
    pvp:         { fontSize: 8,   bold: false, italic: false, color: '#1C1C1C', align: 'left', uppercase: false },
    linea:       { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    collezione:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    confezione:  { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
    iva:         { fontSize: 6.5, bold: false, italic: false, color: '#9CA3AF', align: 'left', uppercase: false },
  },
  separatoreStyle: {
    fontSize: 16, bold: true, italic: false, color: '#1C1C1C', bgColor: '#E8DDD0',
    align: 'center', height: 36, uppercase: true,
  },
  headerStyle: {
    titleFontSize: 8, titleBold: false, titleItalic: false, titleColor: '#1C1C1C',
    titleAlign: 'center', showSeparator: true, separatorColor: '#D4CEC7',
  },
  footerStyle: {
    fontSize: 6.5, color: '#9CA3AF', align: 'center', customText: '', showSeparator: true,
  },
  cardBoxStyle: {
    borderWidth: 0.5, borderColor: '#D4CEC7', borderRadius: 0, padding: 4,
  },
  copertinaTypo: {
    titoloFontSize: 28, titoloBold: true, titoloItalic: false, titoloColor: '#FFFFFF',
    titoloUppercase: true, sottotitoloFontSize: 13, sottotitoloBold: false,
    sottotitoloItalic: false, sottotitoloColor: '#FFFFFF', bgColor: '#E8DDD0',
  },
  paginaFinaleTypo: {
    titoloFontSize: 20, titoloBold: true, titoloItalic: false, titoloColor: '#1C1C1C',
    testoFontSize: 10, testoColor: '#9CA3AF',
  },
  useSezioniPersonalizzate: false,
  sezioniPersonalizzate: [],
  includiProdottiNonAssegnati: true,
};

// ── ON EARTH palette ──────────────────────────────────────────────────────────

const PALETTE = [
  { nome: 'Bianco', hex: '#FFFFFF' },
  { nome: 'Tortora chiaro', hex: '#F5F0EA' },
  { nome: 'Tortora', hex: '#E8DDD0' },
  { nome: 'Beige', hex: '#D4C4B0' },
  { nome: 'Grigio chiaro', hex: '#E5E5E5' },
  { nome: 'Grigio', hex: '#9CA3AF' },
  { nome: 'Nero', hex: '#000000' },
  { nome: 'Verde salvia', hex: '#8FAF8F' },
  { nome: 'Terracotta', hex: '#C17A5A' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({
  children,
  open,
  onToggle,
}: {
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-border rounded text-xs font-semibold tracking-widest uppercase text-gray-500 hover:bg-gray-100 transition-colors"
    >
      {children}
      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Tutti',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border accent-primary"
      />
      <span className="text-xs text-gray-700 group-hover:text-primary transition-colors">{label}</span>
    </label>
  );
}

function ColorSwatchPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 items-center">
        {PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.nome}
            onClick={() => onChange(c.hex)}
            style={{ backgroundColor: c.hex }}
            className={`w-7 h-7 rounded transition-all ${
              value.toLowerCase() === c.hex.toLowerCase()
                ? 'border-2 border-primary ring-1 ring-primary/30 scale-110'
                : 'border-2 border-transparent hover:border-gray-300'
            } ${c.hex === '#FFFFFF' ? 'border-gray-200' : ''}`}
          />
        ))}
        {/* Swatch del colore corrente se non è nella palette */}
        {!PALETTE.some(c => c.hex.toLowerCase() === value.toLowerCase()) && (
          <div style={{ backgroundColor: value }} className="w-7 h-7 rounded border-2 border-primary ring-1 ring-primary/30 scale-110 flex-shrink-0" />
        )}
        {/* Pulsante + per color picker libero */}
        <button
          type="button"
          title="Colore personalizzato"
          onClick={() => inputRef.current?.click()}
          className="w-7 h-7 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors text-xs font-bold"
        >
          +
        </button>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
      <p className="text-2xs text-gray-400 mt-1">{PALETTE.find(c => c.hex.toLowerCase() === value.toLowerCase())?.nome ?? value}</p>
    </div>
  );
}

function AlignToggle({
  value,
  onChange,
}: {
  value: 'left' | 'center' | 'right';
  onChange: (v: 'left' | 'center' | 'right') => void;
}) {
  const opts: { v: 'left' | 'center' | 'right'; Icon: typeof AlignLeft }[] = [
    { v: 'left', Icon: AlignLeft },
    { v: 'center', Icon: AlignCenter },
    { v: 'right', Icon: AlignRight },
  ];
  return (
    <div className="flex border border-border rounded overflow-hidden">
      {opts.map(({ v, Icon }, i) => (
        <button
          key={v}
          type="button"
          title={v === 'left' ? 'Sinistra' : v === 'center' ? 'Centro' : 'Destra'}
          onClick={() => onChange(v)}
          className={`flex items-center justify-center w-8 h-8 transition-colors ${i > 0 ? 'border-l border-border' : ''} ${value === v ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded text-xs border transition-colors ${
        active ? 'bg-primary text-white border-primary' : 'border-border text-gray-600 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

function MiniColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {PALETTE.map((c) => (
        <button
          key={c.hex}
          type="button"
          title={c.nome}
          onClick={() => onChange(c.hex)}
          style={{ backgroundColor: c.hex }}
          className={`w-5 h-5 rounded-sm transition-all border ${
            value.toLowerCase() === c.hex.toLowerCase()
              ? 'ring-2 ring-primary scale-110 border-primary'
              : 'border-gray-200 hover:scale-110'
          }`}
        />
      ))}
      {!PALETTE.some(c => c.hex.toLowerCase() === value.toLowerCase()) && (
        <div style={{ backgroundColor: value }} className="w-5 h-5 rounded-sm border-2 border-primary flex-shrink-0" />
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-5 h-5 rounded-sm border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-primary text-xs"
      >
        +
      </button>
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </div>
  );
}

function FieldStyleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FieldStyle;
  onChange: (fs: FieldStyle) => void;
}) {
  const upd = (patch: Partial<FieldStyle>) => onChange({ ...value, ...patch });
  return (
    <div className="py-2.5 space-y-1.5">
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="number"
          min={5}
          max={24}
          step={0.5}
          value={value.fontSize}
          onChange={(e) => upd({ fontSize: parseFloat(e.target.value) || 7 })}
          title="Dimensione font (pt)"
          className="w-14 h-8 border border-border rounded px-1.5 text-xs bg-white text-center focus:outline-none"
        />
        <ToggleBtn active={value.bold} onClick={() => upd({ bold: !value.bold })}><span className="font-bold">B</span></ToggleBtn>
        <ToggleBtn active={value.italic} onClick={() => upd({ italic: !value.italic })}><span className="italic">I</span></ToggleBtn>
        <ToggleBtn active={value.uppercase} onClick={() => upd({ uppercase: !value.uppercase })} title="Tutto maiuscolo">AA</ToggleBtn>
        <AlignToggle value={value.align} onChange={(v) => upd({ align: v })} />
      </div>
      <MiniColorPicker value={value.color} onChange={(v) => upd({ color: v })} />
    </div>
  );
}

function CardPreview({ config }: { config: FormState }) {
  const cfs = config.cardFieldStyles;
  const box = config.cardBoxStyle;
  const f = config.campi;
  const S = 14; // scale factor: 1pt → S/595 * W

  function fs2px(pt: number) { return pt * 0.75; }

  function fieldCSS(fld: FieldStyle): React.CSSProperties {
    return {
      fontSize: fs2px(fld.fontSize),
      fontWeight: fld.bold ? 'bold' : 'normal',
      fontStyle: fld.italic ? 'italic' : 'normal',
      color: fld.color,
      textAlign: fld.align,
      textTransform: fld.uppercase ? 'uppercase' : undefined,
      margin: 0,
      lineHeight: 1.2,
    };
  }

  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Anteprima scheda</p>
      <div
        style={{
          width: 110,
          backgroundColor: config.colori.sfondoPagina,
          border: box.borderWidth > 0 ? `${Math.max(0.5, box.borderWidth * 0.4)}px solid ${box.borderColor}` : 'none',
          borderRadius: box.borderRadius * 0.4,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {f.foto && (
          <div style={{ height: 55, backgroundColor: config.colori.sfondoFoto, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 7, color: '#ccc', fontFamily: 'monospace' }}>foto</span>
          </div>
        )}
        <div style={{ padding: box.padding * 0.4 }}>
          {f.codice && <p style={fieldCSS(cfs.codice)}>COD-001</p>}
          {f.descrizione && <p style={{ ...fieldCSS(cfs.descrizione), marginBottom: 1, lineHeight: 1.25 }}>Nome prodotto esempio</p>}
          {(f.misure || f.produttore || f.paese || f.linea || f.collezione || f.confezione || f.iva) && (
            <p style={{ ...fieldCSS(cfs.misure), marginBottom: 2 }}>10×5 cm · Produttore</p>
          )}
          {(f.prezzoCosto || f.pvp) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              {f.prezzoCosto && (
                <div>
                  <p style={{ fontSize: fs2px(5.5), color: cfs.prezzoCosto.color, textTransform: 'uppercase', margin: 0 }}>Costo</p>
                  <p style={fieldCSS(cfs.prezzoCosto)}>€12,50</p>
                </div>
              )}
              {f.pvp && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: fs2px(5.5), color: cfs.pvp.color, textTransform: 'uppercase', margin: 0 }}>PVP</p>
                  <p style={fieldCSS(cfs.pvp)}>€29,90</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CoverPreview({ config }: { config: { copertina: FormState['copertina']; colori: FormState['colori'] } }) {
  const cov = config.copertina;
  if (!cov.attiva) return null;

  const W = 160;
  const H = Math.round(W * 842 / 595);

  const justifyLogo = (cov.logoPosX ?? 'left') === 'left' ? 'flex-start'
    : (cov.logoPosX ?? 'left') === 'center' ? 'center'
    : 'flex-end';

  const logoH = cov.logoDimensione === 'piccolo' ? 10 : cov.logoDimensione === 'medio' ? 16 : 24;

  const logoSrc = cov.logoTipo === 'onearth' ? '/logo-on-earth/onearth_solo.png'
    : cov.logoTipo === 'custom' ? cov.logoCustomBase64
    : null;

  const bg = config.colori.sfondoPagina;
  const textColor = config.colori.testoPrimario;
  const mutedColor = config.colori.testoSecondario;

  return (
    <div className="mt-4">
      <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Anteprima copertina</p>
      <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', backgroundColor: bg, border: '1px solid #e5e7eb', borderRadius: 4 }} className="shadow-sm flex-shrink-0">

        {/* Background image */}
        {cov.immagineBase64 && cov.layout !== 'solo-testo' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cov.immagineBase64}
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%',
              height: cov.layout === 'half' ? '50%' : '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {cov.layout === 'full-overlay' && (
          <>
            {/* Dark overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.65))' }} />
            {/* Logo top */}
            {logoSrc && (
              <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: justifyLogo }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
              </div>
            )}
            {/* Text */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px 10px', textAlign: cov.titoloAllineamento }}>
              {cov.titolo && <p style={{ color: '#fff', fontSize: 7, fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{cov.titolo}</p>}
              {cov.sottotitolo && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 5.5, margin: '2px 0 0', textAlign: cov.sottotitoloAllineamento }}>{cov.sottotitolo}</p>}
            </div>
          </>
        )}

        {cov.layout === 'half' && (
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 10px' }}>
            {logoSrc && (
              <div style={{ display: 'flex', justifyContent: justifyLogo, marginBottom: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
              </div>
            )}
            {cov.titolo && <p style={{ color: textColor, fontSize: 7, fontWeight: 'bold', margin: 0, textTransform: 'uppercase', textAlign: cov.titoloAllineamento }}>{cov.titolo}</p>}
            {cov.sottotitolo && <p style={{ color: mutedColor, fontSize: 5.5, margin: '2px 0 0', textAlign: cov.sottotitoloAllineamento }}>{cov.sottotitolo}</p>}
          </div>
        )}

        {cov.layout === 'solo-testo' && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 14px' }}>
            {logoSrc && (
              <div style={{ display: 'flex', justifyContent: justifyLogo, marginBottom: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="logo" style={{ height: logoH, objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ width: 16, height: 1, backgroundColor: '#8B7355', marginBottom: 6, alignSelf: 'center' }} />
            {cov.titolo && <p style={{ color: textColor, fontSize: 7, fontWeight: 'bold', margin: 0, textTransform: 'uppercase', textAlign: cov.titoloAllineamento }}>{cov.titolo}</p>}
            {cov.sottotitolo && <p style={{ color: mutedColor, fontSize: 5.5, margin: '3px 0 0', textAlign: cov.sottotitoloAllineamento }}>{cov.sottotitolo}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Custom Sections UI Components ─────────────────────────────────────────────

function MultiSelectCriteria({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div className="max-h-32 overflow-y-auto border border-border rounded p-2 space-y-1">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, opt] : selected.filter((x) => x !== opt))
              }
              className="accent-primary"
            />
            <span className="text-xs text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const EMPTY_SECTION: Omit<CustomSection, 'id'> = {
  nome: '',
  descrizione: '',
  criteri: { classe: [], sottoclasse: [], famiglia: [], gruppoOmogeneo: [], nomLinea: [], colore: [], produttore: [] },
  mostraSottosezioni: false,
  ordinamento: 'code',
};

function SortableSection({
  sezione,
  index,
  onEdit,
  onDelete,
}: {
  sezione: CustomSection;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sezione.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-white border border-border rounded">
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 select-none text-base leading-none"
        title="Trascina per riordinare"
      >
        ⠿
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary truncate">{sezione.nome || `Sezione ${index + 1}`}</p>
        {sezione.descrizione && <p className="text-2xs text-gray-400 truncate">{sezione.descrizione}</p>}
      </div>
      <button type="button" onClick={onEdit} className="text-2xs px-2 py-0.5 border border-border rounded hover:bg-gray-50 text-gray-600">Modifica</button>
      <button type="button" onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminCatalogoPDFPage() {
  const [config, setConfig] = useState<FormState>(DEFAULT_STATE);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Section open/close
  const [sections, setSections] = useState({
    filtri: true,
    formato: true,
    colori: false,
    raggruppamento: true,
    separatoreStile: false,
    campi: true,
    campiStile: false,
    riquadro: false,
    intestazione: true,
    headerStile: false,
    footerStile: false,
    copertina: false,
    paginaFinale: false,
    sezioniPersonalizzate: false,
  });

  // Custom sections editing state
  const [editingSection, setEditingSection] = useState<(CustomSection & { isNew?: boolean }) | null>(null);

  const toggleSection = (k: keyof typeof sections) =>
    setSections((s) => ({ ...s, [k]: !s[k] }));

  // ── Classification data ────────────────────────────────────────────────────

  const { data: classData } = useQuery({
    queryKey: ['classificazione'],
    queryFn: () => fetch('/api/classificazione').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: produttoriData } = useQuery({
    queryKey: ['produttori'],
    queryFn: () => fetch('/api/admin/produttori').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: optionsData } = useQuery({
    queryKey: ['catalogo-pdf-options'],
    queryFn: () => fetch('/api/admin/catalogo-pdf/options').then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: templatesData, refetch: refetchTemplates } = useQuery({
    queryKey: ['catalogo-templates'],
    queryFn: () => fetch('/api/admin/catalogo-pdf/templates').then((r) => r.json()),
  });

  // Derived option lists
  const byType = (tipo: string): string[] =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    classData?.data?.filter((v: any) => v.tipo === tipo).map((v: any) => v.nome) ?? [];

  const gruppiMerceologici = byType('gruppoMerceologico');
  const famiglie = byType('famiglia');
  const classi = byType('classe');
  const sottoclassi = byType('sottoclasse');
  const gruppiOmogenei = byType('gruppoOmogeneo');
  const linee = byType('nomLinea');
  const collezioni = byType('collezione');
  const colori = byType('colore');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const produttori = produttoriData?.data?.map((p: any) => p.nome) ?? [];
  const tranches = optionsData?.tranches ?? [];

  const templates: Template[] = templatesData?.data ?? [];

  // ── Field updaters ─────────────────────────────────────────────────────────

  const set = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState, value: any) =>
      setConfig((c) => ({ ...c, [key]: value })),
    []
  );

  const setField = useCallback(
    (key: keyof CatalogFields, value: boolean) =>
      setConfig((c) => ({ ...c, campi: { ...c.campi, [key]: value } })),
    []
  );

  const setColore = useCallback(
    (key: keyof FormState['colori'], value: string) =>
      setConfig((c) => ({ ...c, colori: { ...c.colori, [key]: value } })),
    []
  );

  const setCopertina = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState['copertina'], value: any) =>
      setConfig((c) => ({ ...c, copertina: { ...c.copertina, [key]: value } })),
    []
  );

  const setPaginaFinale = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: keyof FormState['paginaFinale'], value: any) =>
      setConfig((c) => ({ ...c, paginaFinale: { ...c.paginaFinale, [key]: value } })),
    []
  );

  const setCardFieldStyle = useCallback(
    (field: keyof CardFieldStyles, fs: FieldStyle) =>
      setConfig((c) => ({ ...c, cardFieldStyles: { ...c.cardFieldStyles, [field]: fs } })),
    []
  );

  const setSeparatoreStyle = useCallback(
    (patch: Partial<SeparatorStyle>) =>
      setConfig((c) => ({ ...c, separatoreStyle: { ...c.separatoreStyle, ...patch } })),
    []
  );

  const setHeaderStyle = useCallback(
    (patch: Partial<PageHeaderStyle>) =>
      setConfig((c) => ({ ...c, headerStyle: { ...c.headerStyle, ...patch } })),
    []
  );

  const setFooterStyle = useCallback(
    (patch: Partial<PageFooterStyle>) =>
      setConfig((c) => ({ ...c, footerStyle: { ...c.footerStyle, ...patch } })),
    []
  );

  const setCardBoxStyle = useCallback(
    (patch: Partial<CardBoxStyle>) =>
      setConfig((c) => ({ ...c, cardBoxStyle: { ...c.cardBoxStyle, ...patch } })),
    []
  );

  const setCopertinaTypo = useCallback(
    (patch: Partial<CoverTypography>) =>
      setConfig((c) => ({ ...c, copertinaTypo: { ...c.copertinaTypo, ...patch } })),
    []
  );

  const setPaginaFinaleTypo = useCallback(
    (patch: Partial<FinalPageTypography>) =>
      setConfig((c) => ({ ...c, paginaFinaleTypo: { ...c.paginaFinaleTypo, ...patch } })),
    []
  );

  const setSezioniPersonalizzate = useCallback(
    (sezioni: CustomSection[]) =>
      setConfig((c) => ({ ...c, sezioniPersonalizzate: sezioni })),
    []
  );

  // ── Image upload handlers ──────────────────────────────────────────────────

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 2 MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCopertina('immagineBase64', dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo troppo grande (max 5 MB)');
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCopertina('logoCustomBase64', dataUrl);
    };
    reader.readAsDataURL(file);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handlePreview() {
    setIsPreviewing(true);
    setPreview(null);
    try {
      // Pass colonne/righe to preview so it can compute the right page count
      const res = await fetch('/api/admin/catalogo-pdf/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setPreview(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore anteprima');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleGeneraPDF() {
    if (!preview) {
      toast.error("Esegui prima l'anteprima");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/catalogo-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const filter = config.raggruppa || 'completo';
      const a = document.createElement('a');
      a.href = url;
      a.download = `Catalogo-ON-EARTH-${date}-${filter}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF generato con successo');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione PDF');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      toast.error('Inserisci un nome per il template');
      return;
    }
    setIsSaving(true);
    try {
      // Exclude large images from saved config
      const configToSave = {
        ...config,
        copertina: { ...config.copertina, immagineBase64: null, logoCustomBase64: null },
      };
      const trimmedName = templateName.trim();

      // Check if a template with this name already exists
      const existingTemplate = templates.find(t => t.nome === trimmedName);
      if (existingTemplate) {
        const overwrite = confirm(`Esiste già un template di nome "${trimmedName}". Vuoi sovrascriverlo?`);
        if (!overwrite) { setIsSaving(false); return; }
        const res = await fetch(`/api/admin/catalogo-pdf/templates/${existingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configurazione: configToSave }),
        });
        if (!res.ok) throw new Error('Errore aggiornamento');
        toast.success('Template aggiornato');
        setTemplateName('');
        refetchTemplates();
        return;
      }

      const res = await fetch('/api/admin/catalogo-pdf/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: trimmedName, configurazione: configToSave }),
      });
      if (!res.ok) throw new Error('Errore salvataggio');
      toast.success('Configurazione salvata');
      setTemplateName('');
      refetchTemplates();
    } catch {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  }

  function handleLoadTemplate(t: Template) {
    setConfig(t.configurazione);
    setPreview(null);
    toast.success(`Template "${t.nome}" caricato`);
  }

  async function handleDeleteTemplate(id: string, nome: string) {
    if (!confirm(`Eliminare il template "${nome}"?`)) return;
    try {
      const res = await fetch(`/api/admin/catalogo-pdf/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Template eliminato');
      refetchTemplates();
    } catch {
      toast.error('Errore eliminazione template');
    }
  }

  async function handleRenameTemplate(id: string, nomeAttuale: string) {
    const nuovoNome = window.prompt('Nuovo nome:', nomeAttuale);
    if (!nuovoNome || nuovoNome === nomeAttuale) return;
    const res = await fetch(`/api/admin/catalogo-pdf/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nuovoNome }),
    });
    if (res.ok) { toast.success('Rinominato'); refetchTemplates(); }
    else toast.error('Errore rinomina');
  }

  async function handleDuplicateTemplate(t: Template) {
    const res = await fetch('/api/admin/catalogo-pdf/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: t.id, nome: 'Copia di ' + t.nome }),
    });
    if (res.ok) { toast.success('Duplicato'); refetchTemplates(); }
    else toast.error('Errore duplica');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Left: form */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={20} className="text-accent" />
          <div>
            <h1 className="text-lg font-bold text-primary">Generatore Catalogo PDF</h1>
            <p className="text-xs text-gray-500">Configura e scarica il catalogo prodotti in formato PDF</p>
          </div>
        </div>

        {/* ── Filtri ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.filtri} onToggle={() => toggleSection('filtri')}>
            Filtri prodotti
          </SectionTitle>
          {sections.filtri && (
            <div className="p-4 grid grid-cols-2 gap-3">
              <SelectField label="Gruppo merceologico" value={config.gruppoMerceologico}
                onChange={(v) => set('gruppoMerceologico', v)} options={gruppiMerceologici} />
              <SelectField label="Famiglia" value={config.famiglia}
                onChange={(v) => set('famiglia', v)} options={famiglie} />
              <SelectField label="Classe" value={config.classe}
                onChange={(v) => set('classe', v)} options={classi} />
              <SelectField label="Sottoclasse" value={config.sottoclasse}
                onChange={(v) => set('sottoclasse', v)} options={sottoclassi} />
              <SelectField label="Gruppo omogeneo" value={config.gruppoOmogeneo}
                onChange={(v) => set('gruppoOmogeneo', v)} options={gruppiOmogenei} />
              <SelectField label="Linea" value={config.nomLinea}
                onChange={(v) => set('nomLinea', v)} options={linee} />
              <SelectField label="Collezione" value={config.collezione}
                onChange={(v) => set('collezione', v)} options={collezioni} />
              <SelectField label="Colore" value={config.colore}
                onChange={(v) => set('colore', v)} options={colori} />
              <SelectField label="Produttore" value={config.produttore}
                onChange={(v) => set('produttore', v)} options={produttori} />
              <SelectField label="Tranche" value={config.tranche}
                onChange={(v) => set('tranche', v)} options={tranches} />
              <div className="col-span-2 pt-1">
                <CheckboxField
                  label="Solo prodotti attivi"
                  checked={config.soloAttivi}
                  onChange={(v) => set('soloAttivi', v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Formato pagina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.formato} onToggle={() => toggleSection('formato')}>
            Formato pagina
          </SectionTitle>
          {sections.formato && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Formato</label>
                  <select
                    value={config.formato}
                    onChange={(e) => set('formato', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="A4-P">A4 Verticale</option>
                    <option value="A4-L">A4 Orizzontale</option>
                    <option value="A3-P">A3 Verticale</option>
                    <option value="A3-L">A3 Orizzontale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Margini</label>
                  <select
                    value={config.margine}
                    onChange={(e) => set('margine', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="stretto">Stretto (10 pt)</option>
                    <option value="normale">Normale (20 pt)</option>
                    <option value="ampio">Ampio (30 pt)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Colonne</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={config.colonne}
                    onChange={(e) => set('colonne', Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Righe</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={config.righe}
                    onChange={(e) => set('righe', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="pb-0.5">
                  <p className="text-xs text-gray-500 font-medium">
                    = <span className="text-primary font-bold">{config.colonne * config.righe}</span> prodotti/pagina
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Stile e colori ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.colori} onToggle={() => toggleSection('colori')}>
            Stile e colori
          </SectionTitle>
          {sections.colori && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorSwatchPicker
                label="Sfondo pagina"
                value={config.colori.sfondoPagina}
                onChange={(v) => setColore('sfondoPagina', v)}
              />
              <ColorSwatchPicker
                label="Sfondo foto"
                value={config.colori.sfondoFoto}
                onChange={(v) => setColore('sfondoFoto', v)}
              />
              <ColorSwatchPicker
                label="Testo primario"
                value={config.colori.testoPrimario}
                onChange={(v) => setColore('testoPrimario', v)}
              />
              <ColorSwatchPicker
                label="Testo secondario"
                value={config.colori.testoSecondario}
                onChange={(v) => setColore('testoSecondario', v)}
              />
            </div>
          )}
        </div>

        {/* ── Raggruppamento e ordinamento ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.raggruppamento} onToggle={() => toggleSection('raggruppamento')}>
            Raggruppamento e ordinamento
          </SectionTitle>
          {sections.raggruppamento && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Raggruppa per</label>
                  <select
                    value={config.raggruppa}
                    onChange={(e) => set('raggruppa', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="">Nessun raggruppamento</option>
                    <option value="nomLinea">Linea</option>
                    <option value="classe">Classe</option>
                    <option value="sottoclasse">Sottoclasse</option>
                    <option value="famiglia">Famiglia</option>
                    <option value="gruppoOmogeneo">Gruppo omogeneo</option>
                    <option value="collezione">Collezione</option>
                    <option value="produttore">Produttore</option>
                    <option value="paese">Paese</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ordina per</label>
                  <select
                    value={config.ordina}
                    onChange={(e) => set('ordina', e.target.value)}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="code">Codice A→Z</option>
                    <option value="name">Descrizione A→Z</option>
                    <option value="costPrice_asc">Prezzo crescente</option>
                    <option value="costPrice_desc">Prezzo decrescente</option>
                    <option value="nomLinea">Linea</option>
                    <option value="collezione">Collezione</option>
                  </select>
                </div>
              </div>

              {/* Separator mode — shown only when grouping is active */}
              {config.raggruppa && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Modalità raggruppamento</p>
                  <div className="space-y-2">
                    {(
                      [
                        { value: 'pagina-intera', label: 'Pagina intera per sezione', desc: 'Ogni gruppo ha una pagina separatore dedicata' },
                        { value: 'inline', label: 'Intestazione inline', desc: 'Intestazione compatta, tutti i gruppi sulla stessa pagina' },
                        { value: 'nuova-riga', label: 'Vai a capo, stessa pagina', desc: 'Intestazione prominente con linea, tutti sulla stessa pagina' },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-start gap-2 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="modalitaSeparatore"
                          value={opt.value}
                          checked={config.modalitaSeparatore === opt.value}
                          onChange={() => set('modalitaSeparatore', opt.value)}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <span className="text-xs font-medium text-gray-700 group-hover:text-primary transition-colors">
                            {opt.label}
                          </span>
                          <p className="text-2xs text-gray-400">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Stile separatori sezioni ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.separatoreStile} onToggle={() => toggleSection('separatoreStile')}>
            Stile separatori sezioni
          </SectionTitle>
          {sections.separatoreStile && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione font (pt)</label>
                  <input type="number" min={8} max={40} value={config.separatoreStyle.fontSize}
                    onChange={(e) => setSeparatoreStyle({ fontSize: parseFloat(e.target.value) || 16 })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Altezza (pt)</label>
                  <input type="number" min={20} max={120} value={config.separatoreStyle.height}
                    onChange={(e) => setSeparatoreStyle({ height: parseInt(e.target.value) || 36 })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 w-20">Stile testo</span>
                <ToggleBtn active={config.separatoreStyle.bold} onClick={() => setSeparatoreStyle({ bold: !config.separatoreStyle.bold })}><span className="font-bold">B</span></ToggleBtn>
                <ToggleBtn active={config.separatoreStyle.italic} onClick={() => setSeparatoreStyle({ italic: !config.separatoreStyle.italic })}><span className="italic">I</span></ToggleBtn>
                <ToggleBtn active={config.separatoreStyle.uppercase} onClick={() => setSeparatoreStyle({ uppercase: !config.separatoreStyle.uppercase })} title="Tutto maiuscolo">AA</ToggleBtn>
                <AlignToggle value={config.separatoreStyle.align} onChange={(v) => setSeparatoreStyle({ align: v })} />
              </div>
              <ColorSwatchPicker label="Colore testo" value={config.separatoreStyle.color}
                onChange={(v) => setSeparatoreStyle({ color: v })} />
              <ColorSwatchPicker label="Colore sfondo" value={config.separatoreStyle.bgColor}
                onChange={(v) => setSeparatoreStyle({ bgColor: v })} />
            </div>
          )}
        </div>

        {/* ── Informazioni da mostrare ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.campi} onToggle={() => toggleSection('campi')}>
            Informazioni da mostrare
          </SectionTitle>
          {sections.campi && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CheckboxField label="Foto prodotto" checked={config.campi.foto} onChange={(v) => setField('foto', v)} />
              <CheckboxField label="Codice" checked={config.campi.codice} onChange={(v) => setField('codice', v)} />
              <CheckboxField label="Descrizione" checked={config.campi.descrizione} onChange={(v) => setField('descrizione', v)} />
              <CheckboxField label="Misure" checked={config.campi.misure} onChange={(v) => setField('misure', v)} />
              <CheckboxField label="Produttore" checked={config.campi.produttore} onChange={(v) => setField('produttore', v)} />
              <CheckboxField label="Paese" checked={config.campi.paese} onChange={(v) => setField('paese', v)} />
              <CheckboxField label="Prezzo costo i.e." checked={config.campi.prezzoCosto} onChange={(v) => setField('prezzoCosto', v)} />
              <CheckboxField label="PVP i.i." checked={config.campi.pvp} onChange={(v) => setField('pvp', v)} />
              <CheckboxField label="Linea" checked={config.campi.linea} onChange={(v) => setField('linea', v)} />
              <CheckboxField label="Collezione" checked={config.campi.collezione} onChange={(v) => setField('collezione', v)} />
              <CheckboxField label="Confezione" checked={config.campi.confezione} onChange={(v) => setField('confezione', v)} />
              <CheckboxField label="IVA" checked={config.campi.iva} onChange={(v) => setField('iva', v)} />
            </div>
          )}
        </div>

        {/* ── Tipografia campi scheda ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.campiStile} onToggle={() => toggleSection('campiStile')}>
            Tipografia campi scheda
          </SectionTitle>
          {sections.campiStile && (
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="divide-y divide-border/50">
                  {config.campi.codice && (
                    <FieldStyleRow label="Codice" value={config.cardFieldStyles.codice}
                      onChange={(fs) => setCardFieldStyle('codice', fs)} />
                  )}
                  {config.campi.descrizione && (
                    <FieldStyleRow label="Descrizione" value={config.cardFieldStyles.descrizione}
                      onChange={(fs) => setCardFieldStyle('descrizione', fs)} />
                  )}
                  {(config.campi.misure || config.campi.produttore || config.campi.paese ||
                    config.campi.linea || config.campi.collezione || config.campi.confezione || config.campi.iva) && (
                    <FieldStyleRow label="Dettagli (misure, produttore, paese…)" value={config.cardFieldStyles.misure}
                      onChange={(fs) => setCardFieldStyle('misure', fs)} />
                  )}
                  {config.campi.prezzoCosto && (
                    <FieldStyleRow label="Prezzo costo" value={config.cardFieldStyles.prezzoCosto}
                      onChange={(fs) => setCardFieldStyle('prezzoCosto', fs)} />
                  )}
                  {config.campi.pvp && (
                    <FieldStyleRow label="PVP" value={config.cardFieldStyles.pvp}
                      onChange={(fs) => setCardFieldStyle('pvp', fs)} />
                  )}
                </div>
                <div className="flex justify-center sm:justify-start">
                  <CardPreview config={config} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Riquadro prodotto ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.riquadro} onToggle={() => toggleSection('riquadro')}>
            Riquadro prodotto
          </SectionTitle>
          {sections.riquadro && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bordo</label>
                  <select value={config.cardBoxStyle.borderWidth}
                    onChange={(e) => setCardBoxStyle({ borderWidth: parseFloat(e.target.value) })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                    <option value="0">Nessuno</option>
                    <option value="0.5">Sottile (0.5)</option>
                    <option value="1">Normale (1)</option>
                    <option value="2">Spesso (2)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Angoli</label>
                  <select value={config.cardBoxStyle.borderRadius}
                    onChange={(e) => setCardBoxStyle({ borderRadius: parseInt(e.target.value) })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                    <option value="0">Nessuno</option>
                    <option value="4">Arrotondati</option>
                    <option value="8">Molto arrotondati</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Padding interno</label>
                  <select value={config.cardBoxStyle.padding}
                    onChange={(e) => setCardBoxStyle({ padding: parseInt(e.target.value) })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none">
                    <option value="2">Stretto (2)</option>
                    <option value="4">Normale (4)</option>
                    <option value="6">Ampio (6)</option>
                    <option value="8">Molto ampio (8)</option>
                  </select>
                </div>
              </div>
              {config.cardBoxStyle.borderWidth > 0 && (
                <ColorSwatchPicker label="Colore bordo" value={config.cardBoxStyle.borderColor}
                  onChange={(v) => setCardBoxStyle({ borderColor: v })} />
              )}
            </div>
          )}
        </div>

        {/* ── Intestazione ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.intestazione} onToggle={() => toggleSection('intestazione')}>
            Intestazione catalogo
          </SectionTitle>
          {sections.intestazione && (
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titolo catalogo</label>
                <input
                  type="text"
                  value={config.titolo}
                  onChange={(e) => set('titolo', e.target.value)}
                  className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="es. Collezione CASA 2027"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <CheckboxField label="Mostra logo ON EARTH" checked={config.mostraLogo} onChange={(v) => set('mostraLogo', v)} />
                <CheckboxField label="Mostra data generazione" checked={config.mostraData} onChange={(v) => set('mostraData', v)} />
                <CheckboxField label="Numero di pagina" checked={config.mostraPagina} onChange={(v) => set('mostraPagina', v)} />
              </div>
            </div>
          )}
        </div>

        {/* ── Stile intestazione pagina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.headerStile} onToggle={() => toggleSection('headerStile')}>
            Stile intestazione pagina
          </SectionTitle>
          {sections.headerStile && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione font (pt)</label>
                  <input type="number" min={5} max={20} value={config.headerStyle.titleFontSize}
                    onChange={(e) => setHeaderStyle({ titleFontSize: parseFloat(e.target.value) || 8 })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                </div>
                <div className="flex items-end gap-1.5">
                  <ToggleBtn active={config.headerStyle.titleBold} onClick={() => setHeaderStyle({ titleBold: !config.headerStyle.titleBold })}><span className="font-bold">B</span></ToggleBtn>
                  <ToggleBtn active={config.headerStyle.titleItalic} onClick={() => setHeaderStyle({ titleItalic: !config.headerStyle.titleItalic })}><span className="italic">I</span></ToggleBtn>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-24">Allineamento</span>
                <AlignToggle value={config.headerStyle.titleAlign} onChange={(v) => setHeaderStyle({ titleAlign: v })} />
              </div>
              <ColorSwatchPicker label="Colore titolo" value={config.headerStyle.titleColor}
                onChange={(v) => setHeaderStyle({ titleColor: v })} />
              <CheckboxField label="Mostra linea separatrice" checked={config.headerStyle.showSeparator}
                onChange={(v) => setHeaderStyle({ showSeparator: v })} />
              {config.headerStyle.showSeparator && (
                <ColorSwatchPicker label="Colore linea" value={config.headerStyle.separatorColor}
                  onChange={(v) => setHeaderStyle({ separatorColor: v })} />
              )}
            </div>
          )}
        </div>

        {/* ── Stile piè di pagina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.footerStile} onToggle={() => toggleSection('footerStile')}>
            Stile piè di pagina
          </SectionTitle>
          {sections.footerStile && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione font (pt)</label>
                  <input type="number" min={5} max={12} value={config.footerStyle.fontSize}
                    onChange={(e) => setFooterStyle({ fontSize: parseFloat(e.target.value) || 6.5 })}
                    className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white focus:outline-none" />
                </div>
                <div className="flex items-end">
                  <AlignToggle value={config.footerStyle.align} onChange={(v) => setFooterStyle({ align: v })} />
                </div>
              </div>
              <ColorSwatchPicker label="Colore testo" value={config.footerStyle.color}
                onChange={(v) => setFooterStyle({ color: v })} />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Testo personalizzato <span className="text-gray-400 font-normal">(opzionale)</span>
                </label>
                <input type="text" value={config.footerStyle.customText}
                  onChange={(e) => setFooterStyle({ customText: e.target.value })}
                  placeholder="es. ON EARTH — Catalogo riservato"
                  className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30" />
                <p className="text-2xs text-gray-400 mt-1">Verrà mostrato prima del numero pagina</p>
              </div>
              <CheckboxField label="Mostra linea separatrice" checked={config.footerStyle.showSeparator}
                onChange={(v) => setFooterStyle({ showSeparator: v })} />
            </div>
          )}
        </div>

        {/* ── Copertina ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.copertina} onToggle={() => toggleSection('copertina')}>
            Copertina
          </SectionTitle>
          {sections.copertina && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Includi copertina"
                checked={config.copertina.attiva}
                onChange={(v) => setCopertina('attiva', v)}
              />
              {config.copertina.attiva && (
                <div className="space-y-4 pl-2 border-l-2 border-border">
                  {/* Image upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Immagine di copertina (max 2 MB)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                    {config.copertina.immagineBase64 && (
                      <div className="mt-2 flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={config.copertina.immagineBase64}
                          alt="Anteprima copertina"
                          className="h-16 w-24 object-cover rounded border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCopertina('immagineBase64', null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-2xs text-red-500 hover:text-red-700 underline"
                        >
                          Rimuovi immagine
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Layout */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Layout copertina</label>
                    <select
                      value={config.copertina.layout}
                      onChange={(e) => setCopertina('layout', e.target.value)}
                      className="w-full h-9 border border-border rounded px-2.5 text-xs bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="full-overlay">Immagine piena con testo sovrapposto</option>
                      <option value="half">Metà immagine, metà testo</option>
                      <option value="solo-testo">Solo testo (nessuna immagine)</option>
                    </select>
                  </div>

                  {/* ITEM 3C: Image position/scale/opacity controls */}
                  {config.copertina.layout !== 'solo-testo' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-gray-600">Posizione e scala immagine</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Offset X (%)</label>
                          <input type="range" min={-50} max={50} value={config.copertina.imgOffsetX ?? 0}
                            onChange={(e) => setCopertina('imgOffsetX', parseInt(e.target.value))}
                            className="w-full" />
                          <span className="text-2xs text-gray-400">{config.copertina.imgOffsetX ?? 0}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Offset Y (%)</label>
                          <input type="range" min={-50} max={50} value={config.copertina.imgOffsetY ?? 0}
                            onChange={(e) => setCopertina('imgOffsetY', parseInt(e.target.value))}
                            className="w-full" />
                          <span className="text-2xs text-gray-400">{config.copertina.imgOffsetY ?? 0}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Scala (%)</label>
                          <input type="range" min={50} max={200} value={config.copertina.imgScale ?? 100}
                            onChange={(e) => setCopertina('imgScale', parseInt(e.target.value))}
                            className="w-full" />
                          <span className="text-2xs text-gray-400">{config.copertina.imgScale ?? 100}%</span>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Opacità (%)</label>
                          <input type="range" min={10} max={100} value={config.copertina.imgOpacity ?? 100}
                            onChange={(e) => setCopertina('imgOpacity', parseInt(e.target.value))}
                            className="w-full" />
                          <span className="text-2xs text-gray-400">{config.copertina.imgOpacity ?? 100}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logo */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">Logo in copertina</p>
                    {(
                      [
                        { value: 'onearth', label: 'Logo ON EARTH (automatico)' },
                        { value: 'custom', label: 'Carica logo personalizzato' },
                        { value: 'none', label: 'Nessun logo' },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="logoTipo"
                          value={opt.value}
                          checked={config.copertina.logoTipo === opt.value}
                          onChange={() => setCopertina('logoTipo', opt.value)}
                          className="accent-primary"
                        />
                        <span className="text-xs text-gray-700">{opt.label}</span>
                      </label>
                    ))}

                    {config.copertina.logoTipo === 'custom' && (
                      <div className="pl-5 space-y-2">
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          onChange={handleLogoUpload}
                          className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />
                        {config.copertina.logoCustomBase64 && (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={config.copertina.logoCustomBase64} alt="Logo" className="h-8 object-contain border border-border rounded bg-white px-2" />
                            <button type="button" onClick={() => { setCopertina('logoCustomBase64', null); if (logoFileInputRef.current) logoFileInputRef.current.value = ''; }} className="text-2xs text-red-500 hover:text-red-700 underline">Rimuovi</button>
                          </div>
                        )}
                      </div>
                    )}

                    {config.copertina.logoTipo !== 'none' && (
                      <div className="grid grid-cols-2 gap-3 pl-5">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Logo X</label>
                          <select
                            value={config.copertina.logoPosX ?? 'left'}
                            onChange={(e) => setCopertina('logoPosX', e.target.value)}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white text-gray-800 focus:outline-none"
                          >
                            <option value="left">Sinistra</option>
                            <option value="center">Centro</option>
                            <option value="right">Destra</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Logo Y</label>
                          <select
                            value={config.copertina.logoPosY ?? 'top'}
                            onChange={(e) => setCopertina('logoPosY', e.target.value)}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white text-gray-800 focus:outline-none"
                          >
                            <option value="top">In alto</option>
                            <option value="middle">A metà</option>
                            <option value="bottom">In basso</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Dimensione</label>
                          <select
                            value={config.copertina.logoDimensione}
                            onChange={(e) => setCopertina('logoDimensione', e.target.value)}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white text-gray-800 focus:outline-none"
                          >
                            <option value="piccolo">Piccolo</option>
                            <option value="medio">Medio</option>
                            <option value="grande">Grande</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Titolo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">Titolo copertina</label>
                      <AlignToggle value={config.copertina.titoloAllineamento} onChange={(v) => setCopertina('titoloAllineamento', v)} />
                    </div>
                    <input
                      type="text"
                      value={config.copertina.titolo}
                      onChange={(e) => setCopertina('titolo', e.target.value)}
                      className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="es. Collezione CASA 2027"
                    />
                  </div>

                  {/* Sottotitolo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">
                        Sottotitolo <span className="text-gray-400 font-normal">(opzionale)</span>
                      </label>
                      <AlignToggle value={config.copertina.sottotitoloAllineamento} onChange={(v) => setCopertina('sottotitoloAllineamento', v)} />
                    </div>
                    <input
                      type="text"
                      value={config.copertina.sottotitolo}
                      onChange={(e) => setCopertina('sottotitolo', e.target.value)}
                      className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="es. Primavera / Estate 2027"
                    />
                  </div>

                  {/* Tipografia copertina */}
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-semibold text-gray-600">Tipografia</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Font titolo (pt)</label>
                        <input type="number" min={10} max={60} value={config.copertinaTypo.titoloFontSize}
                          onChange={(e) => setCopertinaTypo({ titoloFontSize: parseFloat(e.target.value) || 28 })}
                          className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none" />
                      </div>
                      <div className="flex items-end gap-1">
                        <ToggleBtn active={config.copertinaTypo.titoloBold} onClick={() => setCopertinaTypo({ titoloBold: !config.copertinaTypo.titoloBold })}><span className="font-bold">B</span></ToggleBtn>
                        <ToggleBtn active={config.copertinaTypo.titoloItalic} onClick={() => setCopertinaTypo({ titoloItalic: !config.copertinaTypo.titoloItalic })}><span className="italic">I</span></ToggleBtn>
                        <ToggleBtn active={config.copertinaTypo.titoloUppercase} onClick={() => setCopertinaTypo({ titoloUppercase: !config.copertinaTypo.titoloUppercase })} title="Tutto maiuscolo">AA</ToggleBtn>
                      </div>
                    </div>
                    <MiniColorPicker value={config.copertinaTypo.titoloColor}
                      onChange={(v) => setCopertinaTypo({ titoloColor: v })} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Font sottotitolo (pt)</label>
                        <input type="number" min={8} max={32} value={config.copertinaTypo.sottotitoloFontSize}
                          onChange={(e) => setCopertinaTypo({ sottotitoloFontSize: parseFloat(e.target.value) || 13 })}
                          className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none" />
                      </div>
                      <div className="flex items-end gap-1">
                        <ToggleBtn active={config.copertinaTypo.sottotitoloBold} onClick={() => setCopertinaTypo({ sottotitoloBold: !config.copertinaTypo.sottotitoloBold })}><span className="font-bold">B</span></ToggleBtn>
                        <ToggleBtn active={config.copertinaTypo.sottotitoloItalic} onClick={() => setCopertinaTypo({ sottotitoloItalic: !config.copertinaTypo.sottotitoloItalic })}><span className="italic">I</span></ToggleBtn>
                      </div>
                    </div>
                    <MiniColorPicker value={config.copertinaTypo.sottotitoloColor}
                      onChange={(v) => setCopertinaTypo({ sottotitoloColor: v })} />
                    {config.copertina.layout !== 'full-overlay' && (
                      <ColorSwatchPicker label="Colore sfondo (layout testo / metà)" value={config.copertinaTypo.bgColor}
                        onChange={(v) => setCopertinaTypo({ bgColor: v })} />
                    )}
                  </div>

                  {/* Preview */}
                  <CoverPreview config={config} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Pagina finale ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.paginaFinale} onToggle={() => toggleSection('paginaFinale')}>
            Pagina finale
          </SectionTitle>
          {sections.paginaFinale && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Includi pagina finale"
                checked={config.paginaFinale.attiva}
                onChange={(v) => setPaginaFinale('attiva', v)}
              />
              {config.paginaFinale.attiva && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  {/* Titolo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">
                        Titolo pagina <span className="text-gray-400 font-normal">(opzionale)</span>
                      </label>
                      <AlignToggle value={config.paginaFinale.titoloAllineamento} onChange={(v) => setPaginaFinale('titoloAllineamento', v)} />
                    </div>
                    <input
                      type="text"
                      value={config.paginaFinale.titolo}
                      onChange={(e) => setPaginaFinale('titolo', e.target.value)}
                      className="w-full h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="es. Grazie per la tua scelta"
                    />
                  </div>

                  {/* Testo libero */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">
                        Testo libero{' '}
                        <span className="text-gray-400 font-normal">({config.paginaFinale.testo.length}/1000)</span>
                      </label>
                      <AlignToggle value={config.paginaFinale.testoAllineamento} onChange={(v) => setPaginaFinale('testoAllineamento', v)} />
                    </div>
                    <textarea
                      value={config.paginaFinale.testo}
                      onChange={(e) => setPaginaFinale('testo', e.target.value.slice(0, 1000))}
                      rows={4}
                      className="w-full border border-border rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                      placeholder="Testo da mostrare nella pagina finale del catalogo…"
                    />
                  </div>

                  {/* Tipografia pagina finale */}
                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-semibold text-gray-600">Tipografia</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Font titolo (pt)</label>
                        <input type="number" min={10} max={48} value={config.paginaFinaleTypo.titoloFontSize}
                          onChange={(e) => setPaginaFinaleTypo({ titoloFontSize: parseFloat(e.target.value) || 20 })}
                          className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none" />
                      </div>
                      <div className="flex items-end gap-1">
                        <ToggleBtn active={config.paginaFinaleTypo.titoloBold} onClick={() => setPaginaFinaleTypo({ titoloBold: !config.paginaFinaleTypo.titoloBold })}><span className="font-bold">B</span></ToggleBtn>
                        <ToggleBtn active={config.paginaFinaleTypo.titoloItalic} onClick={() => setPaginaFinaleTypo({ titoloItalic: !config.paginaFinaleTypo.titoloItalic })}><span className="italic">I</span></ToggleBtn>
                      </div>
                    </div>
                    <MiniColorPicker value={config.paginaFinaleTypo.titoloColor}
                      onChange={(v) => setPaginaFinaleTypo({ titoloColor: v })} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Font testo corpo (pt)</label>
                        <input type="number" min={6} max={24} value={config.paginaFinaleTypo.testoFontSize}
                          onChange={(e) => setPaginaFinaleTypo({ testoFontSize: parseFloat(e.target.value) || 10 })}
                          className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none" />
                      </div>
                    </div>
                    <MiniColorPicker value={config.paginaFinaleTypo.testoColor}
                      onChange={(v) => setPaginaFinaleTypo({ testoColor: v })} />
                    <p className="text-2xs text-gray-400">Usa **testo** per grassetto e *testo* per corsivo nel campo testo libero</p>
                  </div>

                  {/* Logo */}
                  <CheckboxField
                    label="Logo ON EARTH in fondo"
                    checked={config.paginaFinale.mostraLogo}
                    onChange={(v) => setPaginaFinale('mostraLogo', v)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Struttura sezioni personalizzata ── */}
        <div className="border border-border rounded overflow-hidden">
          <SectionTitle open={sections.sezioniPersonalizzate} onToggle={() => toggleSection('sezioniPersonalizzate')}>
            Struttura sezioni personalizzata
          </SectionTitle>
          {sections.sezioniPersonalizzate && (
            <div className="p-4 space-y-4">
              <CheckboxField
                label="Usa struttura sezioni personalizzata"
                checked={config.useSezioniPersonalizzate}
                onChange={(v) => set('useSezioniPersonalizzate', v)}
              />
              {config.useSezioniPersonalizzate && (
                <div className="space-y-3 pl-2 border-l-2 border-border">
                  {/* DnD list of sections */}
                  {config.sezioniPersonalizzate.length > 0 && (
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const oldIdx = config.sezioniPersonalizzate.findIndex(s => s.id === active.id);
                        const newIdx = config.sezioniPersonalizzate.findIndex(s => s.id === over.id);
                        setSezioniPersonalizzate(arrayMove(config.sezioniPersonalizzate, oldIdx, newIdx));
                      }}
                    >
                      <SortableContext items={config.sezioniPersonalizzate.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {config.sezioniPersonalizzate.map((sezione, idx) => (
                            <SortableSection
                              key={sezione.id}
                              sezione={sezione}
                              index={idx}
                              onEdit={() => setEditingSection(sezione)}
                              onDelete={() => setSezioniPersonalizzate(config.sezioniPersonalizzate.filter(s => s.id !== sezione.id))}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Add section button */}
                  <button
                    type="button"
                    onClick={() => setEditingSection({ id: crypto.randomUUID(), isNew: true, ...EMPTY_SECTION })}
                    className="w-full h-8 border border-dashed border-border rounded text-xs text-gray-500 hover:border-primary hover:text-primary transition-colors"
                  >
                    + Nuova sezione
                  </button>

                  {/* Section editor */}
                  {editingSection && (
                    <div className="border border-primary/20 rounded p-3 space-y-3 bg-primary/5">
                      <p className="text-xs font-semibold text-primary">{editingSection.isNew ? 'Nuova sezione' : `Modifica: ${editingSection.nome}`}</p>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nome sezione *</label>
                        <input
                          type="text"
                          value={editingSection.nome}
                          onChange={(e) => setEditingSection({ ...editingSection, nome: e.target.value })}
                          className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none"
                          placeholder="es. Cucina, Bagno, Outdoor…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione <span className="text-gray-400 font-normal">(opzionale)</span></label>
                        <input
                          type="text"
                          value={editingSection.descrizione ?? ''}
                          onChange={(e) => setEditingSection({ ...editingSection, descrizione: e.target.value })}
                          className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Criteri (OR — basta uno)</p>
                        <div className="space-y-2">
                          <MultiSelectCriteria label="Classe" options={classi} selected={editingSection.criteri.classe}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, classe: v } })} />
                          <MultiSelectCriteria label="Sottoclasse" options={sottoclassi} selected={editingSection.criteri.sottoclasse}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, sottoclasse: v } })} />
                          <MultiSelectCriteria label="Famiglia" options={famiglie} selected={editingSection.criteri.famiglia}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, famiglia: v } })} />
                          <MultiSelectCriteria label="Gruppo omogeneo" options={gruppiOmogenei} selected={editingSection.criteri.gruppoOmogeneo}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, gruppoOmogeneo: v } })} />
                          <MultiSelectCriteria label="Linea" options={linee} selected={editingSection.criteri.nomLinea}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, nomLinea: v } })} />
                          <MultiSelectCriteria label="Colore" options={colori} selected={editingSection.criteri.colore}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, colore: v } })} />
                          <MultiSelectCriteria label="Produttore" options={produttori} selected={editingSection.criteri.produttore}
                            onChange={(v) => setEditingSection({ ...editingSection, criteri: { ...editingSection.criteri, produttore: v } })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Ordinamento</label>
                          <select
                            value={editingSection.ordinamento}
                            onChange={(e) => setEditingSection({ ...editingSection, ordinamento: e.target.value as CustomSection['ordinamento'] })}
                            className="w-full h-8 border border-border rounded px-2 text-xs bg-white focus:outline-none"
                          >
                            <option value="code">Codice A→Z</option>
                            <option value="name">Descrizione A→Z</option>
                            <option value="costPrice_asc">Prezzo crescente</option>
                            <option value="costPrice_desc">Prezzo decrescente</option>
                            <option value="nomLinea">Linea</option>
                          </select>
                        </div>
                        <div className="flex items-end pb-0.5">
                          <CheckboxField
                            label="Mostra sottosezioni"
                            checked={editingSection.mostraSottosezioni}
                            onChange={(v) => setEditingSection({ ...editingSection, mostraSottosezioni: v })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={!editingSection.nome.trim()}
                          onClick={() => {
                            if (!editingSection.nome.trim()) return;
                            const { isNew, ...sez } = editingSection;
                            if (isNew) {
                              setSezioniPersonalizzate([...config.sezioniPersonalizzate, sez]);
                            } else {
                              setSezioniPersonalizzate(config.sezioniPersonalizzate.map(s => s.id === sez.id ? sez : s));
                            }
                            setEditingSection(null);
                          }}
                          className="flex-1 h-8 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          Salva sezione
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSection(null)}
                          className="px-3 h-8 rounded text-xs border border-border text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  )}

                  <CheckboxField
                    label="Includi prodotti non assegnati a nessuna sezione"
                    checked={config.includiProdottiNonAssegnati}
                    onChange={(v) => set('includiProdottiNonAssegnati', v)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Salva configurazione ── */}
        <div className="border border-border rounded p-4 space-y-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-500">Salva configurazione</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nome template (es. Catalogo Linea Braided)"
              className="flex-1 h-9 border border-border rounded px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={isSaving || !templateName.trim()}
              className="flex items-center gap-1.5 px-3 h-9 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Salva
            </button>
          </div>
        </div>
      </div>

      {/* Right: actions + templates */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        {/* Action box */}
        <div className="border border-border rounded p-5 space-y-3 bg-gray-50/50 sticky top-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-500">Generazione</p>

          {/* Preview */}
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewing}
            className="flex items-center justify-center gap-2 w-full h-10 rounded border border-border bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isPreviewing ? (
              <><Loader2 size={13} className="animate-spin" /> Calcolo in corso…</>
            ) : (
              <><Eye size={13} /> Anteprima</>
            )}
          </button>

          {/* Preview result */}
          {preview && (
            <div className="bg-white border border-border rounded px-4 py-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Prodotti trovati</span>
                <span className="font-semibold text-primary">{preview.count}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Pagine prodotti</span>
                <span className="font-semibold text-primary">~{preview.productPages}</span>
              </div>
              {preview.groupPages > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Pagine separatore</span>
                  <span className="font-semibold text-primary">{preview.groupPages}</span>
                </div>
              )}
              <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
                <span className="text-gray-500 font-medium">Totale pagine stimate</span>
                <span className="font-bold text-primary">{preview.pages}</span>
              </div>
              {preview.count === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Nessun prodotto corrisponde ai filtri selezionati
                </p>
              )}
            </div>
          )}

          {/* Generate PDF */}
          <button
            type="button"
            onClick={handleGeneraPDF}
            disabled={isGenerating || !preview || preview.count === 0}
            className="flex items-center justify-center gap-2 w-full h-10 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <><Loader2 size={13} className="animate-spin" /> Generazione in corso…</>
            ) : (
              <><Download size={13} /> Genera PDF</>
            )}
          </button>

          {isGenerating && (
            <p className="text-2xs text-gray-400 text-center">
              Elaborazione immagini in corso, potrebbe richiedere alcuni minuti…
            </p>
          )}

          {!preview && (
            <p className="text-2xs text-gray-400 text-center">
              Esegui prima l&apos;anteprima per stimare il numero di pagine
            </p>
          )}
        </div>

        {/* Templates */}
        <div className="border border-border rounded overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTemplates((s) => !s)}
            className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 text-xs font-semibold tracking-widest uppercase text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FolderOpen size={13} />
              Configurazioni salvate
              {templates.length > 0 && (
                <span className="bg-primary text-white text-2xs px-1.5 py-0.5 rounded-full">
                  {templates.length}
                </span>
              )}
            </span>
            {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showTemplates && (
            <div className="divide-y divide-border">
              {templates.length === 0 ? (
                <p className="px-4 py-5 text-xs text-gray-400 text-center">
                  Nessuna configurazione salvata
                </p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="px-4 py-3 hover:bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary truncate">{t.nome}</p>
                        <p className="text-2xs text-gray-400">
                          {new Date(t.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLoadTemplate(t)}
                        title="Carica configurazione"
                        className="flex items-center gap-1 px-2 py-1 text-2xs font-medium border border-border rounded hover:bg-white hover:text-primary transition-colors text-gray-600"
                      >
                        <FolderOpen size={11} />
                        Carica
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id, t.nome)}
                        title="Elimina configurazione"
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleRenameTemplate(t.id, t.nome)}
                        className="text-2xs text-gray-500 hover:text-primary underline"
                      >
                        Rinomina
                      </button>
                      <span className="text-2xs text-gray-300">·</span>
                      <button
                        type="button"
                        onClick={() => handleDuplicateTemplate(t)}
                        className="text-2xs text-gray-500 hover:text-primary underline"
                      >
                        Duplica
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Layout info */}
        <div className="border border-border rounded p-4 bg-blue-50/50">
          <p className="text-2xs font-semibold uppercase tracking-widest text-blue-500 mb-2">Formato PDF</p>
          <ul className="space-y-1 text-2xs text-gray-500">
            <li>• {config.formato === 'A4-P' ? 'A4 verticale (595 × 842 pt)' :
                   config.formato === 'A4-L' ? 'A4 orizzontale (842 × 595 pt)' :
                   config.formato === 'A3-P' ? 'A3 verticale (842 × 1191 pt)' :
                   'A3 orizzontale (1191 × 842 pt)'}</li>
            <li>• {config.colonne} colonne × {config.righe} righe = <strong>{config.colonne * config.righe}</strong> prodotti/pagina</li>
            <li>• Margini {config.margine === 'stretto' ? '10' : config.margine === 'normale' ? '20' : '30'} pt</li>
            <li>• Header con logo, titolo, data</li>
            <li>• Footer con numero pagina</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
