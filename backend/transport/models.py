import uuid
from django.db import models
from core.models import Company


class ShiftType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='shift_types')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    work_days = models.IntegerField(default=6)
    vacation_days = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'), ('inactive', 'Inactive'),
    ], default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_shift_type'

    def __str__(self):
        return self.name


class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='vehicles')
    plate_number = models.CharField(max_length=50)
    vehicle_type = models.CharField(max_length=50, choices=[
        ("باص", "باص"), ("دينة", "دينة"), ("سيارة", "سيارة"),
        ("دراجة", "دراجة"), ("شاحنة", "شاحنة"), ("أخرى", "أخرى"),
    ], default="باص")
    bus_number = models.CharField(max_length=50, blank=True, default='', verbose_name="رقم الباص")
    vehicle_purpose = models.CharField(max_length=50, blank=True, default='', verbose_name="غرض المركبة", choices=[
        ("توصيل الموظفين", "توصيل الموظفين"),
        ("توصيل مشتريات", "توصيل مشتريات"),
        ("توصيل خدمات", "توصيل خدمات"),
        ("توصيل مخلفات", "توصيل مخلفات"),
        ("سيارة نقل صغير", "سيارة نقل صغير"),
        ("اسعاف", "اسعاف"),
        ("اطفاء", "اطفاء"),
        ("توصيل خياطات", "توصيل خياطات"),
    ])
    fuel_efficiency = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name="معدل استهلاك الوقود (كم/لتر)")
    capacity = models.IntegerField(default=30)
    model = models.CharField(max_length=255, blank=True)
    color = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('maintenance', 'Maintenance'),
        ('out_of_service', 'Out of Service'),
    ], default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_bus'

    def __str__(self):
        return f"{self.plate_number} - {self.model}"


class Driver(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='drivers')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    license_number = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=255, blank=True, null=True)
    username = models.CharField(max_length=80, blank=True, null=True)
    pin = models.CharField(max_length=128, blank=True, default='')
    user = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='driver_profile')
    status = models.CharField(max_length=20, choices=[
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('off_duty', 'Off Duty'),
        ('inactive', 'Inactive'),
    ], default='available')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_driver'

    def __str__(self):
        return self.name


class TransportRoute(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='transport_routes')
    name = models.CharField(max_length=255)
    area = models.CharField(max_length=255, blank=True)
    departure_time = models.TimeField(null=True, blank=True)
    return_time = models.TimeField(null=True, blank=True)
    work_days = models.JSONField(default=list, blank=True)
    shift_type = models.ForeignKey(ShiftType, on_delete=models.SET_NULL, null=True, blank=True, related_name='routes')
    default_vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='routes_as_default')
    default_driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='routes_as_default')
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'), ('inactive', 'Inactive'),
    ], default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_route'

    def __str__(self):
        return self.name


class EmployeeAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='et_assignments')
    employee_id = models.CharField(max_length=255)
    employee_name = models.CharField(max_length=255, blank=True)
    route = models.ForeignKey(TransportRoute, on_delete=models.CASCADE, related_name='assignments')
    shift_type = models.ForeignKey(ShiftType, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments')
    is_residential = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'), ('suspended', 'Suspended'),
    ], default='active')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_assignment'

    def __str__(self):
        return f"{self.employee_name} -> {self.route}"


class Trip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='trips')
    route = models.ForeignKey(TransportRoute, on_delete=models.SET_NULL, null=True, related_name='trips')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='trips')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='trips')
    trip_date = models.DateField()
    departure_time = models.TimeField(null=True, blank=True)
    return_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], default='scheduled')
    departure_note = models.TextField(blank=True)
    return_note = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    driver_completed = models.BooleanField(default=False)
    driver_completed_at = models.DateTimeField(null=True, blank=True)
    fuel_consumed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="الوقود المستهلك (لتر)")
    actual_return_time = models.DateTimeField(null=True, blank=True, verbose_name="وقت الوصول الفعلي")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_trip'

    def __str__(self):
        return f"Trip {self.trip_date} - {self.route}"


