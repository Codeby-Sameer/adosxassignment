# AdosX Take-Home — Reconciliation System

An end-to-end full-stack reconciliation platform built with a **Django REST Framework** backend and a **Next.js (React / TypeScript / Tailwind CSS / shadcn)** frontend.

The system ingests dirty transaction data from two independent upstream sources (**System A** and **System B**), enforces strict multi-tenant boundaries, performs robust deterministic comparison, identifies every category of discrepancy, and presents them in an interactive reconciliation dashboard with side-by-side audit modals.

---

## System Architecture & Data Flow

```text
data/
├── locations.csv
├── system_a.csv
└── system_b.csv
        │
        ▼ (python manage.py import_csv)
  SQLite Database
  (Organization ── Location ── System A / System B)
        │
        ▼ (reconciliation/services.py)
Reconciliation Engine
  ├── Missing in System B
  ├── Invalid System B Reference
  ├── Duplicate System B Entry
  └── Value Mismatch (with numeric equivalence)
        │
        ▼ (GET /api/disagreements/)
  Django REST API (Port 8000)
        │
        ▼ (HTTP / JSON)
  Next.js App Router (Port 3000)
  ├── Filter by Reason & Tenant
  ├── Numeric Sorting (High/Low)
  ├── Interactive Metric Cards
  └── Side-by-Side Raw Data Modal
```

---

## Pre-Flight Environment Check

Before running the project, you can run the automated pre-flight checker to verify which tools are installed on your machine:

* **On Linux / macOS:**
  ```bash
  ./check_env.sh
  ```

* **On Windows:**
  ```cmd
  check_env.bat
  ```

The script will inspect your system for Docker, Docker Compose, Python, `uv`, Node.js, and `npm`, and will recommend whether you should use **Option A (Docker)** or **Option B (Local Run)**.

---

## How to Run the Project

### Option A: Run with Docker (Recommended — Zero Local Dependencies)

Starts both the Django backend and Next.js frontend in containers, runs database migrations, and imports the CSV datasets automatically:

```bash
docker compose up --build
```

* **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
* **Backend REST API:** [http://localhost:8000/api/disagreements/](http://localhost:8000/api/disagreements/)
* **API Summary Stats:** [http://localhost:8000/api/summary/](http://localhost:8000/api/summary/)

---

### Option B: Run Locally Without Docker

#### Prerequisites:
* Python 3.12+ and `uv` package manager
* Node.js 18+ or 20+ and `npm`

#### 1. Start Backend (Terminal 1):
```bash
cd backend

# Install dependencies with uv
uv sync

# Run database migrations
uv run python manage.py migrate

# Ingest dirty CSV data safely
uv run python manage.py import_csv

# Run automated test suite
uv run python manage.py test

# Start Django development server
uv run python manage.py runserver
```

#### 2. Start Frontend (Terminal 2):
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Key Features Built

1. **Dirty Data Resilience (Zero Dropped Rows)**:
   - Ingestion command (`import_csv`) survives blank fields, commas in numeric values (`"1,25,400.00"`), dirty reference formatting (`" REC - 1070 "`, `"rec1034"`, `"1112"`), and references to nonexistent records (`REC-1999`).
   - Idempotent execution using atomic database transactions and `update_or_create`.

2. **Domain Reconciliation Engine (`reconciliation/services.py`)**:
   - **Case 1 — `missing_in_system_b`**: Identifies transactions recorded in System A with no System B counterpart.
   - **Case 2 — `invalid_system_b_reference`**: Identifies System B entries pointing to nonexistent System A records.
   - **Case 3 — `duplicate_system_b_entry`**: Identifies multiple System B entries referencing the same System A record without hiding any original rows.
   - **Case 4 — `value_mismatch`**: Detects financial discrepancies while handling mathematical equivalence (`100` vs `100.00` is **not** falsely flagged).
   - **Dual-Reason Support**: Records that are duplicates **and** have value mismatches (e.g. `REC-1055`) are surfaced with both tags.

3. **Strict Multi-Tenant Isolation**:
   - Hierarchy: `Organization -> Location -> System A / System B`.
   - Records belonging to different organizations are strictly isolated during reconciliation. Cross-tenant references (e.g., `REC-1077` filed under `LOC-201` in `ORG-B` while `REC-1077` belongs to `ORG-A`) never leak across boundaries.

4. **Next.js Reconciliation Dashboard (`frontend/`)**:
   - **Interactive Stat Cards**: Clickable summary metrics for quick filtering.
   - **Filter & Sort Toolbar**: Filter by Reason and Tenant (`ORG-A`, `ORG-B`), search by Record/Location, and sort by Value or Record ID.
   - **Side-by-Side Raw Data Modal**: Click "View" on any row to open a shadcn Dialog with full comparative analysis and raw JSON payload.
   - **Loading, Error & Empty States**: Polished user feedback with Skeleton loaders and Retry actions.

---

## What Was Deliberately Not Built

* **Generic CRUD Endpoints**: The assignment specifies batch reconciliation and review, not interactive transaction creation/deletion.
* **Authentication & User Registration**: Skipped to keep the scope focused on core data correctness and domain logic.
* **Heavyweight Worker Queues (Celery/Redis)**: SQLite and transactional Django management commands handle ingestion quickly and deterministically without external infrastructure overhead.

---

## Reflection & AI Agent Collaboration

### What did the AI agent get wrong?
* **Descending Sort with Null Values**: In an initial pass, sorting descending on numeric columns placed `None` values first due to a naive `(1, ...)` tuple sort key. This was refined so `None` values are consistently partitioned to the bottom of the table.
* **Cross-Tenant Reference Nuances**: When analyzing `REC-1077` (where System A placed it in `LOC-102` under `ORG-A`, but System B entered it in `LOC-201` under `ORG-B`), the agent required explicit verification that `ORG-A` treats it as missing in B and `ORG-B` treats it as an invalid reference.

### What are you least confident about?
* If external data feeds introduce reference formats with non-numeric suffixes or arbitrary alphanumeric hashes beyond `REC-`, the normalization regex may need to be expanded into configurable mapping rules.

### If you had a second day, what would you fix first?
1. **Streaming CSV Processing**: Implement chunked streaming (`ijson` / `polars`) for multi-gigabyte files.
2. **API Pagination**: Add DRF PageNumber or Cursor pagination on `/api/disagreements/` to handle high-cardinality discrepancy lists efficiently.
3. **Discrepancy Resolution Workflow**: Add an audit trail endpoint to allow operators to flag discrepancies as "Under Review", "Resolved", or "Accepted Variance".
