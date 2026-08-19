import React from "react";
import { Badge } from "@/components/ui/badge";
import { DisagreementReason } from "@/types/reconciliation";
import { AlertCircle, AlertTriangle, Copy, HelpCircle } from "lucide-react";

interface DisagreementBadgeProps {
  reason: DisagreementReason;
  showIcon?: boolean;
}

export function getReasonMetadata(reason: DisagreementReason): {
  label: string;
  variant: "warning" | "destructive" | "info" | "purple" | "default";
  icon: React.ComponentType<{ className?: string }>;
  description: string;
} {
  switch (reason) {
    case "value_mismatch":
      return {
        label: "Value Mismatch",
        variant: "destructive",
        icon: AlertCircle,
        description: "Systems report different financial values for the same record",
      };
    case "missing_in_system_b":
      return {
        label: "Missing in System B",
        variant: "warning",
        icon: AlertTriangle,
        description: "Record exists in System A but has no corresponding entry in System B",
      };
    case "duplicate_system_b_entry":
      return {
        label: "Duplicate Entry",
        variant: "info",
        icon: Copy,
        description: "Multiple System B entries reference the same System A record",
      };
    case "invalid_system_b_reference":
      return {
        label: "Invalid Reference",
        variant: "purple",
        icon: HelpCircle,
        description: "System B entry references a nonexistent System A record",
      };
    default:
      return {
        label: reason,
        variant: "default",
        icon: AlertCircle,
        description: "Disagreement",
      };
  }
}

export function DisagreementBadge({ reason, showIcon = true }: DisagreementBadgeProps) {
  const meta = getReasonMetadata(reason);
  const Icon = meta.icon;

  return (
    <Badge variant={meta.variant} className="gap-1.5 py-1 px-2.5 font-medium shadow-2xs whitespace-nowrap">
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />}
      <span>{meta.label}</span>
    </Badge>
  );
}
