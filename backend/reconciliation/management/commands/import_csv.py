import csv
from datetime import datetime
from pathlib import Path
from typing import Optional

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from reconciliation.models import Location, Organization, SystemARecord, SystemBEntry
from reconciliation.services import normalize_reference, parse_decimal_value


class Command(BaseCommand):
    help = "Imports locations.csv, system_a.csv, and system_b.csv into the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            type=str,
            help="Directory path containing the CSV files. Defaults to ../data relative to backend.",
        )

    def handle(self, *args, **options):
        data_dir_arg = options.get("data_dir")
        if data_dir_arg:
            data_dir = Path(data_dir_arg).resolve()
        else:
            # Look in parent data directory or current data directory
            data_dir = (settings.BASE_DIR.parent / "data").resolve()
            if not data_dir.exists():
                data_dir = (settings.BASE_DIR / "data").resolve()

        if not data_dir.exists():
            raise CommandError(f"Data directory not found at: {data_dir}")

        locations_file = data_dir / "locations.csv"
        system_a_file = data_dir / "system_a.csv"
        system_b_file = data_dir / "system_b.csv"

        for file_path in [locations_file, system_a_file, system_b_file]:
            if not file_path.exists():
                raise CommandError(f"Required CSV file not found: {file_path}")

        self.stdout.write(f"Importing CSVs from {data_dir}...")

        with transaction.atomic():
            self._import_locations(locations_file)
            sa_stats = self._import_system_a(system_a_file)
            sb_stats = self._import_system_b(system_b_file)

        # Print summary
        self.stdout.write("")
        self.stdout.write("System A:")
        self.stdout.write(f"{sa_stats['processed']} rows processed")
        self.stdout.write(f"{sa_stats['stored']} rows stored")
        self.stdout.write("")
        self.stdout.write("System B:")
        self.stdout.write(f"{sb_stats['processed']} rows processed")
        self.stdout.write(f"{sb_stats['stored']} rows stored")
        self.stdout.write("")
        self.stdout.write("Invalid/malformed values:")
        self.stdout.write(f"{sa_stats['malformed_values'] + sb_stats['malformed_values']}")
        self.stdout.write("")
        self.stdout.write("Invalid references:")
        self.stdout.write(f"{sb_stats['invalid_references']}")
        self.stdout.write("")
        self.stdout.write("Duplicates:")
        self.stdout.write(f"{sb_stats['duplicates']}")

    def _import_locations(self, file_path: Path):
        with open(file_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                loc_id = row.get("location_id", "").strip()
                org_id = row.get("org_id", "").strip()
                loc_name = row.get("location_name", "").strip()

                if not loc_id:
                    continue

                org_obj, _ = Organization.objects.update_or_create(
                    org_id=org_id,
                    defaults={"name": org_id},
                )
                Location.objects.update_or_create(
                    location_id=loc_id,
                    defaults={
                        "org": org_obj,
                        "location_name": loc_name or loc_id,
                    },
                )

    def _parse_date(self, date_str: Optional[str]):
        if not date_str:
            return None
        cleaned = date_str.strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(cleaned, fmt).date()
            except ValueError:
                pass
        return None

    def _get_or_create_location(self, location_id: str) -> Location:
        loc_id = location_id.strip() if location_id else "UNKNOWN"
        try:
            return Location.objects.get(location_id=loc_id)
        except Location.DoesNotExist:
            default_org, _ = Organization.objects.update_or_create(
                org_id="UNKNOWN_ORG",
                defaults={"name": "Unknown Organization"},
            )
            location, _ = Location.objects.update_or_create(
                location_id=loc_id,
                defaults={"org": default_org, "location_name": f"Unknown Location ({loc_id})"},
            )
            return location

    def _import_system_a(self, file_path: Path) -> dict:
        processed = 0
        stored = 0
        malformed_values = 0

        with open(file_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                processed += 1
                record_id = row.get("record_id", "").strip()
                if not record_id:
                    record_id = f"UNKNOWN-A-{idx}"

                location_id = row.get("location_id", "").strip()
                location = self._get_or_create_location(location_id)

                event_date = self._parse_date(row.get("event_date"))
                category_code = row.get("category_code", "").strip()
                actor_id = row.get("actor_id", "").strip() or None
                state = row.get("state", "").strip()

                raw_base = row.get("base_value", "")
                raw_adj = row.get("adjustment", "")
                raw_total = row.get("total_value", "")

                base_val = parse_decimal_value(raw_base)
                adj_val = parse_decimal_value(raw_adj)
                total_val = parse_decimal_value(raw_total)

                # Track unparseable numeric values
                if raw_base.strip() and base_val is None:
                    malformed_values += 1
                if raw_adj.strip() and adj_val is None:
                    malformed_values += 1
                if raw_total.strip() and total_val is None:
                    malformed_values += 1

                SystemARecord.objects.update_or_create(
                    record_id=record_id,
                    defaults={
                        "location": location,
                        "event_date": event_date,
                        "category_code": category_code,
                        "actor_id": actor_id,
                        "base_value": base_val,
                        "adjustment": adj_val,
                        "total_value": total_val,
                        "state": state,
                        "raw_data": dict(row),
                    },
                )
                stored += 1

        return {
            "processed": processed,
            "stored": stored,
            "malformed_values": malformed_values,
        }

    def _import_system_b(self, file_path: Path) -> dict:
        processed = 0
        stored = 0
        malformed_values = 0
        invalid_references = 0
        duplicates = 0

        # Pre-load known System A record IDs to validate references during import summary
        existing_sa_records = set(SystemARecord.objects.values_list("record_id", flat=True))
        seen_references: dict[str, int] = {}

        with open(file_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                processed += 1
                entry_id = row.get("entry_id", "").strip()
                if not entry_id:
                    entry_id = f"UNKNOWN-B-{idx}"

                raw_ref = row.get("record_ref", "")
                norm_ref = normalize_reference(raw_ref)

                location_id = row.get("location_id", "").strip()
                location = self._get_or_create_location(location_id)

                recorded_on = self._parse_date(row.get("recorded_on"))
                raw_val = row.get("value", "")
                parsed_val = parse_decimal_value(raw_val)
                label = row.get("label", "").strip()

                # If value is blank or unparseable, count as malformed
                if not raw_val.strip() or parsed_val is None:
                    malformed_values += 1

                # Reference validation
                if norm_ref not in existing_sa_records:
                    invalid_references += 1

                # Duplicate detection
                if norm_ref in seen_references:
                    duplicates += 1
                seen_references[norm_ref] = seen_references.get(norm_ref, 0) + 1

                SystemBEntry.objects.update_or_create(
                    entry_id=entry_id,
                    defaults={
                        "record_ref": raw_ref,
                        "location": location,
                        "recorded_on": recorded_on,
                        "raw_value": raw_val,
                        "parsed_value": parsed_val,
                        "label": label,
                        "raw_data": dict(row),
                    },
                )
                stored += 1

        return {
            "processed": processed,
            "stored": stored,
            "malformed_values": malformed_values,
            "invalid_references": invalid_references,
            "duplicates": duplicates,
        }
