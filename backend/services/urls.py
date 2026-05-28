from rest_framework.routers import DefaultRouter
from .views import ServiceRequestViewSet, TechnicianViewSet, WorkOrderViewSet

router = DefaultRouter()
router.register(r'requests', ServiceRequestViewSet, basename='service-requests')
router.register(r'technicians', TechnicianViewSet, basename='technicians')
router.register(r'work-orders', WorkOrderViewSet, basename='work-orders')

urlpatterns = router.urls
