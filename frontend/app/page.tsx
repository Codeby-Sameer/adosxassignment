"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchDisagreements, fetchReconciliationSummary } from "@/lib/api";
import { Disagreement, ReconciliationSummary, SortOption } from "@/types/reconciliation";
import { DisagreementStats } from "@/components/reconciliation/disagreement-stats";
import { ReconciliationTable } from "@/components/reconciliation/reconciliation-table";
import { ReasonFilter } from "@/components/reconciliation/reason-filter";
import { SortControl } from "@/components/reconciliation/sort-control";
import { EmptyState } from "@/components/reconciliation/empty-state";
import { ErrorState } from "@/components/reconciliation/error-state";
import { LoadingSkeleton } from "@/components/reconciliation/loading-skeleton";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";

export default function ReconciliationPage() {
  const [disagreements, setDisagreements] = useState<Disagreement[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Filters & Sorting state
  const [selectedReason, setSelectedReason] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<SortOption>("none");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Map UI sort option to backend ordering param
  const orderingParam = useMemo(() => {
    switch (selectedSort) {
      case "system_a_desc":
        return "-system_a_value";
      case "system_a_asc":
        return "system_a_value";
      case "system_b_desc":
        return "-system_b_value";
      case "system_b_asc":
        return "system_b_value";
      case "record_id_asc":
        return "record_id";
      case "record_id_desc":
        return "-record_id";
      default:
        return undefined;
    }
  }, [selectedSort]);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [disagreementsData, summaryData] = await Promise.all([
          fetchDisagreements({
            reason: selectedReason,
            org_id: selectedOrg,
            ordering: orderingParam,
          }),
          fetchReconciliationSummary({
            org_id: selectedOrg,
          }),
        ]);

        if (!ignore) {
          setDisagreements(disagreementsData);
          setSummary(summaryData);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to connect to the reconciliation backend API.";
          setError(errorMessage);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [selectedReason, selectedOrg, orderingParam, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Client-side quick search filter (search by Record ID, location name or location ID)
  const filteredDisagreements = useMemo(() => {
    if (!searchQuery.trim()) {
      return disagreements;
    }
    const q = searchQuery.toLowerCase().trim();
    return disagreements.filter(
      (d) =>
        d.record_id.toLowerCase().includes(q) ||
        d.location_name.toLowerCase().includes(q) ||
        d.location_id.toLowerCase().includes(q) ||
        (d.entry_id && d.entry_id.toLowerCase().includes(q))
    );
  }, [disagreements, searchQuery]);

  const handleResetFilters = () => {
    setSelectedReason("all");
    setSelectedOrg("all");
    setSelectedSort("none");
    setSearchQuery("");
  };

  const isFiltered =
    selectedReason !== "all" ||
    selectedOrg !== "all" ||
    selectedSort !== "none" ||
    searchQuery.trim() !== "";

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-zinc-50 pb-16">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-2xs">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                AdosX Reconciliation
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-full border border-slate-200 dark:border-zinc-700">
                  Backend API
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="text-xs h-8 shadow-2xs"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-slate-600" : ""}`}
              />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-6">
        {/* Page Hero Description */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
              System Disagreements
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              Review and audit every discrepancy identified between System A and System B records.
            </p>
          </div>

          {summary && (
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
              <div className="bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-2xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  {summary.total_system_a_records}
                </span>{" "}
                System A records
              </div>
              <div className="bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-2xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  {summary.total_system_b_entries}
                </span>{" "}
                System B entries
              </div>
            </div>
          )}
        </div>

        {/* Metric Cards */}
        {summary && (
          <DisagreementStats
            summary={summary}
            activeReason={selectedReason}
            onSelectReason={setSelectedReason}
          />
        )}

        {/* Error Display */}
        {error && <ErrorState message={error} onRetry={handleRefresh} />}

        {/* Loading Skeleton */}
        {loading && !disagreements.length ? (
          <LoadingSkeleton />
        ) : (
          !error && (
            <div className="space-y-4">
              {/* Filter & Sorting Toolbar */}
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between p-4 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xs">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search record, entry, location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:bg-zinc-950 dark:focus:ring-zinc-300"
                    />
                  </div>

                  {/* Reason Filter */}
                  <ReasonFilter
                    selectedReason={selectedReason}
                    onSelectReason={setSelectedReason}
                    summary={summary}
                  />

                  {/* Tenant / Organization Filter */}
                  <div className="w-full sm:w-[160px]">
                    <NativeSelect
                      options={[
                        { value: "all", label: "All Tenants" },
                        { value: "ORG-A", label: "Organization A" },
                        { value: "ORG-B", label: "Organization B" },
                      ]}
                      value={selectedOrg}
                      onChange={setSelectedOrg}
                      aria-label="Filter by organization tenant"
                    />
                  </div>
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2 justify-end">
                  <SortControl
                    selectedSort={selectedSort}
                    onSelectSort={setSelectedSort}
                  />
                  {isFiltered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="text-xs text-slate-500 hover:text-slate-900 h-9"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Table or Empty State */}
              {filteredDisagreements.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400 px-1">
                    <span>
                      Showing <strong>{filteredDisagreements.length}</strong> of{" "}
                      <strong>{summary?.total_disagreements || disagreements.length}</strong>{" "}
                      disagreements
                    </span>
                  </div>
                  <ReconciliationTable disagreements={filteredDisagreements} />
                </div>
              ) : (
                <EmptyState
                  isFiltered={isFiltered}
                  onResetFilters={isFiltered ? handleResetFilters : undefined}
                />
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}
