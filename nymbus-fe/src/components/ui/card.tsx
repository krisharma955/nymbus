import * as React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0E1015]/90 text-zinc-900 dark:text-zinc-100 shadow-lg dark:shadow-xl backdrop-blur-sm transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700/80 ${className}`}
      {...props}
    />
  );
}

export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col space-y-1.5 p-5 ${className}`} {...props} />
  );
}

export function CardTitle({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`font-semibold leading-none tracking-tight text-zinc-950 dark:text-white ${className}`}
      {...props}
    />
  );
}

export function CardDescription({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-zinc-600 dark:text-zinc-400 font-sans ${className}`} {...props} />
  );
}

export function CardContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 pt-0 ${className}`} {...props} />;
}

export function CardFooter({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center p-5 pt-0 border-t border-zinc-800/60 mt-4 ${className}`}
      {...props}
    />
  );
}