class TripRoute(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='trip_routes')
    route = models.ForeignKey(TransportRoute, on_delete=models.CASCADE, related_name='trip_links')
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'et_trip_route'
        ordering = ['order']

    def __str__(self):
        return f"{self.trip} -> {self.route}"


class RideLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ride_logs')
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='ride_logs')
    employee_id = models.CharField(max_length=255)
    employee_name = models.CharField(max_length=255, blank=True)
    action = models.CharField(max_length=20, choices=[
        ('assigned', 'Assigned'),
        ('board', 'Board'),
        ('disembark', 'Disembark'),
        ('absent', 'Absent'),
    ])
    time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='on_time')
    method = models.CharField(max_length=20, default='manual')
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'et_ride_log'
        ordering = ['-time']

    def __str__(self):
        return f"{self.employee_name} - {self.action} on {self.trip}"


class Violation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='transport_violations')
    employee_id = models.CharField(max_length=255)
    employee_name = models.CharField(max_length=255, blank=True)
    trip = models.ForeignKey(Trip, on_delete=models.SET_NULL, null=True, blank=True, related_name='violations')
    violation_type = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    date = models.DateField()
    resolved = models.BooleanField(default=False)
    resolved_by = models.CharField(max_length=255, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'et_violation'

    def __str__(self):
        return f"{self.violation_type} - {self.employee_name}"


class AssemblyPoint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='assembly_points')
    name = models.CharField(max_length=255)
    area = models.CharField(max_length=255, blank=True)
    route = models.ForeignKey(TransportRoute, on_delete=models.SET_NULL, null=True, blank=True, related_name='assembly_points')
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'), ('inactive', 'Inactive'),
    ], default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_assembly_point'

    def __str__(self):
        return self.name


class EmployeeTransportInfo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='employee_transport_infos')
    employee_record = models.ForeignKey('employees.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='transport_infos')
    employee_id = models.CharField(max_length=255, unique=True)
    employee_name = models.CharField(max_length=255, blank=True)
    department = models.CharField(max_length=100, blank=True)
    shift_type = models.ForeignKey(ShiftType, on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_infos')
    shift_start_date = models.DateField(null=True, blank=True)
    work_day = models.CharField(max_length=20, blank=True)
    movement_status = models.CharField(max_length=50, blank=True)
    is_administrative = models.BooleanField(default=True)
    arrival_time = models.TimeField(null=True, blank=True)
    departure_time = models.TimeField(null=True, blank=True)
    route = models.ForeignKey(TransportRoute, on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_infos')
    assembly_point = models.ForeignKey(AssemblyPoint, on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_infos')
    external_company = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    residence_location = models.CharField(max_length=200, blank=True)
    transport_type = models.CharField(max_length=50, default='ورديات')
    pin = models.CharField(max_length=128, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_employee_info'

    def __str__(self):
        return f"{self.employee_name} transport info"


class TransportRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='transport_requests')
    employee_id = models.CharField(max_length=255, blank=True, default='')
    employee_name = models.CharField(max_length=255, blank=True)
    requester_section = models.CharField(max_length=255, blank=True, default='')
    purpose = models.CharField(max_length=255)
    transport_type = models.CharField(max_length=50, default="باص")
    destination = models.CharField(max_length=255, blank=True)
    requested_time = models.TimeField(null=True, blank=True)
    request_date = models.DateField()
    status = models.CharField(max_length=20, choices=[
        ('pending', 'قيد الانتظار'),
        ('manager_pending', 'بانتظار المدير'),
        ('in_progress', 'تحت التنفيذ'),
        ('completed', 'مكتملة'),
        ('rejected', 'مرفوضة'),
    ], default='pending')
    assigned_driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='transport_requests')
    assigned_vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='transport_requests')
    departure_time = models.DateTimeField(null=True, blank=True)
    return_time = models.DateTimeField(null=True, blank=True)
    fuel_consumed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    distance_traveled = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="المسافة المقطوعة (كم)")
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'et_transport_request'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee_name} - {self.purpose}"
