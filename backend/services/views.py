from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import ServiceRequest, Technician, WorkOrder
from .serializers import ServiceRequestSerializer, TechnicianSerializer, WorkOrderSerializer


class ServiceRequestViewSet(viewsets.ModelViewSet):
    module = 'services'
    serializer_class = ServiceRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ServiceRequest.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class TechnicianViewSet(viewsets.ModelViewSet):
    module = 'services'
    queryset = Technician.objects.all()
    serializer_class = TechnicianSerializer
    permission_classes = [IsAuthenticated]


class WorkOrderViewSet(viewsets.ModelViewSet):
    module = 'services'
    serializer_class = WorkOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WorkOrder.objects.filter(request__company=self.request.user.company)
