import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold tracking-wide transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary: 'bg-primary text-background hover:bg-warm-darker active:bg-near-black',
      secondary: 'bg-cream text-primary border border-border hover:bg-accent/10 active:bg-accent/20',
      ghost: 'bg-transparent text-primary hover:bg-cream active:bg-cream/80',
      danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
      outline: 'bg-transparent text-primary border border-border hover:border-primary active:bg-cream',
    };

    const sizes = {
      xs: 'px-2.5 py-1 text-xs rounded-sm tracking-wide',
      sm: 'px-3 py-1.5 text-xs rounded tracking-wide',
      md: 'px-4 py-2.5 text-sm rounded tracking-wide',
      lg: 'px-6 py-3 text-sm rounded tracking-wider uppercase',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
