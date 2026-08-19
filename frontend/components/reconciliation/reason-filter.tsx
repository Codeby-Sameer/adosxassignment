import React from "react";
import { NativeSelect, SelectOption } from "@/components/ui/select";
import { ReconciliationSummary } from "@/types/reconciliation";

interface ReasonFilterProps {
  selectedReason: string;
  onSelectReason: (reason: string) => void;
  summary: ReconciliationSummary | null;
}

export function ReasonFilter({
  selectedReason,
  onSelectReason,
  summary,
}: ReasonFilterProps) {
  const byReason = summary?.by_reason || {};

  const options: SelectOption[] = [
    { value: "all", label: "All Reasons", count: summary?.total_disagreements },
    {
      value: "value_mismatch",
      label: "Value Mismatch",
      count: byReason["value_mismatch"],
    },
    {
      value: "missing_in_system_b",
      label: "Missing in System B",
      count: byReason["missing_in_system_b"],
    },
    {
      value: "duplicate_system_b_entry",
      label: "Duplicate Entry",
      count: byReason["duplicate_system_b_entry"],
    },
    {
      value: "invalid_system_b_reference",
      label: "Invalid Reference",
      count: byReason["invalid_system_b_reference"],
    },
  ];

  return (
    <div className="w-full sm:w-[220px]">
      <NativeSelect
        options={options}
        value={selectedReason}
        onChange={onSelectReason}
        aria-label="Filter by disagreement reason"
      />
    </div>
  );
}
