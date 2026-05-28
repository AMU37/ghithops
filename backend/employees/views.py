from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Employee, ServiceType
from .serializers import EmployeeSerializer, ShiftTypeReadOnlySerializer, ServiceTypeSerializer
from transport.models import ShiftType, EmployeeTransportInfo


class EmployeeViewSet(viewsets.ModelViewSet):
    module = 'employees'
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]
    lookup_value_regex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            company_id = self.request.META.get('HTTP_X_COMPANY_ID')
            if company_id:
                qs = Employee.objects.filter(company_id=company_id)
            else:
                qs = Employee.objects.all()
        else:
            qs = Employee.objects.filter(company=user.company)
        qs = qs.exclude(employee_id__startswith='TEMP-').exclude(employee_id__startswith='MANUAL-')
        return qs

    def _resolve_company(self, request):
        """Allow super_admin to create employees for any company."""
        if request.user.role == 'super_admin' and request.data.get('company'):
            from core.models import Company
            try:
                return Company.objects.get(id=request.data['company'])
            except (Company.DoesNotExist, ValueError):
                pass
        return request.user.company

    def _save_extra_fields(self, request, company, employee):
        dept_name = request.data.get('department_name')
        if dept_name is not None:
            if dept_name.strip():
                from core.models import Department
                dept = Department.objects.filter(company=company, name__iexact=dept_name.strip()).first()
                if not dept:
                    dept = Department.objects.create(company=company, name=dept_name.strip(), code=dept_name.strip()[:50])
                employee.department = dept
            else:
                employee.department = None
            employee.save(update_fields=['department'])

        shift_type_id = request.data.get('shift_type')
        city = request.data.get('city')
        if shift_type_id or city:
            defaults = {'company': company, 'employee_record': employee, 'employee_name': employee.full_name}
            if shift_type_id:
                defaults['shift_type_id'] = shift_type_id
            if city:
                defaults['city'] = city
            EmployeeTransportInfo.objects.update_or_create(
                employee_id=employee.employee_id,
                defaults=defaults
            )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = self._resolve_company(request)
        employee_id = serializer.validated_data.get('employee_id')

        existing = Employee.objects.filter(company=company, employee_id=employee_id).first()
        if existing:
            for attr, value in serializer.validated_data.items():
                setattr(existing, attr, value)
            existing.company = company
            existing.save()
            self._save_extra_fields(request, company, existing)
            out_serializer = self.get_serializer(existing)
            return Response(out_serializer.data, status=200)

        employee = serializer.save(company=company)
        self._save_extra_fields(request, company, employee)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)

    def perform_update(self, serializer):
        company = self._resolve_company(self.request)
        employee = serializer.save()
        if company != employee.company:
            employee.company = company
            employee.save(update_fields=['company'])
        self._save_extra_fields(self.request, company, employee)

    @action(detail=False, methods=['get'])
    def shift_types(self, request):
        user = request.user
        if user.role == 'super_admin':
            company_id = request.META.get('HTTP_X_COMPANY_ID')
            if company_id:
                qs = ShiftType.objects.filter(company_id=company_id, status='active')
            else:
                qs = ShiftType.objects.filter(status='active')
        else:
            qs = ShiftType.objects.filter(company=user.company, status='active')
        serializer = ShiftTypeReadOnlySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def service_types(self, request):
        user = request.user
        if user.role == 'super_admin':
            company_id = request.META.get('HTTP_X_COMPANY_ID')
            if company_id:
                qs = ServiceType.objects.filter(company_id=company_id, status='active')
            else:
                qs = ServiceType.objects.filter(status='active')
        else:
            qs = ServiceType.objects.filter(company=user.company, status='active')
        serializer = ServiceTypeSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_department(self, request):
        dept_id = request.query_params.get('department_id')
        if not dept_id:
            return Response([])
        user = request.user
        if user.role == 'super_admin':
            company_id = request.META.get('HTTP_X_COMPANY_ID')
            if company_id:
                qs = Employee.objects.filter(company_id=company_id, department_id=dept_id)
            else:
                qs = Employee.objects.filter(department_id=dept_id)
        else:
            qs = Employee.objects.filter(company=user.company, department_id=dept_id)
        return Response(EmployeeSerializer(qs, many=True).data)


class ServiceTypeViewSet(viewsets.ModelViewSet):
    module = 'employees'
    serializer_class = ServiceTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ServiceType.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
