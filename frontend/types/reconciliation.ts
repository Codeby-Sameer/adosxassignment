export type DisagreementReason =
  | "missing_in_system_b"
  | "invalid_system_b_reference"
  | "duplicate_system_b_entry"
  | "value_mismatch";

export interface Disagreement {
  record_id: string;
  reason: DisagreementReason;
  reasons?: DisagreementReason[];
  system_a_value: string | null;
  system_b_value: string | null;
  location_id: string;
  location_name: string;
  org_id: string;
  entry_id?: string | null;
}

export interface ReconciliationSummary {
  total_disagreements: number;
  by_reason: Record<string, number>;
  total_system_a_records: number;
  total_system_b_entries: number;
}

export type SortOption =
  | "none"
  | "system_a_desc"
  | "system_a_asc"
  | "system_b_desc"
  | "system_b_asc"
  | "record_id_asc"
  | "record_id_desc";
