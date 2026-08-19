"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disagreement, DisagreementReason } from "@/types/reconciliation";
import { DisagreementBadge, getReasonMetadata } from "./disagreement-badge";
import { formatCurrency } from "@/lib/utils";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Code,
  Copy,
  Database,
  MapPin,
  XCircle,
} from "lucide-react";

interface RawDataModalProps {
  disagreement: Disagreement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RawDataModal({
  disagreement,
  open,
  onOpenChange,
}: RawDataModalProps) {
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!disagreement) {
    return null;
  }

  const allReasons: DisagreementReason[] =
    disagreement.reasons && disagreement.reasons.length > 0
      ? disagreement.reasons
      : [disagreement.reason];

  const hasSystemA = disagreement.system_a_value !== null;
  const hasSystemB =
    disagreement.system_b_value !== null && disagreement.system_b_value !== "";

  // Numeric difference calculation
  let diffNum: number | null = null;
  if (hasSystemA && hasSystemB) {
    const numA = parseFloat(String(disagreement.system_a_value).replace(/,/g, ""));
    const numB = parseFloat(String(disagreement.system_b_value).replace(/,/g, ""));
    if (!isNaN(numA) && !isNaN(numB)) {
      diffNum = numB - numA;
    }
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(disagreement, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-800 dark:text-zinc-200">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="font-mono text-lg flex items-center gap-2">
                  <span>{disagreement.record_id}</span>
                  {disagreement.entry_id && (
                    <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                      ({disagreement.entry_id})
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Reconciliation audit & side-by-side data comparison
                </DialogDescription>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {allReasons.map((r, i) => (
                <DisagreementBadge key={i} reason={r} />
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Location & Tenant Context Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-medium">{disagreement.location_name}</span>
            <span className="font-mono text-slate-400 dark:text-zinc-500">
              ({disagreement.location_id})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-zinc-400">Tenant / Org:</span>
            <Badge
              variant="outline"
              className="font-mono text-xs font-semibold bg-white dark:bg-zinc-950"
            >
              <Building className="h-3 w-3 mr-1 text-slate-400" />
              {disagreement.org_id}
            </Badge>
          </div>
        </div>

        {/* Side-by-Side Comparison Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* System A Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                  System A
                </h4>
              </div>
              {hasSystemA ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Present
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  <XCircle className="h-3.5 w-3.5" /> Missing
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-zinc-400">Record ID:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                  {hasSystemA ? disagreement.record_id : "—"}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-zinc-400">Total Value:</span>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-slate-900 dark:text-zinc-50">
                    {formatCurrency(disagreement.system_a_value)}
                  </div>
                  {disagreement.system_a_value && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Raw: {disagreement.system_a_value}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-zinc-400">Location:</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">
                  {disagreement.location_id}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-zinc-400">Organization:</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">
                  {disagreement.org_id}
                </span>
              </div>
            </div>
          </div>

          {/* System B Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                  System B
                </h4>
              </div>
              {hasSystemB ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Present
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  <XCircle className="h-3.5 w-3.5" /> Missing
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-zinc-400">Record Ref:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                  {disagreement.record_id}
                </span>
              </div>

              {disagreement.entry_id && (
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 dark:text-zinc-400">Entry ID:</span>
                  <span className="font-mono text-slate-800 dark:text-zinc-200">
                    {disagreement.entry_id}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-zinc-400">Recorded Value:</span>
                <div className="text-right">
                  <div
                    className={`font-mono text-sm font-bold ${
                      allReasons.includes("value_mismatch")
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-900 dark:text-zinc-50"
                    }`}
                  >
                    {formatCurrency(disagreement.system_b_value)}
                  </div>
                  {disagreement.system_b_value && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Raw: {disagreement.system_b_value}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-zinc-400">Location:</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">
                  {disagreement.location_id}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 dark:text-zinc-400">Organization:</span>
                <span className="font-medium text-slate-800 dark:text-zinc-200">
                  {disagreement.org_id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Discrepancy Diagnostics & Analysis Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
          <h4 className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-slate-600 dark:text-zinc-400" />
            Reconciliation Diagnostics
          </h4>

          <div className="space-y-1.5 pl-5.5 text-slate-600 dark:text-zinc-400 leading-relaxed">
            {allReasons.map((r, i) => {
              const meta = getReasonMetadata(r);
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>
                    <strong className="text-slate-800 dark:text-zinc-200">
                      {meta.label}:
                    </strong>{" "}
                    {meta.description}
                  </span>
                </div>
              );
            })}

            {diffNum !== null && Math.abs(diffNum) > 0.0001 && (
              <div className="flex items-start gap-1.5 pt-1">
                <span className="text-slate-400 font-bold">•</span>
                <span>
                  <strong className="text-slate-800 dark:text-zinc-200">
                    Calculated Variance:
                  </strong>{" "}
                  System B differs from System A by{" "}
                  <strong
                    className={
                      diffNum > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }
                  >
                    {diffNum > 0
                      ? `+${formatCurrency(diffNum)}`
                      : `-${formatCurrency(Math.abs(diffNum))}`}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Raw JSON Toggle Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRawJson((prev) => !prev)}
              className="text-xs h-7 text-slate-600 dark:text-zinc-400"
            >
              <Code className="h-3.5 w-3.5 mr-1" />
              {showRawJson ? "Hide Raw JSON" : "View Raw JSON Payload"}
            </Button>

            {showRawJson && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="text-xs h-7"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copied ? "Copied!" : "Copy JSON"}
              </Button>
            )}
          </div>

          {showRawJson && (
            <pre className="p-3 bg-slate-900 text-slate-100 dark:bg-black rounded-lg text-xs font-mono overflow-x-auto border border-slate-800 max-h-48">
              {JSON.stringify(disagreement, null, 2)}
            </pre>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
              Read-Only Reconciliation Record View
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
