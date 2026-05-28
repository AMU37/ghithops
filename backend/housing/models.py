import uuid
from django.db import models
from core.models import Company


class HousingBuilding(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='housing_buildings')
    building_name = models.CharField(max_length=255)
    location = models.TextField()
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('maintenance', 'Maintenance'),
        ('inactive', 'Inactive'),
    ], default='active')

    class Meta:
        db_table = 'housing_buildings'

    def __str__(self):
        return self.building_name


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(HousingBuilding, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=50)
    capacity = models.IntegerField()
    status = models.CharField(max_length=20, choices=[
        ('available', 'Available'),
        ('occupied', 'Occupied'),
        ('maintenance', 'Maintenance'),
    ], default='available')

    class Meta:
        db_table = 'rooms'

    def __str__(self):
        return f"{self.building.building_name} - Room {self.room_number}"


class HousingRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_name = models.CharField(max_length=255)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='housing_requests')
    request_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ], default='pending')

    class Meta:
        db_table = 'housing_requests'

    def __str__(self):
        return f"{self.employee_name} - {self.status}"


class OccupancyLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='occupancy_logs')
    employee_name = models.CharField(max_length=255)
    check_in = models.DateTimeField()
    check_out = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'occupancy_logs'

    def __str__(self):
        return f"{self.employee_name} in {self.room}"
