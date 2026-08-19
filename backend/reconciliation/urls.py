from django.urls import path

from reconciliation.views import DisagreementListView, ReconciliationSummaryView

urlpatterns = [
    path("disagreements/", DisagreementListView.as_view(), name="disagreements-list"),
    path("summary/", ReconciliationSummaryView.as_view(), name="reconciliation-summary"),
]
