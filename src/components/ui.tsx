import React from 'react';
import { cn } from '../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  key?: React.Key;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  children,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 shadow-xl shadow-orange-600/20 dark:shadow-orange-950/40',
    secondary: 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90',
    outline: 'border-2 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800',
    ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-600/20 dark:shadow-rose-950/40',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 dark:shadow-emerald-950/40',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px] uppercase tracking-widest',
    md: 'px-4 py-3 sm:px-6 sm:py-3.5 text-[11px] sm:text-xs uppercase tracking-widest',
    lg: 'px-6 py-4 sm:px-8 sm:py-5 text-xs sm:text-sm uppercase tracking-widest',
    icon: 'p-2 sm:p-3',
  };

  return (
    <button
      className={cn(
        'rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  key?: React.Key;
  style?: React.CSSProperties;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900/60 dark:backdrop-blur-xl rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] border border-zinc-200/50 dark:border-zinc-800/80 dark:hover:border-zinc-700/80 transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full bg-zinc-50/50 dark:bg-zinc-900/30 border-2 border-zinc-200/60 dark:border-zinc-800/80 focus:border-zinc-900 dark:focus:border-orange-600 focus:shadow-xl focus:shadow-zinc-200/50 dark:focus:shadow-orange-900/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-bold text-sm dark:text-white',
        className
      )}
      {...props}
    />
  );
}
