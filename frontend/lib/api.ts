import { Disagreement, ReconciliationSummary } from "@/types/reconciliation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface FetchDisagreementsParams {
  reason?: string;
  org_id?: string;
  location_id?: string;
  ordering?: string;
}

export async function fetchDisagreements(
  params?: FetchDisagreementsParams
): Promise<Disagreement[]> {
  const url = new URL("/api/disagreements/", BASE_URL);

  if (params?.reason && params.reason !== "all") {
    url.searchParams.set("reason", params.reason);
  }
  if (params?.org_id && params.org_id !== "all") {
    url.searchParams.set("org_id", params.org_id);
  }
  if (params?.location_id && params.location_id !== "all") {
    url.searchParams.set("location_id", params.location_id);
  }
  if (params?.ordering && params.ordering !== "none") {
    url.searchParams.set("ordering", params.ordering);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch disagreements: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function fetchReconciliationSummary(
  params?: { org_id?: string }
): Promise<ReconciliationSummary> {
  const url = new URL("/api/summary/", BASE_URL);

  if (params?.org_id && params.org_id !== "all") {
    url.searchParams.set("org_id", params.org_id);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch summary: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
