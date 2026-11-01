import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "gold" | "success" | "warning";
}

export function Badge({
  className = "",
  variant = "default",
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium transition-colors";

  const variants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60",
    secondary: "bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800",
    outline: "text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/80 bg-transparent",
    gold: "bg-[#B4783E]/10 dark:bg-[#E5B07A]/15 text-[#B4783E] dark:text-[#E5B07A] border border-[#B4783E]/25 dark:border-[#E5B07A]/30",
    success: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50",
    warning: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50",
  };

  return (
    <div className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
