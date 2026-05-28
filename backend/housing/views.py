from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import HousingBuilding, Room, HousingRequest, OccupancyLog
from .serializers import (
    HousingBuildingSerializer, RoomSerializer,
    HousingRequestSerializer, OccupancyLogSerializer
)


class HousingBuildingViewSet(viewsets.ModelViewSet):
    module = 'housing'
    serializer_class = HousingBuildingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HousingBuilding.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class RoomViewSet(viewsets.ModelViewSet):
    module = 'housing'
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Room.objects.filter(building__company=self.request.user.company)


class HousingRequestViewSet(viewsets.ModelViewSet):
    module = 'housing'
    serializer_class = HousingRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HousingRequest.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class OccupancyLogViewSet(viewsets.ModelViewSet):
    module = 'housing'
    serializer_class = OccupancyLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OccupancyLog.objects.filter(room__building__company=self.request.user.company)
