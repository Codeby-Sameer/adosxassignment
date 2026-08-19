# AdosX Take-Home — Backend

This is the Django backend implementation for the AdosX take-home reconciliation system. It ingests CSV data from System A and System B, handles dirty data without dropping rows, performs tenant-aware reconciliation to detect all discrepancies, and exposes them through a REST API.

---

## Quick Start

### 1. Requirements
* Python 3.12+
* `uv` package manager

### 2. Setup and Dependency Installation
From the `backend/` directory:
```bash
uv sync
```

### 3. Run Database Migrations
```bash
uv run python manage.py migrate
```

### 4. Run CSV Importer
```bash
uv run python manage.py import_csv
```

Expected import summary:
```text
System A:
120 rows processed
120 rows stored

System B:
121 rows processed
121 rows stored

Invalid/malformed values:
1

Invalid references:
1

Duplicates:
2
```

### 5. Run Test Suite
```bash
uv run python manage.py test
```

### 6. Start the Development Server
```bash
uv run python manage.py runserver
```
The API is available at `http://127.0.0.1:8000/api/`.

---

## API Endpoints

### 1. `GET /api/disagreements/`
Returns all detected reconciliation disagreements between System A and System B.

#### Query Parameters:
* `reason`: Filter by discrepancy reason:
  * `missing_in_system_b`: Record present in System A but missing in System B.
  * `invalid_system_b_reference`: Entry in System B referencing a nonexistent System A record.
  * `duplicate_system_b_entry`: Multiple System B entries referencing the same System A record.
  * `value_mismatch`: Both systems reference the record but report differing values.
* `org_id`: Enforce tenant boundary filtering (e.g. `?org_id=ORG-A`).
* `location_id`: Filter by specific location ID (e.g. `?location_id=LOC-101`).
* `ordering`: Sort results by field (e.g. `?ordering=system_a_value`, `?ordering=-system_a_value`, `?ordering=record_id`).

#### Response Example:
```json
[
  {
    "record_id": "REC-1003",
    "reason": "value_mismatch",
    "system_a_value": "121388.01",
    "system_b_value": "94834.38",
    "location_id": "LOC-202",
    "location_name": "Location 202",
    "org_id": "ORG-B",
    "entry_id": "ENT/2026/4003"
  }
]
```

### 2. `GET /api/summary/`
Returns aggregate summary statistics of records and disagreements.

#### Response Example:
```json
{
  "total_disagreements": 14,
  "by_reason": {
    "missing_in_system_b": 3,
    "value_mismatch": 5,
    "duplicate_system_b_entry": 4,
    "invalid_system_b_reference": 2
  },
  "total_system_a_records": 120,
  "total_system_b_entries": 121
}
```

---

## Tenant Boundary Architecture

The tenant hierarchy is strictly enforced through the relational data model:
```text
Organization (org_id)
    └── Location (location_id, org_id, location_name)
            ├── System A records (record_id, location_id, total_value, ...)
            └── System B entries (entry_id, record_ref, location_id, raw_value, parsed_value, ...)
```

* Every location belongs to exactly one organization (`Location.org -> Organization`).
* System A and System B records are linked directly to `Location`.
* Reconciliation is evaluated per organization. If an entry in System B is assigned to a location in `ORG-B` while referencing a record in `ORG-A` (e.g., `REC-1077`), the tenant boundary treats it as `missing_in_system_b` in `ORG-A` and `invalid_system_b_reference` in `ORG-B`, preventing cross-tenant leakage.

---

## What Was Built

1. **Robust Data Models (`reconciliation/models.py`)**: Models for `Organization`, `Location`, `SystemARecord`, and `SystemBEntry`. Raw data strings and full CSV rows are stored in `JSONField` to ensure full auditability without schema mutation.
2. **Dirty Data Handling (`reconciliation/management/commands/import_csv.py`)**:
   - Zero dropped rows on import.
   - Handles unparseable values, missing columns, spaces, and custom numbering formats.
   - Idempotent import via `update_or_create`.
3. **Reference Normalization & Value Comparison (`reconciliation/services.py`)**:
   - Cleans whitespace, hyphens, casing, and prefix variations (`REC - 1070` -> `REC-1070`, `rec1034` -> `REC-1034`, `1112` -> `REC-1112`).
   - Normalizes numeric representations using `Decimal` so valid formatting differences (`"100"` vs `"100.00"` or `"1,25,400.00"`) are not falsely flagged as disagreements.
4. **Reconciliation Service (`reconciliation/services.py`)**: Identifies all 4 required disagreement types and applies sorting and tenant filtering.
5. **DRF API & CORS Support (`reconciliation/views.py`, `reconciliation/middleware.py`)**: REST endpoints with filtering and sorting.
6. **Automated Test Suite (`reconciliation/tests.py`)**: 17 unit and integration tests covering all disagreement cases, numeric equivalence, dirty data import, tenant isolation, and API endpoints.

---

## What Was Deliberately Not Built

* **Generic CRUD Endpoints**: The assignment specifies batch CSV ingestion and comparison, not interactive editing or deletion.
* **Authentication / User Management**: Kept out of scope to avoid overbuilding; tenant boundaries are modeled directly in the schema and query logic.
* **Celery / Redis / Background Workers**: SQLite and synchronous Django commands handle the CSV processing quickly and reliably without external operational overhead.

---

## Reflection & AI Agent Collaboration

### What did the AI agent get wrong?
* In an initial analysis of numeric sorting, descending sorting on nullable fields initially placed `None` values ahead of numeric values because `Decimal("-Infinity")` was used with a naive sort tuple. This was corrected by partitioning valid and `None` records so `None` values are consistently sorted last.
* The agent needed clear direction on how cross-tenant reference anomalies (e.g., `REC-1077` where System A placed it in `LOC-102` under `ORG-A`, but System B entered it in `LOC-201` under `ORG-B`) should be resolved with respect to strict tenant isolation.

### What are you least confident about?
* If external data feeds introduce references with arbitrary prefixes beyond `REC-` (e.g. alphanumeric hashes or compound keys), the normalization heuristics may need to be expanded into configurable regex mapping tables.

### If you had a second day, what would you fix first?
1. **Streaming / Async Ingestion**: Implement streaming CSV parsing (e.g. `ijson` or chunked reading) and asynchronous ingestion tasks for multi-gigabyte CSV files.
2. **API Pagination**: Add DRF cursor/page-number pagination to `GET /api/disagreements/` to handle high-cardinality discrepancy lists efficiently.
3. **Audit Log / Resolution Workflow**: Add an endpoint and status tracking to allow users to mark disagreements as reviewed, acknowledged, or resolved.
