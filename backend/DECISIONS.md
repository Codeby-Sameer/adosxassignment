# Architectural Decisions

### 1. Database Engine
* **Decision:** Use SQLite as the backend database for the assignment.
* **Alternative rejected:** Setting up PostgreSQL/MySQL via Docker.
* **Reason:** SQLite has zero external infrastructure dependencies, allows deterministic execution, and is fast and lightweight for a time-boxed take-home evaluation while fully supporting Django ORM queries and transactions.

### 2. Loose Coupling for System B References
* **Decision:** Store System B's `record_ref` as a raw string and avoid a strict database foreign key to `SystemARecord`.
* **Alternative rejected:** Enforcing a database `ForeignKey` constraint from System B to System A.
* **Reason:** Dirty input data contains invalid references (e.g., `REC-1999` which does not exist in System A) and malformed formatting (e.g., `REC - 1070`, `rec1034`, `1112`). A database foreign key would fail to import invalid records, violating the critical requirement to never drop rows. Storing raw values and normalizing during comparison preserves all rows and highlights invalid references as distinct disagreements.

### 3. Isolation of Reconciliation Logic
* **Decision:** Implement reconciliation and normalization in a dedicated domain service module (`reconciliation/services.py`).
* **Alternative rejected:** Embedding comparison logic directly within Django API views or serializer methods.
* **Reason:** Decouples core business logic from the HTTP request/response cycle, making reconciliation easily unit testable in isolation, maintainable, and reusable across commands or background jobs.

### 4. Idempotent Management Command for CSV Import
* **Decision:** Ingest CSV files via `uv run python manage.py import_csv` with transactional `update_or_create` semantics.
* **Alternative rejected:** Ad-hoc standalone import scripts or running import on Django startup.
* **Reason:** Management commands follow idiomatic Django patterns, allow reliable path resolution, support custom arguments, execute inside atomic transactions, and ensure safe repeated executions without duplicating records.

### 5. Exclusion of Generic CRUD Endpoints
* **Decision:** Do not implement generic Create/Update/Delete endpoints for locations or records.
* **Alternative rejected:** Scaffolding complete RESTful CRUD endpoints for every model.
* **Reason:** The assignment specifically focuses on batch CSV ingestion, reconciliation, and disagreement exposure. Generic CRUD adds unnecessary boilerplate and maintenance complexity that is outside the stated assignment scope.

### 6. Dual Representation of Numeric Values
* **Decision:** Store raw string representations alongside parsed `Decimal` values for financial/numeric columns.
* **Alternative rejected:** Coercing all values to `float` or discarding raw string inputs.
* **Reason:** Preserving raw strings ensures dirty data (such as commas in `"1,25,400.00"` or empty strings `""`) is never lost or mutated, while `Decimal` fields enable exact numeric comparisons without floating-point precision issues.
