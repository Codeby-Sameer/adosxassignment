import React from "react";
import { CheckCircle2, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  isFiltered?: boolean;
  onResetFilters?: () => void;
}

export function EmptyState({ isFiltered = false, onResetFilters }: EmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-900 mb-4">
          <FilterX className="h-6 w-6 text-slate-500 dark:text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-50 mb-1">
          No matching disagreements found
        </h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
          No records match your selected reason or tenant filters. Try adjusting your filter criteria.
        </p>
        {onResetFilters && (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Reset Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-4">
        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-50 mb-1">
        No disagreements found
      </h3>
      <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
        System A and System B currently agree on all imported records across all locations.
      </p>
    </div>
  );
}
