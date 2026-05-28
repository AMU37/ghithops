from rest_framework.routers import DefaultRouter
from .views import CleaningTaskViewSet, CleaningTeamViewSet, InspectionViewSet

router = DefaultRouter()
router.register(r'tasks', CleaningTaskViewSet, basename='cleaning-tasks')
router.register(r'teams', CleaningTeamViewSet, basename='cleaning-teams')
router.register(r'inspections', InspectionViewSet, basename='inspections')

urlpatterns = router.urls
