import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-slate-200 dark:border-zinc-800">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center p-4 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-900">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 py-2.5 items-center">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-5 w-20 ml-auto" />
            <Skeleton className="h-5 w-20 ml-auto" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-14 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
