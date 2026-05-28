import json
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class MultiTenantMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            try:
                token = AccessToken(auth_header.split(' ')[1])
                user_id = token.get('user_id')
                if user_id:
                    request.current_user = User.objects.filter(id=user_id).first()
                    if request.current_user:
                        # Allow super_admin to override company via X-Company-ID header
                        company_id = request.META.get('HTTP_X_COMPANY_ID')
                        if request.current_user.role == 'super_admin' and company_id:
                            from core.models import Company
                            try:
                                company = Company.objects.get(id=company_id)
                                request.current_company = company
                                request.current_user.company = company
                            except Company.DoesNotExist:
                                request.current_company = request.current_user.company
                        else:
                            request.current_company = request.current_user.company
                    else:
                        request.current_company = None
                else:
                    request.current_company = None
            except Exception:
                request.current_user = None
                request.current_company = None
        else:
            request.current_user = None
            request.current_company = None
        return None


class AuditLogMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request._audit_logged = False
        return None
