import React from "react";
import { NativeSelect, SelectOption } from "@/components/ui/select";
import { SortOption } from "@/types/reconciliation";

interface SortControlProps {
  selectedSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
}

export function SortControl({ selectedSort, onSelectSort }: SortControlProps) {
  const options: SelectOption[] = [
    { value: "none", label: "Default Order" },
    { value: "system_a_desc", label: "System A Value (High to Low)" },
    { value: "system_a_asc", label: "System A Value (Low to High)" },
    { value: "system_b_desc", label: "System B Value (High to Low)" },
    { value: "system_b_asc", label: "System B Value (Low to High)" },
    { value: "record_id_asc", label: "Record ID (A to Z)" },
    { value: "record_id_desc", label: "Record ID (Z to A)" },
  ];

  return (
    <div className="w-full sm:w-[240px]">
      <NativeSelect
        options={options}
        value={selectedSort}
        onChange={(val) => onSelectSort(val as SortOption)}
        aria-label="Sort disagreements"
      />
    </div>
  );
}
