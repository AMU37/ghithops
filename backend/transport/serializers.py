from rest_framework import serializers
from .models import (
    ShiftType, Vehicle, Driver, TransportRoute, EmployeeAssignment,
    Trip, TripRoute, RideLog, Violation, EmployeeTransportInfo, AssemblyPoint,
    TransportRequest
)


class ShiftTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftType
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']


class DriverSerializer(serializers.ModelSerializer):
    has_account = serializers.SerializerMethodField()
    user_id = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = Driver
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'user']
        extra_kwargs = {'pin': {'write_only': True, 'required': False}}

    def get_has_account(self, obj):
        return bool(obj.user_id)

    def validate_pin(self, value):
        if value and len(value) < 4:
            raise serializers.ValidationError('الرمز السري يجب أن يكون 4 أحرف على الأقل')
        return value


class TransportRouteSerializer(serializers.ModelSerializer):
    default_vehicle_plate = serializers.CharField(source='default_vehicle.plate_number', read_only=True, allow_null=True)
    default_driver_name = serializers.CharField(source='default_driver.name', read_only=True, allow_null=True)
    shift_type_name = serializers.CharField(source='shift_type.name', read_only=True, allow_null=True)

    class Meta:
        model = TransportRoute
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']


class EmployeeAssignmentSerializer(serializers.ModelSerializer):
    route_name = serializers.CharField(source='route.name', read_only=True)

    class Meta:
        model = EmployeeAssignment
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']


class TripRouteSerializer(serializers.ModelSerializer):
    route_name = serializers.CharField(source='route.name', read_only=True)

    class Meta:
        model = TripRoute
        fields = '__all__'
        read_only_fields = ['id']


class TripSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True, allow_null=True)
    driver_name = serializers.CharField(source='driver.name', read_only=True, allow_null=True)
    route_name = serializers.CharField(source='route.name', read_only=True, allow_null=True)
    rider_count = serializers.SerializerMethodField()
    planned_count = serializers.SerializerMethodField()
    trip_routes = TripRouteSerializer(many=True, read_only=True)
    route_names = serializers.SerializerMethodField()
    riders = serializers.SerializerMethodField()
    assembly_point_name = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'started_at', 'completed_at']

    def get_rider_count(self, obj):
        return obj.ride_logs.filter(action='board').count()

    def get_planned_count(self, obj):
        return obj.ride_logs.filter(action='assigned').count()

    def get_route_names(self, obj):
        names = []
        if obj.route:
            names.append(obj.route.name)
        for tr in obj.trip_routes.all():
            if tr.route and tr.route.name not in names:
                names.append(tr.route.name)
        return names

    def get_riders(self, obj):
        # Each employee appears once; if both assigned and board exist, show 'board'
        logs = obj.ride_logs.filter(action__in=['assigned', 'board']).order_by('employee_id', '-action').values('employee_id', 'employee_name', 'action')
        seen = set()
        unique = []
        assigned_ids = set()
        for l in logs:
            if l['action'] == 'assigned':
                assigned_ids.add(l['employee_id'])
            if l['employee_id'] not in seen:
                seen.add(l['employee_id'])
                unique.append(l)
        emp_ids = [l['employee_id'] for l in unique]
        infos = {}
        if emp_ids:
            from .models import EmployeeTransportInfo
            qs = EmployeeTransportInfo.objects.filter(employee_id__in=emp_ids).select_related('assembly_point').values(
                'employee_id', 'employee_name', 'department', 'assembly_point__name'
            )
            for i in qs:
                infos[i['employee_id']] = i
        result = []
        for l in unique:
            info = infos.get(l['employee_id'], {})
            result.append({
                'employee_id': l['employee_id'],
                'employee_name': info.get('employee_name') or l['employee_name'],
                'department': info.get('department'),
                'assembly_point': info.get('assembly_point__name'),
                'action': l['action'],
                'was_assigned': l['employee_id'] in assigned_ids,
            })
        result.sort(key=lambda r: r['assembly_point'] or '')
        return result

    def get_assembly_point_name(self, obj):
        if obj.route:
            ap = obj.route.assembly_points.first()
            if ap:
                return ap.name
        return None


class TripCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'started_at', 'completed_at']


class RideLogSerializer(serializers.ModelSerializer):
    trip_info = serializers.SerializerMethodField()

    class Meta:
        model = RideLog
        fields = '__all__'
        read_only_fields = ['id', 'company', 'time']

    def get_trip_info(self, obj):
        if obj.trip:
            route_name = obj.trip.route.name if obj.trip.route else '-'
            return f"{obj.trip.trip_date} - {route_name}"
        return '-'


class ViolationSerializer(serializers.ModelSerializer):
    trip_info = serializers.SerializerMethodField()

    class Meta:
        model = Violation
        fields = '__all__'
        read_only_fields = ['id', 'company', 'resolved_at']

    def get_trip_info(self, obj):
        if obj.trip:
            return f"{obj.trip.trip_date} - {obj.trip.route.name if obj.trip.route else '-'}"
        return '-'


class AssemblyPointSerializer(serializers.ModelSerializer):
    route_name = serializers.CharField(source='route.name', read_only=True, allow_null=True)

    class Meta:
        model = AssemblyPoint
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']


class EmployeeTransportInfoSerializer(serializers.ModelSerializer):
    shift_type_name = serializers.CharField(source='shift_type.name', read_only=True, allow_null=True)
    route_name = serializers.CharField(source='route.name', read_only=True, allow_null=True)
    assembly_point_name = serializers.CharField(source='assembly_point.name', read_only=True, allow_null=True)
    cycle_status = serializers.SerializerMethodField()
    employee_full_name = serializers.CharField(source='employee_record.full_name', read_only=True, allow_null=True)
    employee_department_name = serializers.CharField(source='employee_record.department.name', read_only=True, allow_null=True)

    class Meta:
        model = EmployeeTransportInfo
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']
        extra_kwargs = {'pin': {'write_only': True, 'required': False}}

    def get_cycle_status(self, obj):
        from datetime import date
        from .cycle_utils import get_employee_cycle_status
        result = get_employee_cycle_status(obj, date.today())
        if result:
            return {
                'status': result['status'],
                'label': result['label'],
                'color': result['color'],
                'position_in_cycle': result['position_in_cycle'],
                'cycle_len': result['cycle_len'],
                'work_days': result['work_days'],
                'vacation_days': result['vacation_days'],
                'start_date': result['start_date'],
                'cycle_start': result['cycle_start'],
                'work_start': result['work_start'],
                'work_end': result['work_end'],
                'vacation_start': result['vacation_start'],
                'vacation_end': result['vacation_end'],
            }
        return None


class TransportRequestSerializer(serializers.ModelSerializer):
    assigned_driver_name = serializers.CharField(source='assigned_driver.name', read_only=True, allow_null=True)
    assigned_vehicle_plate = serializers.CharField(source='assigned_vehicle.plate_number', read_only=True, allow_null=True)

    class Meta:
        model = TransportRequest
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'completed_at']
