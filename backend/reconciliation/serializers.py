from rest_framework import serializers


class DisagreementSerializer(serializers.Serializer):
    """
    Serializer representing a reconciliation disagreement between System A and System B.
    """
    record_id = serializers.CharField(
        help_text="The record identifier (System A record_id or normalized System B record_ref)."
    )
    reason = serializers.CharField(
        help_text="Primary reason for disagreement: missing_in_system_b, invalid_system_b_reference, duplicate_system_b_entry, or value_mismatch."
    )
    reasons = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="All applicable reasons for this record (e.g. duplicate entry with value mismatch).",
    )
    system_a_value = serializers.CharField(
        allow_null=True,
        help_text="The total value reported by System A, or null if missing.",
    )
    system_b_value = serializers.CharField(
        allow_null=True,
        help_text="The raw or parsed value reported by System B, or null if missing.",
    )
    location_id = serializers.CharField(
        help_text="Location ID associated with the record."
    )
    location_name = serializers.CharField(
        help_text="Location name associated with the record."
    )
    org_id = serializers.CharField(
        help_text="Organization / Tenant ID associated with the location."
    )
    entry_id = serializers.CharField(
        allow_null=True,
        required=False,
        help_text="System B entry identifier if applicable.",
    )


class ReconciliationSummarySerializer(serializers.Serializer):
    """
    Serializer providing high-level reconciliation metrics.
    """
    total_disagreements = serializers.IntegerField()
    by_reason = serializers.DictField(child=serializers.IntegerField())
    total_system_a_records = serializers.IntegerField()
    total_system_b_entries = serializers.IntegerField()
