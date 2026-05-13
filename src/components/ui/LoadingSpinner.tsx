import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({
  size = 'md',
  className,
  text,
  fullPage,
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-[1.5px]',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-2',
  };

  const spinner = (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-border border-t-accent animate-spin',
          sizes[size]
        )}
      />
      {text && <p className="text-xs text-gray-400 tracking-wide">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        {spinner}
      </div>
    );
  }

  return spinner;
}
