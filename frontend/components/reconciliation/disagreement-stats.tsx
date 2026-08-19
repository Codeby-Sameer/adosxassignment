import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ReconciliationSummary } from "@/types/reconciliation";
import { AlertCircle, AlertTriangle, Copy, HelpCircle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisagreementStatsProps {
  summary: ReconciliationSummary | null;
  activeReason: string;
  onSelectReason: (reason: string) => void;
}

export function DisagreementStats({
  summary,
  activeReason,
  onSelectReason,
}: DisagreementStatsProps) {
  if (!summary) {
    return null;
  }

  const byReason = summary.by_reason || {};
  const valueMismatchCount = byReason["value_mismatch"] || 0;
  const missingCount = byReason["missing_in_system_b"] || 0;
  const duplicateCount = byReason["duplicate_system_b_entry"] || 0;
  const invalidRefCount = byReason["invalid_system_b_reference"] || 0;

  const statCards = [
    {
      key: "all",
      label: "Total Disagreements",
      count: summary.total_disagreements,
      icon: Layers,
      color: "text-slate-900 dark:text-zinc-50",
      bgColor: "bg-slate-50 dark:bg-zinc-900/50",
      activeRing: "ring-2 ring-slate-900 dark:ring-zinc-100",
    },
    {
      key: "value_mismatch",
      label: "Value Mismatch",
      count: valueMismatchCount,
      icon: AlertCircle,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50/70 dark:bg-rose-950/20",
      activeRing: "ring-2 ring-rose-500",
    },
    {
      key: "missing_in_system_b",
      label: "Missing in System B",
      count: missingCount,
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50/70 dark:bg-amber-950/20",
      activeRing: "ring-2 ring-amber-500",
    },
    {
      key: "duplicate_system_b_entry",
      label: "Duplicate Entries",
      count: duplicateCount,
      icon: Copy,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-50/70 dark:bg-sky-950/20",
      activeRing: "ring-2 ring-sky-500",
    },
    {
      key: "invalid_system_b_reference",
      label: "Invalid References",
      count: invalidRefCount,
      icon: HelpCircle,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50/70 dark:bg-purple-950/20",
      activeRing: "ring-2 ring-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeReason === stat.key;

        return (
          <Card
            key={stat.key}
            onClick={() => onSelectReason(stat.key)}
            className={cn(
              "cursor-pointer transition-all duration-150 hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700",
              isActive && stat.activeRing
            )}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate">
                  {stat.label}
                </span>
                <div className={cn("p-1.5 rounded-md shrink-0", stat.bgColor)}>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={cn("text-2xl font-bold tracking-tight", stat.color)}>
                  {stat.count}
                </span>
                {isActive && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Active
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
