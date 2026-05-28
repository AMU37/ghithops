from rest_framework import serializers
from .models import ServiceRequest, Technician, WorkOrder


class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = '__all__'
        read_only_fields = ['id', 'company']


class TechnicianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Technician
        fields = '__all__'
        read_only_fields = ['id']


class WorkOrderSerializer(serializers.ModelSerializer):
    request_description = serializers.CharField(source='request.description', read_only=True)
    technician_name = serializers.CharField(source='technician.full_name', read_only=True, allow_null=True)

    class Meta:
        model = WorkOrder
        fields = '__all__'
        read_only_fields = ['id']
