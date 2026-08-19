import re
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

from reconciliation.models import Location, Organization, SystemARecord, SystemBEntry


def normalize_reference(raw_ref: Optional[str]) -> str:
    """
    Normalizes a System B record reference into a canonical System A record ID format (e.g. 'REC-1001').

    Rules:
    1. If raw_ref is None or empty/whitespace-only, return empty string.
    2. Strip leading and trailing whitespace.
    3. Convert to uppercase.
    4. Remove spaces around hyphens and underscores (e.g. 'REC - 1070' -> 'REC-1070').
    5. Handle common prefix variations:
       - 'REC1034' or 'REC_1034' -> 'REC-1034'
       - '1112' (pure digits) -> 'REC-1112'
       - 'REC-1001' -> 'REC-1001'
    6. If the reference is not a standard variant (e.g. 'INVALID-XYZ'), return the trimmed uppercase string
       without speculative modifications so it can be evaluated cleanly as an invalid reference.
    """
    if raw_ref is None:
        return ""

    cleaned = raw_ref.strip()
    if not cleaned:
        return ""

    cleaned = cleaned.upper()
    # Normalize spaces around dashes and underscores: 'REC - 1070' -> 'REC-1070'
    cleaned = re.sub(r"\s*[-_]\s*", "-", cleaned)
    # Remove any remaining internal whitespace
    cleaned = re.sub(r"\s+", "", cleaned)

    # Match 'REC-1034', 'REC1034', '1034'
    match = re.match(r"^(?:REC-?|REC)?(\d+)$", cleaned)
    if match:
        return f"REC-{match.group(1)}"

    return cleaned


def parse_decimal_value(val: Any) -> Optional[Decimal]:
    """
    Parses a string, integer, float, or Decimal into a Decimal object.
    Handles formatting artifacts like thousands commas (e.g. '1,25,400.00' or '1,000.50').
    Returns None if the value is blank, None, or cannot be parsed into a valid Decimal.
    """
    if val is None:
        return None

    if isinstance(val, Decimal):
        return val

    if isinstance(val, (int, float)):
        return Decimal(str(val))

    val_str = str(val).strip()
    if not val_str:
        return None

    # Remove commas used in formatting (standard or South Asian numbering format)
    cleaned_str = val_str.replace(",", "")
    try:
        return Decimal(cleaned_str)
    except (InvalidOperation, ValueError):
        return None


def values_are_equivalent(val_a: Any, val_b: Any) -> bool:
    """
    Determines whether two values are numerically equivalent.
    
    Examples:
    - '100' and '100.00' -> True
    - '1,25,400.00' and '125400.00' -> True
    - '100' and '105' -> False
    - None and None -> True
    - '100' and None -> False
    - '100' and '' -> False
    """
    dec_a = parse_decimal_value(val_a)
    dec_b = parse_decimal_value(val_b)

    if dec_a is not None and dec_b is not None:
        return dec_a == dec_b

    # If both are None or empty strings
    if (val_a is None or str(val_a).strip() == "") and (val_b is None or str(val_b).strip() == ""):
        return True

    # One is unparseable / missing while the other is not
    return False


