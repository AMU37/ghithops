from rest_framework.permissions import BasePermission, SAFE_METHODS


class RBACPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role = request.user.role
        module = getattr(view, 'module', None)

        if role == 'super_admin':
            return True

        if role == 'company_admin':
            if module == 'companies':
                return request.method in ('GET', 'HEAD', 'OPTIONS')
            return True

        if role == 'department_user':
            if module in ('roles', 'permissions', 'audit-logs'):
                return False
            if module == 'employees':
                return request.method in SAFE_METHODS
            return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == 'super_admin':
            return True
        company_id = getattr(obj, 'company_id', None) or getattr(obj, 'company', None)
        if company_id:
            obj_company_id = str(company_id.id if hasattr(company_id, 'id') else company_id)
            user_company_id = str(user.company.id) if user.company else None
            if obj_company_id != user_company_id:
                return False
        dept_id = getattr(obj, 'department_id', None)
        if dept_id and user.role == 'department_user':
            obj_dept_id = str(dept_id.id if hasattr(dept_id, 'id') else dept_id)
            user_dept_id = str(user.department.id) if user.department else None
            if obj_dept_id != user_dept_id:
                return False
        return True


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'super_admin'


class IsCompanyAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ('super_admin', 'company_admin')
