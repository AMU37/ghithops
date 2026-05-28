import uuid
from django.db import models
from core.models import Company


class ServiceRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='service_requests')
    employee_name = models.CharField(max_length=255, blank=True, default='')
    request_type = models.CharField(max_length=100, blank=True, default='')
    description = models.TextField(blank=True, default='')
    request_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    priority = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ], default='medium')

    class Meta:
        db_table = 'service_requests'

    def __str__(self):
        return f"{self.request_type} - {self.status}"


class Technician(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    specialization = models.CharField(max_length=255)

    class Meta:
        db_table = 'technicians'

    def __str__(self):
        return self.full_name


class WorkOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name='work_orders')
    technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True, related_name='work_orders')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ], default='pending')

    class Meta:
        db_table = 'work_orders'

    def __str__(self):
        return f"WorkOrder for {self.request}"
