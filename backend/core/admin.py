from django.contrib import admin
from .models import Company, Department, User, Role, Permission, AuditLog, Notification


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'status', 'created_at']
    search_fields = ['name', 'code']
    list_filter = ['status']


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'created_at']
    search_fields = ['name', 'code']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'company', 'department', 'role', 'is_active']
    search_fields = ['full_name', 'email']
    list_filter = ['role', 'is_active', 'company']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'module', 'action']
    list_filter = ['module']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'entity', 'user', 'company', 'created_at']
    list_filter = ['action', 'entity', 'created_at']
    readonly_fields = ['old_data', 'new_data']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'status', 'created_at']
    list_filter = ['status']
