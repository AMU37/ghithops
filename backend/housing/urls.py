from rest_framework.routers import DefaultRouter
from .views import HousingBuildingViewSet, RoomViewSet, HousingRequestViewSet, OccupancyLogViewSet

router = DefaultRouter()
router.register(r'buildings', HousingBuildingViewSet, basename='buildings')
router.register(r'rooms', RoomViewSet, basename='rooms')
router.register(r'requests', HousingRequestViewSet, basename='housing-requests')
router.register(r'occupancy-logs', OccupancyLogViewSet, basename='occupancy-logs')

urlpatterns = router.urls
