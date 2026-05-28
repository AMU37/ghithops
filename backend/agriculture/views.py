from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Farm, Crop, IrrigationPlan
from .serializers import FarmSerializer, CropSerializer, IrrigationPlanSerializer


class FarmViewSet(viewsets.ModelViewSet):
    module = 'agriculture'
    serializer_class = FarmSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Farm.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class CropViewSet(viewsets.ModelViewSet):
    module = 'agriculture'
    serializer_class = CropSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Crop.objects.filter(farm__company=self.request.user.company)


class IrrigationPlanViewSet(viewsets.ModelViewSet):
    module = 'agriculture'
    serializer_class = IrrigationPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return IrrigationPlan.objects.filter(crop__farm__company=self.request.user.company)
