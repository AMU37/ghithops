from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, ServiceTypeViewSet

router = DefaultRouter()
router.register('', EmployeeViewSet, basename='employees')
router.register('service-types', ServiceTypeViewSet, basename='service-types')

urlpatterns = [
    path('', include(router.urls)),
]
