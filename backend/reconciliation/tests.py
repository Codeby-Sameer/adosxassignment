from decimal import Decimal
import io
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APITestCase

from reconciliation.models import Location, Organization, SystemARecord, SystemBEntry
from reconciliation.services import (
    normalize_reference,
    parse_decimal_value,
    reconcile_records,
    values_are_equivalent,
)


class NormalizationTests(TestCase):
    """
    Tests for reference normalization logic.
    """

    def test_standard_reference(self):
        self.assertEqual(normalize_reference("REC-1001"), "REC-1001")

    def test_whitespace_and_spaces_around_hyphen(self):
        self.assertEqual(normalize_reference(" REC - 1070 "), "REC-1070")
        self.assertEqual(normalize_reference("  REC-1001  "), "REC-1001")
        self.assertEqual(normalize_reference("REC -1002"), "REC-1002")
        self.assertEqual(normalize_reference("REC- 1003"), "REC-1003")

    def test_lowercase_variations(self):
        self.assertEqual(normalize_reference("rec1034"), "REC-1034")
        self.assertEqual(normalize_reference("rec-1001"), "REC-1001")

    def test_pure_digits(self):
        self.assertEqual(normalize_reference("1112"), "REC-1112")
        self.assertEqual(normalize_reference(" 1050 "), "REC-1050")

    def test_invalid_or_unrecognized_references(self):
        self.assertEqual(normalize_reference("INVALID_XYZ"), "INVALID-XYZ")
        self.assertEqual(normalize_reference(""), "")
        self.assertEqual(normalize_reference(None), "")


class NumericEquivalenceTests(TestCase):
    """
    Tests for numeric parsing and equivalence logic.
    """

    def test_parse_decimal_formats(self):
        self.assertEqual(parse_decimal_value("100"), Decimal("100"))
        self.assertEqual(parse_decimal_value("100.00"), Decimal("100.00"))
        self.assertEqual(parse_decimal_value("1,25,400.00"), Decimal("125400.00"))
        self.assertEqual(parse_decimal_value("1,000,000.50"), Decimal("1000000.50"))
        self.assertIsNone(parse_decimal_value(""))
        self.assertIsNone(parse_decimal_value("   "))
        self.assertIsNone(parse_decimal_value("invalid_num"))
        self.assertIsNone(parse_decimal_value(None))

    def test_values_are_equivalent(self):
        # Equivalent representations must NOT be flagged as mismatches
        self.assertTrue(values_are_equivalent("100", "100.00"))
        self.assertTrue(values_are_equivalent(Decimal("100.00"), "100"))
        self.assertTrue(values_are_equivalent("1,25,400.00", "125400.00"))
        self.assertTrue(values_are_equivalent("0", "0.00"))
        self.assertTrue(values_are_equivalent(None, ""))
        self.assertTrue(values_are_equivalent("", None))

        # Distinct numbers must return False
        self.assertFalse(values_are_equivalent("100", "105"))
        self.assertFalse(values_are_equivalent("100", ""))
        self.assertFalse(values_are_equivalent("100", None))
        self.assertFalse(values_are_equivalent("invalid", "100"))


