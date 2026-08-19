import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") {
    return "—";
  }
  const cleanStr = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleanStr);
  if (isNaN(num)) {
    return String(val);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
