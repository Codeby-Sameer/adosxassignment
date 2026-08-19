import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  count?: number;
}

export interface CustomSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, CustomSelectProps>(
  ({ className, options, value, onChange, label, ...props }, ref) => {
    return (
      <div className="relative inline-block w-full">
        {label && (
          <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "flex h-9 w-full appearance-none items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus:ring-zinc-300 pr-8 cursor-pointer font-medium text-slate-800 dark:text-zinc-200",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="py-1">
                {opt.label} {opt.count !== undefined ? `(${opt.count})` : ""}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500 dark:text-zinc-400">
            <ChevronDown className="h-4 w-4 opacity-70" />
          </div>
        </div>
      </div>
    );
  }
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