class ReconciliationServiceTests(TestCase):
    """
    Tests for the core reconciliation service identifying all four required cases.
    """

    def setUp(self):
        self.org_a = Organization.objects.create(org_id="ORG-A", name="Organization A")
        self.org_b = Organization.objects.create(org_id="ORG-B", name="Organization B")

        self.loc_101 = Location.objects.create(location_id="LOC-101", org=self.org_a, location_name="Location 101")
        self.loc_102 = Location.objects.create(location_id="LOC-102", org=self.org_a, location_name="Location 102")
        self.loc_201 = Location.objects.create(location_id="LOC-201", org=self.org_b, location_name="Location 201")

    def test_case_1_missing_in_system_b(self):
        """
        System A contains a record but System B has no corresponding entry.
        """
        SystemARecord.objects.create(
            record_id="REC-2001",
            location=self.loc_101,
            total_value=Decimal("5000.00"),
        )

        disagreements = reconcile_records(org_id="ORG-A")
        self.assertEqual(len(disagreements), 1)
        d = disagreements[0]
        self.assertEqual(d["record_id"], "REC-2001")
        self.assertEqual(d["reason"], "missing_in_system_b")
        self.assertEqual(d["system_a_value"], "5000.00")
        self.assertIsNone(d["system_b_value"])
        self.assertEqual(d["location_id"], "LOC-101")
        self.assertEqual(d["org_id"], "ORG-A")

    def test_case_2_invalid_system_b_reference(self):
        """
        System B contains an entry whose reference points to a System A record that does not exist.
        """
        SystemBEntry.objects.create(
            entry_id="ENT-9001",
            record_ref="REC-9999",
            location=self.loc_101,
            raw_value="7500.00",
            parsed_value=Decimal("7500.00"),
        )

        disagreements = reconcile_records(org_id="ORG-A")
        self.assertEqual(len(disagreements), 1)
        d = disagreements[0]
        self.assertEqual(d["record_id"], "REC-9999")
        self.assertEqual(d["reason"], "invalid_system_b_reference")
        self.assertIsNone(d["system_a_value"])
        self.assertEqual(d["system_b_value"], "7500.00")
        self.assertEqual(d["location_id"], "LOC-101")
        self.assertEqual(d["org_id"], "ORG-A")

    def test_case_3_duplicate_system_b_entry(self):
        """
        Multiple System B entries refer to the same System A record.
        None of the original entries should be hidden.
        """
        SystemARecord.objects.create(
            record_id="REC-2002",
            location=self.loc_101,
            total_value=Decimal("10000.00"),
        )
        SystemBEntry.objects.create(
            entry_id="ENT-9002A",
            record_ref="REC-2002",
            location=self.loc_101,
            raw_value="6000.00",
            parsed_value=Decimal("6000.00"),
        )
        SystemBEntry.objects.create(
            entry_id="ENT-9002B",
            record_ref="rec2002",
            location=self.loc_101,
            raw_value="4000.00",
            parsed_value=Decimal("4000.00"),
        )

        disagreements = reconcile_records(org_id="ORG-A")
        self.assertEqual(len(disagreements), 2)
        for d in disagreements:
            self.assertEqual(d["record_id"], "REC-2002")
            self.assertEqual(d["reason"], "duplicate_system_b_entry")
            self.assertEqual(d["system_a_value"], "10000.00")
            self.assertIn(d["entry_id"], ["ENT-9002A", "ENT-9002B"])

    def test_case_4_value_mismatch(self):
        """
        System A and System B refer to the same record but report different values.
        """
        SystemARecord.objects.create(
            record_id="REC-2003",
            location=self.loc_101,
            total_value=Decimal("15000.00"),
        )
        SystemBEntry.objects.create(
            entry_id="ENT-9003",
            record_ref="REC-2003",
            location=self.loc_101,
            raw_value="12000.00",
            parsed_value=Decimal("12000.00"),
        )

        disagreements = reconcile_records(org_id="ORG-A")
        self.assertEqual(len(disagreements), 1)
        d = disagreements[0]
        self.assertEqual(d["record_id"], "REC-2003")
        self.assertEqual(d["reason"], "value_mismatch")
        self.assertEqual(d["system_a_value"], "15000.00")
        self.assertEqual(d["system_b_value"], "12000.00")

    def test_non_error_equivalent_values_not_flagged(self):
        """
        Prove that equivalent representations (e.g. 100 vs '100.00' or '1,25,400.00')
        are NOT flagged as disagreements.
        """
        SystemARecord.objects.create(
            record_id="REC-2004",
            location=self.loc_101,
            total_value=Decimal("100.00"),
        )
        SystemBEntry.objects.create(
            entry_id="ENT-9004",
            record_ref="REC-2004",
            location=self.loc_101,
            raw_value="100",
            parsed_value=Decimal("100.00"),
        )

        SystemARecord.objects.create(
            record_id="REC-2005",
            location=self.loc_102,
            total_value=Decimal("125400.00"),
        )
        SystemBEntry.objects.create(
            entry_id="ENT-9005",
            record_ref=" REC - 2005 ",
            location=self.loc_102,
            raw_value="1,25,400.00",
            parsed_value=Decimal("125400.00"),
        )

        disagreements = reconcile_records(org_id="ORG-A")
        self.assertEqual(len(disagreements), 0)

    def test_tenant_isolation(self):
        """
        Ensure queries for Organization A never expose records from Organization B.
        """
        # ORG-A record
        SystemARecord.objects.create(
            record_id="REC-A1",
            location=self.loc_101,
            total_value=Decimal("1000.00"),
        )
        # ORG-B record
        SystemARecord.objects.create(
            record_id="REC-B1",
            location=self.loc_201,
            total_value=Decimal("2000.00"),
        )

        org_a_disagreements = reconcile_records(org_id="ORG-A")
        self.assertEqual(len(org_a_disagreements), 1)
        self.assertEqual(org_a_disagreements[0]["record_id"], "REC-A1")
        self.assertEqual(org_a_disagreements[0]["org_id"], "ORG-A")

        org_b_disagreements = reconcile_records(org_id="ORG-B")
        self.assertEqual(len(org_b_disagreements), 1)
        self.assertEqual(org_b_disagreements[0]["record_id"], "REC-B1")
        self.assertEqual(org_b_disagreements[0]["org_id"], "ORG-B")


