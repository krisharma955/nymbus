import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "gold" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variantStyles = {
      default:
        "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold",
      secondary:
        "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shadow-sm",
      outline:
        "border border-zinc-300 dark:border-zinc-800 bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-black dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-700",
      ghost:
        "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-black dark:hover:text-zinc-100",
      gold:
        "bg-[#B4783E] dark:bg-[#E5B07A] text-white dark:text-zinc-950 font-semibold hover:bg-[#9E6530] dark:hover:bg-[#edd0b0] shadow-sm dark:shadow-[0_0_18px_rgba(229,176,122,0.25)]",
      destructive:
        "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 hover:bg-rose-200 dark:hover:bg-rose-900",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2",
      sm: "h-7 rounded-sm px-2.5 text-[11px]",
      lg: "h-11 rounded-md px-6 text-sm",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
