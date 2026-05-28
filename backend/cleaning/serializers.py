from rest_framework import serializers
from .models import CleaningTask, CleaningTeam, Inspection


class CleaningTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = CleaningTask
        fields = '__all__'
        read_only_fields = ['id', 'company']


class CleaningTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = CleaningTeam
        fields = '__all__'
        read_only_fields = ['id', 'company']


class InspectionSerializer(serializers.ModelSerializer):
    task_location = serializers.CharField(source='task.location', read_only=True, allow_null=True)

    class Meta:
        model = Inspection
        fields = '__all__'
        read_only_fields = ['id']
