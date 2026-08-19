from collections import Counter

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from reconciliation.models import SystemARecord, SystemBEntry
from reconciliation.serializers import DisagreementSerializer, ReconciliationSummarySerializer
from reconciliation.services import reconcile_records


class DisagreementListView(APIView):
    """
    API endpoint that returns reconciliation disagreements between System A and System B.
    
    Supported Query Parameters:
    - reason: Filter by disagreement reason (e.g. ?reason=value_mismatch)
    - org_id: Enforce tenant boundary filtering (e.g. ?org_id=ORG-A)
    - location_id: Filter by specific location (e.g. ?location_id=LOC-101)
    - ordering: Sort by field (e.g. ?ordering=system_a_value or ?ordering=-system_a_value)
    """

    def get(self, request, *args, **kwargs):
        reason = request.query_params.get("reason")
        org_id = request.query_params.get("org_id")
        location_id = request.query_params.get("location_id")
        ordering = request.query_params.get("ordering")

        disagreements = reconcile_records(
            org_id=org_id,
            location_id=location_id,
            reason=reason,
            ordering=ordering,
        )

        serializer = DisagreementSerializer(disagreements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReconciliationSummaryView(APIView):
    """
    API endpoint that returns reconciliation aggregate summary statistics.
    """

    def get(self, request, *args, **kwargs):
        org_id = request.query_params.get("org_id")
        location_id = request.query_params.get("location_id")

        disagreements = reconcile_records(org_id=org_id, location_id=location_id)
        reason_counts = dict(Counter(d["reason"] for d in disagreements))

        sa_qs = SystemARecord.objects.all()
        sb_qs = SystemBEntry.objects.all()

        if org_id:
            sa_qs = sa_qs.filter(location__org_id=org_id)
            sb_qs = sb_qs.filter(location__org_id=org_id)
        if location_id:
            sa_qs = sa_qs.filter(location_id=location_id)
            sb_qs = sb_qs.filter(location_id=location_id)

        summary_data = {
            "total_disagreements": len(disagreements),
            "by_reason": reason_counts,
            "total_system_a_records": sa_qs.count(),
            "total_system_b_entries": sb_qs.count(),
        }

        serializer = ReconciliationSummarySerializer(summary_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
