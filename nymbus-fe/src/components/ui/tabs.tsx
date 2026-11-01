import * as React from "react";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  children,
  className = "",
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalVal, setInternalVal] = React.useState(defaultValue);
  const currentVal = value !== undefined ? value : internalVal;

  const handleValueChange = (val: string) => {
    if (value === undefined) setInternalVal(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: currentVal, onValueChange: handleValueChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900/90 p-1 text-zinc-400 border border-zinc-800 ${className}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? "bg-zinc-800 text-white shadow-sm font-semibold"
          : "hover:bg-zinc-800/50 hover:text-zinc-200"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");

  if (ctx.value !== value) return null;

  return <div className={`mt-3 focus-visible:outline-none ${className}`}>{children}</div>;
}
