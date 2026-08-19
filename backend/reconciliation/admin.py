from django.contrib import admin

from reconciliation.models import Location, Organization, SystemARecord, SystemBEntry


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("org_id", "name", "created_at")
    search_fields = ("org_id", "name")


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("location_id", "location_name", "org", "created_at")
    list_filter = ("org",)
    search_fields = ("location_id", "location_name")


@admin.register(SystemARecord)
class SystemARecordAdmin(admin.ModelAdmin):
    list_display = ("record_id", "location", "total_value", "state", "event_date")
    list_filter = ("location__org", "location", "state")
    search_fields = ("record_id", "actor_id", "category_code")


@admin.register(SystemBEntry)
class SystemBEntryAdmin(admin.ModelAdmin):
    list_display = ("entry_id", "record_ref", "location", "raw_value", "parsed_value", "recorded_on")
    list_filter = ("location__org", "location")
    search_fields = ("entry_id", "record_ref", "label")
