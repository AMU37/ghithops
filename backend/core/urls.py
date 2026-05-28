from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuthViewSet, CompanyViewSet, DepartmentViewSet,
    UserViewSet, RoleViewSet, PermissionViewSet,
    AuditLogViewSet, NotificationViewSet
)

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'departments', DepartmentViewSet, basename='departments')
router.register(r'users', UserViewSet, basename='users')
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'permissions', PermissionViewSet, basename='permissions')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('', include(router.urls)),
]
