from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import CleaningTask, CleaningTeam, Inspection
from .serializers import CleaningTaskSerializer, CleaningTeamSerializer, InspectionSerializer


class CleaningTaskViewSet(viewsets.ModelViewSet):
    module = 'cleaning'
    serializer_class = CleaningTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CleaningTask.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class CleaningTeamViewSet(viewsets.ModelViewSet):
    module = 'cleaning'
    serializer_class = CleaningTeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CleaningTeam.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class InspectionViewSet(viewsets.ModelViewSet):
    module = 'cleaning'
    serializer_class = InspectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Inspection.objects.filter(task__company=self.request.user.company)