class CSVImportCommandTests(TestCase):
    """
    Tests for the import_csv management command.
    """

    def test_import_csv_dirty_data_survives(self):
        """
        Ensure CSV import survives unparseable values, missing fields, invalid references,
        and duplicate entries without dropping any rows.
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            loc_csv = temp_path / "locations.csv"
            sa_csv = temp_path / "system_a.csv"
            sb_csv = temp_path / "system_b.csv"

            loc_csv.write_text(
                "location_id,org_id,location_name\n"
                "LOC-T1,ORG-T,Test Location 1\n"
            )
            sa_csv.write_text(
                "record_id,location_id,event_date,category_code,actor_id,base_value,adjustment,total_value,state\n"
                "REC-T1,LOC-T1,2026-01-01,CAT-01,,100.00,20.00,120.00,CONFIRMED\n"
                "REC-T2,LOC-T1,2026-01-02,CAT-02,USR-1,unparseable,10.00,unparseable,CONFIRMED\n"
            )
            sb_csv.write_text(
                "entry_id,record_ref,location_id,recorded_on,value,label\n"
                "ENT-T1,REC-T1,LOC-T1,2026-01-01,120.00,Entry 1\n"
                "ENT-T2, rec-t1 ,LOC-T1,2026-01-01,120.00,Duplicate Entry\n"
                "ENT-T3,REC-NONEXISTENT,LOC-T1,2026-01-01,50.00,Invalid Ref\n"
                "ENT-T4,REC-T2,LOC-T1,2026-01-02,,Blank Value Entry\n"
            )

            out = io.StringIO()
            call_command("import_csv", data_dir=str(temp_path), stdout=out)
            output = out.getvalue()

            self.assertIn("System A:\n2 rows processed\n2 rows stored", output)
            self.assertIn("System B:\n4 rows processed\n4 rows stored", output)

            self.assertEqual(SystemARecord.objects.count(), 2)
            self.assertEqual(SystemBEntry.objects.count(), 4)


class DisagreementsAPITests(APITestCase):
    """
    Tests for the DRF API endpoints.
    """

    def setUp(self):
        self.org_a = Organization.objects.create(org_id="ORG-A", name="Organization A")
        self.loc_101 = Location.objects.create(location_id="LOC-101", org=self.org_a, location_name="Location 101")

        SystemARecord.objects.create(
            record_id="REC-1",
            location=self.loc_101,
            total_value=Decimal("100.00"),
        )
        SystemARecord.objects.create(
            record_id="REC-2",
            location=self.loc_101,
            total_value=Decimal("200.00"),
        )
        # Value mismatch on REC-2
        SystemBEntry.objects.create(
            entry_id="ENT-2",
            record_ref="REC-2",
            location=self.loc_101,
            raw_value="250.00",
            parsed_value=Decimal("250.00"),
        )

    def test_get_disagreements_list(self):
        response = self.client.get("/api/disagreements/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)  # REC-1 missing_in_system_b, REC-2 value_mismatch

    def test_filter_by_reason(self):
        response = self.client.get("/api/disagreements/?reason=value_mismatch")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["reason"], "value_mismatch")
        self.assertEqual(data[0]["record_id"], "REC-2")

    def test_ordering(self):
        response = self.client.get("/api/disagreements/?ordering=-system_a_value")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data[0]["record_id"], "REC-2")
        self.assertEqual(data[1]["record_id"], "REC-1")
