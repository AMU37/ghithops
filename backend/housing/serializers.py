from rest_framework import serializers
from .models import HousingBuilding, Room, HousingRequest, OccupancyLog


class HousingBuildingSerializer(serializers.ModelSerializer):
    room_count = serializers.SerializerMethodField()

    class Meta:
        model = HousingBuilding
        fields = '__all__'
        read_only_fields = ['id', 'company']

    def get_room_count(self, obj):
        return obj.rooms.count()


class RoomSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.building_name', read_only=True)

    class Meta:
        model = Room
        fields = '__all__'
        read_only_fields = ['id']


class HousingRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = HousingRequest
        fields = '__all__'
        read_only_fields = ['id', 'company']


class OccupancyLogSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source='room.room_number', read_only=True)

    class Meta:
        model = OccupancyLog
        fields = '__all__'
        read_only_fields = ['id']
