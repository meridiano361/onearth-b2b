import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'datetime' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'datetime') {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  if (format === 'long') {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function roundToLot(quantity: number, lotSize: number): number {
  if (lotSize <= 1) return quantity;
  return Math.ceil(quantity / lotSize) * lotSize;
}

export function isValidLotQuantity(quantity: number, lotSize: number): boolean {
  if (lotSize <= 1) return true;
  return quantity % lotSize === 0;
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    MERCE_DA_ORDINARE: 'Da ordinare',
    MERCE_ORDINATA: 'Ordinata',
    MERCE_PARZIALMENTE_PRONTA: 'Parz. pronta',
    MERCE_PRONTA_DA_AVVISARE: 'Pronta - da avvisare',
    MERCE_PRONTA_AVVISATO: 'Pronta - avvisato',
    ESPORTATO: 'Esportato',
  };
  return labels[status] || status;
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    MERCE_DA_ORDINARE: 'bg-gray-100 text-gray-600',
    MERCE_ORDINATA: 'bg-blue-50 text-blue-700',
    MERCE_PARZIALMENTE_PRONTA: 'bg-amber-50 text-amber-700',
    MERCE_PRONTA_DA_AVVISARE: 'bg-green-50 text-green-700',
    MERCE_PRONTA_AVVISATO: 'bg-green-100 text-green-800',
    ESPORTATO: 'bg-purple-50 text-purple-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `OE-${year}${month}-${random}`;
}
