from rest_framework import serializers
from .models import Farm, Crop, IrrigationPlan


class FarmSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farm
        fields = '__all__'
        read_only_fields = ['id', 'company']


class CropSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.farm_name', read_only=True)

    class Meta:
        model = Crop
        fields = '__all__'
        read_only_fields = ['id']


class IrrigationPlanSerializer(serializers.ModelSerializer):
    crop_name = serializers.CharField(source='crop.crop_name', read_only=True)

    class Meta:
        model = IrrigationPlan
        fields = '__all__'
        read_only_fields = ['id']
