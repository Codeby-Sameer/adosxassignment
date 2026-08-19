"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disagreement, DisagreementReason } from "@/types/reconciliation";
import { DisagreementBadge } from "./disagreement-badge";
import { RawDataModal } from "./raw-data-modal";
import { formatCurrency } from "@/lib/utils";
import { Eye, MapPin } from "lucide-react";

interface ReconciliationTableProps {
  disagreements: Disagreement[];
}

export function ReconciliationTable({ disagreements }: ReconciliationTableProps) {
  const [selectedDisagreement, setSelectedDisagreement] =
    useState<Disagreement | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const handleOpenDetails = (item: Disagreement) => {
    setSelectedDisagreement(item);
    setModalOpen(true);
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40">
                <TableHead className="w-[170px] min-w-[150px]">Record</TableHead>
                <TableHead className="min-w-[210px]">Reason(s)</TableHead>
                <TableHead className="text-right min-w-[125px]">System A</TableHead>
                <TableHead className="text-right min-w-[125px]">System B</TableHead>
                <TableHead className="min-w-[130px] text-right">Difference</TableHead>
                <TableHead className="min-w-[160px]">Location</TableHead>
                <TableHead className="w-[90px] text-center">Tenant</TableHead>
                <TableHead className="w-[90px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disagreements.map((item, index) => {
                const rowKey = `${item.record_id}-${item.entry_id || ""}-${index}`;
                const allReasons: DisagreementReason[] =
                  item.reasons && item.reasons.length > 0
                    ? item.reasons
                    : [item.reason];
                const isMismatch = allReasons.includes("value_mismatch");

                // Calculate difference if both values are valid numbers
                let diffText: React.ReactNode = "—";
                if (item.system_a_value !== null && item.system_b_value !== null) {
                  const numA = parseFloat(
                    String(item.system_a_value).replace(/,/g, "")
                  );
                  const numB = parseFloat(
                    String(item.system_b_value).replace(/,/g, "")
                  );
                  if (!isNaN(numA) && !isNaN(numB)) {
                    const diff = numB - numA;
                    if (Math.abs(diff) > 0.0001) {
                      const formattedDiff = formatCurrency(Math.abs(diff));
                      diffText = (
                        <span
                          className={`font-mono text-xs font-semibold ${
                            diff > 0
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {diff > 0 ? `+${formattedDiff}` : `-${formattedDiff}`}
                        </span>
                      );
                    }
                  }
                }

                return (
                  <TableRow
                    key={rowKey}
                    className="hover:bg-slate-50/90 dark:hover:bg-zinc-900/70 transition-colors group"
                  >
                    {/* Record ID & Entry Reference */}
                    <TableCell className="font-medium align-top py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded w-fit">
                          {item.record_id}
                        </span>
                        {item.entry_id && (
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                            {item.entry_id}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Disagreement Reason Badges */}
                    <TableCell className="align-top py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {allReasons.map((r, i) => (
                          <DisagreementBadge key={i} reason={r} />
                        ))}
                      </div>
                    </TableCell>

                    {/* System A Value */}
                    <TableCell className="text-right align-top py-3.5">
                      {item.system_a_value !== null ? (
                        <span className="font-mono text-xs font-medium text-slate-800 dark:text-zinc-200">
                          {formatCurrency(item.system_a_value)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-zinc-600 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* System B Value */}
                    <TableCell className="text-right align-top py-3.5">
                      {item.system_b_value !== null && item.system_b_value !== "" ? (
                        <span
                          className={`font-mono text-xs font-medium ${
                            isMismatch
                              ? "text-rose-600 dark:text-rose-400 font-semibold underline decoration-rose-400/40 decoration-dotted underline-offset-4"
                              : "text-slate-800 dark:text-zinc-200"
                          }`}
                        >
                          {formatCurrency(item.system_b_value)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-zinc-600 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Difference */}
                    <TableCell className="text-right align-top py-3.5">
                      {diffText}
                    </TableCell>

                    {/* Location Info */}
                    <TableCell className="align-top py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-900 dark:text-zinc-100 font-medium">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{item.location_name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono ml-4.5">
                          {item.location_id}
                        </span>
                      </div>
                    </TableCell>

                    {/* Tenant / Organization */}
                    <TableCell className="text-center align-top py-3.5">
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900"
                      >
                        {item.org_id}
                      </Badge>
                    </TableCell>

                    {/* Action: View Raw Data Modal */}
                    <TableCell className="text-center align-top py-3.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetails(item)}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 shadow-2xs"
                        title="View Raw Data & Visual Comparison"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Raw Data & Visual Comparison Modal Dialog */}
      <RawDataModal
        disagreement={selectedDisagreement}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
