from rest_framework.routers import DefaultRouter
from .views import (
    ShiftTypeViewSet, VehicleViewSet, DriverViewSet,
    TransportRouteViewSet, TripViewSet, TripRouteViewSet,
    RideLogViewSet, ViolationViewSet, EmployeeTransportInfoViewSet,
    EmployeeAssignmentViewSet, AssemblyPointViewSet,
    TransportRequestViewSet
)

router = DefaultRouter()
router.register(r'shift-types', ShiftTypeViewSet, basename='shift-types')
router.register(r'vehicles', VehicleViewSet, basename='vehicles')
router.register(r'drivers', DriverViewSet, basename='drivers')
router.register(r'routes', TransportRouteViewSet, basename='transport-routes')
router.register(r'trips', TripViewSet, basename='trips')
router.register(r'trip-routes', TripRouteViewSet, basename='trip-routes')
router.register(r'ride-logs', RideLogViewSet, basename='ride-logs')
router.register(r'violations', ViolationViewSet, basename='violations')
router.register(r'employee-infos', EmployeeTransportInfoViewSet, basename='employee-infos')
router.register(r'assignments', EmployeeAssignmentViewSet, basename='assignments')
router.register(r'assembly-points', AssemblyPointViewSet, basename='assembly-points')
router.register(r'requests', TransportRequestViewSet, basename='transport-requests')

urlpatterns = router.urls
