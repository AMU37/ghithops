import uuid
from django.db import models
from core.models import Company


class AssetCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='asset_categories')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'asset_categories'

    def __str__(self):
        return self.name


class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='assets')
    category = models.ForeignKey(AssetCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='assets')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, blank=True)
    quantity = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=[
        ('available', 'Available'),
        ('assigned', 'Assigned'),
        ('maintenance', 'Maintenance'),
        ('scrapped', 'Scrapped'),
    ], default='available')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'assets'

    def __str__(self):
        return f"{self.name} ({self.code or '-'})"


class AssetRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='asset_requests')
    employee_name = models.CharField(max_length=255)
    asset = models.ForeignKey(Asset, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    category = models.ForeignKey(AssetCategory, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    purpose = models.CharField(max_length=255, blank=True)
    request_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ], default='pending')
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'asset_requests'

    def __str__(self):
        return f"{self.employee_name} - {self.asset or self.category}"