def reconcile_records(
    org_id: Optional[str] = None,
    location_id: Optional[str] = None,
    reason: Optional[str] = None,
    ordering: Optional[str] = None,
) -> list[dict]:
    """
    Core reconciliation service. Compares System A records and System B entries
    within tenant boundaries and identifies all disagreements.

    Disagreement types:
    1. missing_in_system_b: System A record exists with no corresponding System B entry.
    2. invalid_system_b_reference: System B entry references a nonexistent System A record.
    3. duplicate_system_b_entry: Multiple System B entries reference the same System A record.
    4. value_mismatch: 1-to-1 match between System A and System B with differing numeric values.

    Tenant Isolation:
    Reconciliation is performed per-organization using the Location -> Organization hierarchy.
    When org_id is provided, only records belonging to that organization's locations are processed.
    """
    # 1. Fetch relevant organizations
    orgs_qs = Organization.objects.all()
    if org_id:
        orgs_qs = orgs_qs.filter(org_id=org_id)

    # Prefetch locations with their org
    locations_qs = Location.objects.select_related("org").all()
    if org_id:
        locations_qs = locations_qs.filter(org_id=org_id)
    if location_id:
        locations_qs = locations_qs.filter(location_id=location_id)

    # Fetch System A records
    system_a_qs = SystemARecord.objects.select_related("location", "location__org").all()
    if org_id:
        system_a_qs = system_a_qs.filter(location__org_id=org_id)
    if location_id:
        system_a_qs = system_a_qs.filter(location_id=location_id)

    # Fetch System B entries
    system_b_qs = SystemBEntry.objects.select_related("location", "location__org").all()
    if org_id:
        system_b_qs = system_b_qs.filter(location__org_id=org_id)
    if location_id:
        system_b_qs = system_b_qs.filter(location_id=location_id)

    # Group System A and System B by organization to enforce strict tenant boundary
    org_sa_map: dict[str, dict[str, SystemARecord]] = {}
    for rec in system_a_qs:
        rec_org_id = rec.location.org_id
        org_sa_map.setdefault(rec_org_id, {})[rec.record_id] = rec

    org_sb_map: dict[str, list[SystemBEntry]] = {}
    for entry in system_b_qs:
        entry_org_id = entry.location.org_id
        org_sb_map.setdefault(entry_org_id, []).append(entry)

    disagreements: list[dict] = []

    # Process reconciliation for each organization separately
    target_org_ids = set(orgs_qs.values_list("org_id", flat=True)) | set(org_sa_map.keys()) | set(org_sb_map.keys())

    for current_org_id in sorted(target_org_ids):
        sa_records = org_sa_map.get(current_org_id, {})
        sb_entries = org_sb_map.get(current_org_id, [])

        # Group System B entries by normalized reference
        sb_by_normalized_ref: dict[str, list[SystemBEntry]] = {}
        for entry in sb_entries:
            norm_ref = normalize_reference(entry.record_ref)
            sb_by_normalized_ref.setdefault(norm_ref, []).append(entry)

        # 1. Check for Missing in System B
        for sa_id, sa_rec in sa_records.items():
            if sa_id not in sb_by_normalized_ref:
                disagreements.append({
                    "record_id": sa_rec.record_id,
                    "reason": "missing_in_system_b",
                    "system_a_value": str(sa_rec.total_value) if sa_rec.total_value is not None else None,
                    "system_b_value": None,
                    "location_id": sa_rec.location_id,
                    "location_name": sa_rec.location.location_name,
                    "org_id": sa_rec.location.org_id,
                    "entry_id": None,
                })

        # 2. Check Invalid System B References, Duplicates, and Value Mismatches
        for norm_ref, matched_entries in sb_by_normalized_ref.items():
            if norm_ref not in sa_records:
                # Case 2: Invalid System B reference (points to nonexistent System A record in this tenant)
                for entry in matched_entries:
                    disagreements.append({
                        "record_id": norm_ref or entry.record_ref.strip(),
                        "reason": "invalid_system_b_reference",
                        "system_a_value": None,
                        "system_b_value": entry.raw_value if entry.raw_value != "" else None,
                        "location_id": entry.location_id,
                        "location_name": entry.location.location_name,
                        "org_id": entry.location.org_id,
                        "entry_id": entry.entry_id,
                    })
            elif len(matched_entries) > 1:
                # Case 3: Duplicate System B entry (multiple System B entries refer to same System A record)
                sa_rec = sa_records[norm_ref]
                for entry in matched_entries:
                    disagreements.append({
                        "record_id": norm_ref,
                        "reason": "duplicate_system_b_entry",
                        "system_a_value": str(sa_rec.total_value) if sa_rec.total_value is not None else None,
                        "system_b_value": entry.raw_value if entry.raw_value != "" else None,
                        "location_id": entry.location_id,
                        "location_name": entry.location.location_name,
                        "org_id": entry.location.org_id,
                        "entry_id": entry.entry_id,
                    })
            else:
                # Case 4: Single match -> Check for value mismatch
                sa_rec = sa_records[norm_ref]
                entry = matched_entries[0]
                a_val = sa_rec.total_value
                b_val = entry.parsed_value if entry.parsed_value is not None else entry.raw_value

                if not values_are_equivalent(a_val, b_val):
                    disagreements.append({
                        "record_id": norm_ref,
                        "reason": "value_mismatch",
                        "system_a_value": str(sa_rec.total_value) if sa_rec.total_value is not None else None,
                        "system_b_value": entry.raw_value if entry.raw_value != "" else None,
                        "location_id": sa_rec.location_id,
                        "location_name": sa_rec.location.location_name,
                        "org_id": sa_rec.location.org_id,
                        "entry_id": entry.entry_id,
                    })

    # Apply reason filter if provided
    if reason:
        disagreements = [d for d in disagreements if d["reason"] == reason]

    # Apply ordering if requested
    if ordering:
        reverse = ordering.startswith("-")
        field = ordering[1:] if reverse else ordering

        valid_items = []
        none_items = []
        for item in disagreements:
            val = item.get(field)
            if val is None or val == "":
                none_items.append(item)
            else:
                valid_items.append(item)

        def sort_key(item: dict) -> tuple:
            val = item.get(field)
            dec = parse_decimal_value(val)
            if dec is not None:
                return (0, dec, "")
            return (1, Decimal("0"), str(val).lower())

        valid_items.sort(key=sort_key, reverse=reverse)
        disagreements = valid_items + none_items

    return disagreements
