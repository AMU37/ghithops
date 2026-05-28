from rest_framework.routers import DefaultRouter
from .views import FarmViewSet, CropViewSet, IrrigationPlanViewSet

router = DefaultRouter()
router.register(r'farms', FarmViewSet, basename='farms')
router.register(r'crops', CropViewSet, basename='crops')
router.register(r'irrigation-plans', IrrigationPlanViewSet, basename='irrigation-plans')

urlpatterns = router.urls
