from django.db import models


class Organization(models.Model):
    """
    Represents an organization/tenant boundary.
    All locations belong to a single organization.
    """
    org_id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['org_id']

    def __str__(self):
        return f"{self.org_id} ({self.name})" if self.name else self.org_id


class Location(models.Model):
    """
    Represents a physical or logical location owned by exactly one organization.
    """
    location_id = models.CharField(max_length=64, primary_key=True)
    org = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='locations',
        db_index=True,
    )
    location_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['location_id']

    def __str__(self):
        return f"{self.location_id} - {self.location_name}"


class SystemARecord(models.Model):
    """
    Represents a record originating from System A.
    """
    record_id = models.CharField(max_length=64, primary_key=True)
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='system_a_records',
        db_index=True,
    )
    event_date = models.DateField(null=True, blank=True)
    category_code = models.CharField(max_length=64, blank=True)
    actor_id = models.CharField(max_length=64, blank=True, null=True)
    base_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    adjustment = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    total_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    state = models.CharField(max_length=64, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['record_id']

    def __str__(self):
        return f"SystemARecord({self.record_id}, total={self.total_value})"


class SystemBEntry(models.Model):
    """
    Represents an entry originating from System B.
    record_ref references System A, but is stored as raw text to allow
    malformed/invalid/duplicate references to survive import.
    """
    entry_id = models.CharField(max_length=64, primary_key=True)
    record_ref = models.CharField(max_length=128, db_index=True)
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='system_b_entries',
        db_index=True,
    )
    recorded_on = models.DateField(null=True, blank=True)
    raw_value = models.CharField(max_length=64, blank=True, default='')
    parsed_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    label = models.CharField(max_length=255, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['entry_id']

    def __str__(self):
        return f"SystemBEntry({self.entry_id}, ref={self.record_ref}, raw_val={self.raw_value})"
