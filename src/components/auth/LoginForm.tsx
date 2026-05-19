'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Inserisci un\'email valida'),
  password: z.string().min(1, 'La password è obbligatoria'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginValues) {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error === 'CredentialsSignin' ? 'Email o password non validi' : result.error);
        return;
      }

      // Get session to determine redirect
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      const role = session?.user?.role ?? '';
      const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'COMMERCIALE', 'MAGAZZINO'];

      if (adminRoles.includes(role)) {
        router.push('/admin');
      } else {
        router.push('/catalog');
      }

      router.refresh();
    } catch {
      toast.error('Si è verificato un errore inatteso. Riprova.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
          Indirizzo Email
        </label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder="tu@azienda.com"
          className="w-full px-4 py-3 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 bg-primary text-background text-sm font-semibold tracking-wide rounded transition-all duration-150 hover:bg-warm-darker disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Accesso in corso...
          </>
        ) : (
          'Accedi'
        )}
      </button>
    </form>
  );
}
