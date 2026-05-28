from rest_framework import serializers
from .models import Employee, ServiceType
from transport.models import ShiftType, EmployeeTransportInfo


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    service_type_name = serializers.CharField(source='service_type.name', read_only=True, allow_null=True)
    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    shift_type = serializers.SerializerMethodField()
    shift_type_name = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'department']

    def get_shift_type(self, obj):
        st_id = getattr(obj, '_transport_shift_type_id', None)
        if st_id is not None:
            return str(st_id)
        try:
            ti = EmployeeTransportInfo.objects.filter(employee_id=obj.employee_id).first()
            return str(ti.shift_type_id) if ti and ti.shift_type_id else None
        except Exception:
            return None

    def get_shift_type_name(self, obj):
        name = getattr(obj, '_transport_shift_type_name', None)
        if name is not None:
            return name
        try:
            ti = EmployeeTransportInfo.objects.filter(employee_id=obj.employee_id).select_related('shift_type').first()
            return ti.shift_type.name if ti and ti.shift_type else None
        except Exception:
            return None

    def get_city(self, obj):
        city = getattr(obj, '_transport_city', None)
        if city is not None:
            return city
        try:
            ti = EmployeeTransportInfo.objects.filter(employee_id=obj.employee_id).first()
            return ti.city if ti else None
        except Exception:
            return None


class ShiftTypeReadOnlySerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftType
        fields = '__all__'
        read_only_fields = ['id', 'company', 'name', 'description', 'work_days', 'vacation_days', 'status', 'created_at']


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at']
