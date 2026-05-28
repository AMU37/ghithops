from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import date, datetime, timedelta

User = get_user_model()
from .models import (
    ShiftType, Vehicle, Driver, TransportRoute, EmployeeAssignment,
    Trip, TripRoute, RideLog, Violation, EmployeeTransportInfo, AssemblyPoint,
    TransportRequest
)
from .serializers import (
    ShiftTypeSerializer, VehicleSerializer, DriverSerializer,
    TransportRouteSerializer, EmployeeAssignmentSerializer,
    TripSerializer, TripCreateSerializer, TripRouteSerializer,
    RideLogSerializer, ViolationSerializer, EmployeeTransportInfoSerializer,
    AssemblyPointSerializer, TransportRequestSerializer
)
from .cycle_utils import get_employee_cycle_status


class ShiftTypeViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = ShiftTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ShiftType.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class VehicleViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Vehicle.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class DriverViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Driver.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        pin = serializer.validated_data.pop('pin', '')
        driver = serializer.save(company=self.request.user.company)
        if pin:
            driver.pin = make_password(pin)
            # Create linked User account for driver login
            code = driver.employee_id or str(driver.id)
            email = f"driver-{code}@local"
            if not User.objects.filter(email=email).exists():
                user = User.objects.create(
                    company=driver.company,
                    email=email,
                    full_name=driver.name,
                    role='driver',
                    is_active=True,
                )
                user.set_password(pin)
                user.save()
                driver.user = user
            driver.save()

    def perform_update(self, serializer):
        pin = serializer.validated_data.pop('pin', None)
        driver = serializer.save()
        if pin:
            driver.pin = make_password(pin)
            if driver.user:
                driver.user.set_password(pin)
                driver.user.save()
            driver.save()

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        code = request.data.get('code', '').strip()
        pin = request.data.get('pin', '').strip()
        if not code or not pin:
            return Response({'error': 'الكود والرمز السري مطلوبان'}, status=status.HTTP_400_BAD_REQUEST)
        driver = Driver.objects.filter(employee_id=code).first()
        if not driver:
            return Response({'error': 'السائق غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        if not driver.pin or not check_password(pin, driver.pin):
            return Response({'error': 'الرمز السري غير صحيح'}, status=status.HTTP_401_UNAUTHORIZED)
        if driver.status == 'inactive':
            return Response({'error': 'الحساب غير نشط'}, status=status.HTTP_403_FORBIDDEN)
        # Ensure linked user exists
        if not driver.user:
            code = driver.employee_id or str(driver.id)
            email = f"driver-{code}@local"
            user = User.objects.create(
                company=driver.company,
                email=email,
                full_name=driver.name,
                role='driver',
                is_active=True,
            )
            user.set_password(pin)
            user.save()
            driver.user = user
            driver.save()
        refresh = RefreshToken.for_user(driver.user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'driver': DriverSerializer(driver).data,
        })

    @action(detail=True, methods=['get'])
    def trips(self, request, pk=None):
        driver = self.get_object()
        date_filter = request.query_params.get('date', date.today().isoformat())
        trips = Trip.objects.filter(
            company=request.user.company,
            driver=driver,
            trip_date=date_filter
        ).select_related('route', 'vehicle').order_by('departure_time')
        from .serializers import TripSerializer
        return Response(TripSerializer(trips, many=True).data)

    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Get trips for the driver (all statuses)."""
        driver = self.get_object()
        today = date.today()
        trips = Trip.objects.filter(
            company=request.user.company,
            driver=driver,
            trip_date__gte=today,
        ).select_related('route', 'vehicle').order_by('trip_date', 'departure_time')[:20]
        from .serializers import TripSerializer
        return Response(TripSerializer(trips, many=True).data)


class TransportRouteViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = TransportRouteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TransportRoute.objects.filter(company=self.request.user.company).select_related(
            'shift_type', 'default_vehicle', 'default_driver'
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class TripViewSet(viewsets.ModelViewSet):
    module = 'transport'
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return TripCreateSerializer
        return TripSerializer

    def get_queryset(self):
        qs = Trip.objects.filter(company=self.request.user.company).select_related(
            'vehicle', 'driver', 'route'
        ).prefetch_related('trip_routes__route', 'ride_logs')

        trip_date = self.request.query_params.get('date')
        if trip_date:
            try:
                qs = qs.filter(trip_date=datetime.strptime(trip_date, '%Y-%m-%d').date())
            except ValueError:
                pass

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs.order_by('-trip_date', 'departure_time')

    def perform_create(self, serializer):
        self._validate_overlap(serializer.validated_data)
        serializer.save(company=self.request.user.company)

    def perform_update(self, serializer):
        self._validate_overlap(serializer.validated_data, serializer.instance)
        serializer.save()

    def _validate_overlap(self, data, instance=None):
        trip_date = data.get('trip_date') or (instance.trip_date if instance else None)
        driver = data.get('driver') or (instance.driver if instance else None)
        vehicle = data.get('vehicle') or (instance.vehicle if instance else None)
        # also support direct driver_id / vehicle_id from assign_resources
        if not driver and 'driver_id' in data:
            driver = data['driver_id']
        if not vehicle and 'vehicle_id' in data:
            vehicle = data['vehicle_id']
        dep = data.get('departure_time')
        ret = data.get('return_time')
        if not trip_date or not (driver or vehicle):
            return
        qs = Trip.objects.filter(company=self.request.user.company, trip_date=trip_date)
        if instance:
            qs = qs.exclude(id=instance.id)
        from django.db.models import Q
        if driver and vehicle:
            qs = qs.filter(Q(driver_id=driver if isinstance(driver, str) else driver.id) | Q(vehicle_id=vehicle if isinstance(vehicle, str) else vehicle.id))
        elif driver:
            qs = qs.filter(driver_id=driver if isinstance(driver, str) else driver.id)
        elif vehicle:
            qs = qs.filter(vehicle_id=vehicle if isinstance(vehicle, str) else vehicle.id)
        if not dep or not ret:
            if qs.filter(status__in=['scheduled', 'in_progress']).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError('السائق أو المركبة لديهما رحلة في نفس التاريخ')
            return
        from datetime import time
        dep = dep if isinstance(dep, time) else (time.fromisoformat(dep) if isinstance(dep, str) else dep)
        ret = ret if isinstance(ret, time) else (time.fromisoformat(ret) if isinstance(ret, str) else ret)
        for t in qs.filter(status__in=['scheduled', 'in_progress']):
            td = t.departure_time
            tr = t.return_time
            if td and tr:
                if not (ret <= td or dep >= tr):
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError('السائق أو المركبة مشغولان في رحلة أخرى في نفس الوقت')

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        trip = self.get_object()
        if trip.status != 'scheduled':
            return Response({'error': 'Trip cannot be started from current status'}, status=status.HTTP_400_BAD_REQUEST)
        trip.status = 'in_progress'
        trip.started_at = timezone.now()
        trip.save()
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Driver completes the trip - marks as driver_completed, doesn't fully close."""
        trip = self.get_object()
        if trip.status != 'in_progress':
            return Response({'error': 'Trip must be in progress to complete'}, status=status.HTTP_400_BAD_REQUEST)
        trip.driver_completed = True
        trip.driver_completed_at = timezone.now()
        trip.save()
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'])
    def supervisor_complete(self, request, pk=None):
        """Supervisor finalizes trip with fuel and arrival time."""
        trip = self.get_object()
        if trip.status != 'in_progress':
            return Response({'error': 'Trip must be in progress to complete'}, status=status.HTTP_400_BAD_REQUEST)
        trip.driver_completed = True
        trip.driver_completed_at = trip.driver_completed_at or timezone.now()
        trip.status = 'completed'
        trip.completed_at = timezone.now()
        fuel = request.data.get('fuel_consumed')
        if fuel is not None and fuel != '':
            trip.fuel_consumed = fuel
        ret = request.data.get('actual_return_time')
        if ret:
            from django.utils.dateparse import parse_datetime
            trip.actual_return_time = parse_datetime(ret) or ret
        trip.return_note = request.data.get('return_note', trip.return_note)
        trip.save()
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        trip = self.get_object()
        trip.status = 'cancelled'
        trip.save()
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        trip = self.get_object()
        trip.status = 'scheduled'
        trip.driver_completed = False
        trip.driver_completed_at = None
        trip.fuel_consumed = None
        trip.actual_return_time = None
        trip.started_at = None
        trip.completed_at = None
        trip.save()
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'])
    def assign_resources(self, request, pk=None):
        trip = self.get_object()
        vehicle_id = request.data.get('vehicle_id')
        driver_id = request.data.get('driver_id')
        if vehicle_id:
            trip.vehicle_id = vehicle_id
        if driver_id:
            trip.driver_id = driver_id
        self._validate_overlap(
            {'driver_id': driver_id, 'vehicle_id': vehicle_id, 'trip_date': trip.trip_date,
             'departure_time': trip.departure_time, 'return_time': trip.return_time},
            instance=trip
        )
        trip.save()
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        trip = self.get_object()
        logs = RideLog.objects.filter(trip=trip).order_by('time')
        data = []
        for log in logs:
            data.append({
                'id': log.id,
                'employee_id': log.employee_id,
                'employee_name': log.employee_name,
                'action': log.action,
                'time': log.time.strftime('%H:%M') if log.time else '-',
                'status': log.status,
                'method': log.method,
            })
        return Response({
            'logs': data,
            'total_assigned': logs.filter(action='assigned').count(),
            'total_boarded': logs.filter(action='board').count(),
        })

    @action(detail=True, methods=['get'])
    def manifest(self, request, pk=None):
        """Detailed employee manifest with cycle status and route mismatch detection, for driver dashboard."""
        trip = self.get_object()
        logs = RideLog.objects.filter(trip=trip).order_by('time')
        assigned_ids = set(l.employee_id for l in logs if l.action == 'assigned')
        boarded_ids = set(l.employee_id for l in logs if l.action == 'board')

        manifest = []
        for l in logs:
            if l.action not in ('assigned', 'board'):
                continue
            eid = l.employee_id
            if any(m['employee_id'] == eid for m in manifest):
                continue
            info = EmployeeTransportInfo.objects.filter(employee_id=eid, company=request.user.company).first()
            is_boarded = eid in boarded_ids
            route_mismatch = False
            original_route = ''
            if info and info.route and trip.route and info.route_id != trip.route_id:
                route_mismatch = True
                original_route = info.route.name if info.route else ''
            if is_boarded:
                if eid.startswith('TEMP-') or eid.startswith('MANUAL-'):
                    status = 'مضاف يدوي'
                elif route_mismatch:
                    status = 'مطابق (استثناء)'
                else:
                    status = 'مطابق'
            elif eid in assigned_ids:
                status = 'لم يصعد'
            else:
                status = '-'
            cycle = None
            if info:
                from .cycle_utils import get_employee_cycle_status
                cs = get_employee_cycle_status(info, trip.trip_date)
                if cs:
                    cycle = {'status': cs['status'], 'label': cs['label'], 'color': cs['color'], 'position': cs.get('position_in_cycle', 0) + 1}
            manifest.append({
                'employee_id': eid,
                'employee_name': l.employee_name or (info.employee_name if info else ''),
                'department': info.department if info else '',
                'is_boarded': is_boarded,
                'is_assigned': eid in assigned_ids,
                'status': status,
                'route_mismatch': route_mismatch,
                'original_route': original_route,
                'cycle': cycle,
                'shift_type_name': info.shift_type.name if info and info.shift_type else '',
                'arrival_time': info.arrival_time.strftime('%H:%M') if info and info.arrival_time else '',
                'departure_time': info.departure_time.strftime('%H:%M') if info and info.departure_time else '',
            })
        return Response({
            'manifest': manifest,
            'total_assigned': len(assigned_ids),
            'total_boarded': len(boarded_ids),
            'trip': TripSerializer(trip).data,
        })

    @action(detail=False, methods=['post'])
    def clear(self, request):
        trip_date_str = request.data.get('date', date.today().isoformat())
        try:
            clear_date = datetime.strptime(trip_date_str, '%Y-%m-%d').date()
        except ValueError:
            clear_date = date.today()
        trips = Trip.objects.filter(company=request.user.company, trip_date=clear_date)
        count = trips.count()
        trip_ids = list(trips.values_list('id', flat=True))
        if trip_ids:
            TripRoute.objects.filter(trip_id__in=trip_ids).delete()
            RideLog.objects.filter(trip_id__in=trip_ids).delete()
            Violation.objects.filter(trip_id__in=trip_ids).delete()
            trips.delete()
        return Response({'message': f'تم مسح {count} رحلة لتاريخ {clear_date.isoformat()}', 'count': count})

    @action(detail=False, methods=['get'])
    def report(self, request):
        from .serializers import TripSerializer
        from_date = request.query_params.get('from', date.today().isoformat())
        to_date = request.query_params.get('to', date.today().isoformat())
        try:
            fd = datetime.strptime(from_date, '%Y-%m-%d').date()
            td = datetime.strptime(to_date, '%Y-%m-%d').date()
        except ValueError:
            fd = td = date.today()

        route_id = request.query_params.get('route_id')
        driver_id = request.query_params.get('driver_id')

        qs = Trip.objects.filter(company=request.user.company, trip_date__gte=fd, trip_date__lte=td)
        if route_id:
            qs = qs.filter(route_id=route_id)
        if driver_id:
            qs = qs.filter(driver_id=driver_id)
        qs = qs.filter(status__in=['in_progress', 'completed']).select_related(
            'route', 'vehicle', 'driver'
        ).order_by('-trip_date', 'departure_time')

        trips = list(qs)
        trip_ids = [t.id for t in trips]
        all_logs = RideLog.objects.filter(trip_id__in=trip_ids, company=request.user.company) if trip_ids else []
        logs_by_trip = {}
        for log in all_logs:
            logs_by_trip.setdefault(log.trip_id, []).append(log)

        trip_data = []
        for t in trips:
            logs = logs_by_trip.get(t.id, [])
            assigned_ids = set(l.employee_id for l in logs if l.action == 'assigned')
            boarded_ids = set(l.employee_id for l in logs if l.action == 'board')
            comparison = []
            for l in logs:
                if l.action not in ('assigned', 'board'):
                    continue
                eid = l.employee_id
                if any(c['employee_id'] == eid for c in comparison):
                    continue
                is_boarded = eid in boarded_ids
                route_mismatch = False
                original_route = ''
                if t.route:
                    info = EmployeeTransportInfo.objects.filter(employee_id=eid, company=request.user.company).first()
                    if info and info.route and info.route_id != t.route_id:
                        route_mismatch = True
                        original_route = info.route.name if info.route else ''
                if is_boarded:
                    if eid.startswith('TEMP-'):
                        status_label = 'مضاف'
                    elif route_mismatch:
                        status_label = 'مطابق (استثناء)'
                    else:
                        status_label = 'مطابق'
                elif eid in assigned_ids:
                    status_label = 'لم يصعد'
                else:
                    status_label = '-'
                comparison.append({
                    'employee_id': eid,
                    'employee_name': l.employee_name,
                    'is_assigned': eid in assigned_ids,
                    'is_boarded': is_boarded,
                    'status': status_label,
                    'route_mismatch': route_mismatch,
                    'original_route': original_route,
                })
            trip_data.append(TripSerializer(t).data)
        return Response({
            'trips': trip_data,
            'trip_count': len(trips),
            'total_assigned': sum(len(logs_by_trip.get(t.id, [])) for t in trips),
        })

    @action(detail=False, methods=['get'])
    def fuel_report(self, request):
        from django.db.models import Sum, Count, Avg, Q

        end = request.query_params.get('to')
        start = request.query_params.get('from')
        today = date.today()
        if not end:
            end = today.isoformat()
        if not start:
            start = (today - timedelta(days=30)).isoformat()

        trip_qs = Trip.objects.filter(
            company=request.user.company,
            status='completed',
            fuel_consumed__isnull=False,
            trip_date__gte=start, trip_date__lte=end,
        ).select_related('vehicle', 'driver')

        req_qs = TransportRequest.objects.filter(
            company=request.user.company,
            status='completed',
            fuel_consumed__isnull=False,
            request_date__gte=start, request_date__lte=end,
        ).select_related('assigned_vehicle', 'assigned_driver')

        vehicles = {}
        for t in trip_qs:
            vid = str(t.vehicle_id) if t.vehicle_id else 'unknown'
            purpose = t.vehicle.vehicle_purpose if t.vehicle and t.vehicle.vehicle_purpose else 'توصيل الموظفين'
            bus = t.vehicle.bus_number if t.vehicle else '-'
            plate = t.vehicle.plate_number if t.vehicle else '-'
            eff = float(t.vehicle.fuel_efficiency) if t.vehicle and t.vehicle.fuel_efficiency else 0
            if vid not in vehicles:
                vehicles[vid] = {'vehicle_id': vid, 'bus_number': bus, 'plate_number': plate, 'fuel_efficiency': eff, 'purposes': {}}
            if purpose not in vehicles[vid]['purposes']:
                vehicles[vid]['purposes'][purpose] = {'fuel': 0, 'count': 0, 'trips': 0, 'requests': 0}
            vehicles[vid]['purposes'][purpose]['fuel'] += float(t.fuel_consumed)
            vehicles[vid]['purposes'][purpose]['trips'] += 1
            vehicles[vid]['purposes'][purpose]['count'] += 1

        for r in req_qs:
            vid = str(r.assigned_vehicle_id) if r.assigned_vehicle_id else 'unknown'
            purpose = r.purpose or 'غير محدد'
            bus = r.assigned_vehicle.bus_number if r.assigned_vehicle else '-'
            plate = r.assigned_vehicle.plate_number if r.assigned_vehicle else '-'
            eff = float(r.assigned_vehicle.fuel_efficiency) if r.assigned_vehicle and r.assigned_vehicle.fuel_efficiency else 0
            if vid not in vehicles:
                vehicles[vid] = {'vehicle_id': vid, 'bus_number': bus, 'plate_number': plate, 'fuel_efficiency': eff, 'purposes': {}}
            if purpose not in vehicles[vid]['purposes']:
                vehicles[vid]['purposes'][purpose] = {'fuel': 0, 'count': 0, 'trips': 0, 'requests': 0}
            vehicles[vid]['purposes'][purpose]['fuel'] += float(r.fuel_consumed)
            vehicles[vid]['purposes'][purpose]['requests'] += 1
            vehicles[vid]['purposes'][purpose]['count'] += 1

        # aggregate by purpose
        by_purpose = {}
        for vid, vdata in vehicles.items():
            for pur, pdata in vdata['purposes'].items():
                if pur not in by_purpose:
                    by_purpose[pur] = {'purpose': pur, 'total_fuel': 0, 'total_trips': 0, 'total_requests': 0, 'vehicle_count': 0, 'vehicles': []}
                by_purpose[pur]['total_fuel'] += pdata['fuel']
                by_purpose[pur]['total_trips'] += pdata['trips']
                by_purpose[pur]['total_requests'] += pdata['requests']
                by_purpose[pur]['vehicles'].append({
                    'bus_number': vdata['bus_number'],
                    'plate_number': vdata['plate_number'],
                    'fuel': round(pdata['fuel'], 2),
                    'trips': pdata['trips'],
                    'requests': pdata['requests'],
                    'fuel_efficiency': vdata['fuel_efficiency'],
                })
        for pur in by_purpose:
            by_purpose[pur]['vehicle_count'] = len(by_purpose[pur]['vehicles'])
            by_purpose[pur]['total_fuel'] = round(by_purpose[pur]['total_fuel'], 2)

        purposes_list = sorted(by_purpose.values(), key=lambda x: x['total_fuel'], reverse=True)
        total_fuel = sum(p['total_fuel'] for p in purposes_list)
        total_trips = sum(p['total_trips'] for p in purposes_list)
        total_requests = sum(p['total_requests'] for p in purposes_list)

        recommendations = []
        top_purpose = purposes_list[0] if purposes_list else None
        if top_purpose and top_purpose['total_fuel'] > total_fuel * 0.5:
            recommendations.append(f"غرض \"{top_purpose['purpose']}\" يستهلك {top_purpose['total_fuel']} لتر ({round(top_purpose['total_fuel']/total_fuel*100)}%) من إجمالي الوقود، يوصى بمراجعة كفاءة استهلاك الوقود لهذا الغرض.")
        # check vehicles with fuel_efficiency data
        vehicles_with_eff = [v for v in vehicles.values() if v['fuel_efficiency'] > 0]
        if vehicles_with_eff:
            total_veh_fuel = sum(sum(p['fuel'] for p in v['purposes'].values()) for v in vehicles_with_eff)
            total_veh_eff = sum(v['fuel_efficiency'] * sum(p['fuel'] for p in v['purposes'].values()) for v in vehicles_with_eff)
            avg_eff = total_veh_eff / total_veh_fuel if total_veh_fuel > 0 else 0
            low_eff = [v for v in vehicles_with_eff if v['fuel_efficiency'] < avg_eff * 0.7 and sum(p['fuel'] for p in v['purposes'].values()) > 0]
            if low_eff:
                recommendations.append(f"يوجد {len(low_eff)} مركبة بكفاءة وقود أقل من المعدل ({round(avg_eff, 1)} كم/لتر)، يوصى بإجراء صيانة دورية لها.")
        if total_requests > 0:
            req_fuel = sum(p['total_fuel'] for p in purposes_list if p['total_requests'] > 0)
            recommendations.append(f"بلغ عدد طلبات النقل {total_requests} طلباً بإجمالي {round(req_fuel, 2)} لتر وقود، يوصى بتوحيد الطلبات لتقليل الاستهلاك.")
        if not purposes_list:
            recommendations.append("لا توجد بيانات وقود متاحة للفترة المحددة.")

        return Response({
            'by_purpose': purposes_list,
            'total_fuel': round(total_fuel, 2),
            'total_trips': total_trips,
            'total_requests': total_requests,
            'total_vehicles': len(vehicles),
            'recommendations': recommendations,
        })


class TripRouteViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = TripRouteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TripRoute.objects.filter(trip__company=self.request.user.company)

    @action(detail=False, methods=['post'])
    def merge(self, request):
        trip_ids = request.data.get('trip_ids', [])
        if len(trip_ids) < 2:
            return Response({'error': 'يجب اختيار رحلتين على الأقل'}, status=status.HTTP_400_BAD_REQUEST)

        trips = Trip.objects.filter(id__in=trip_ids, company=request.user.company)
        if trips.count() < 2:
            return Response({'error': 'الرحلات المختارة غير موجودة'}, status=status.HTTP_400_BAD_REQUEST)

        main = trips.first()
        for other in trips[1:]:
            if other.id == main.id:
                continue
            other_route_ids = [other.route_id]
            for tr in other.trip_routes.all():
                if tr.route_id not in other_route_ids:
                    other_route_ids.append(tr.route_id)
            for rid in other_route_ids:
                if rid != main.route_id and not TripRoute.objects.filter(trip=main, route_id=rid).exists():
                    TripRoute.objects.create(trip=main, route_id=rid, order=0)
            RideLog.objects.filter(trip=other).update(trip=main)
            Violation.objects.filter(trip=other).update(trip=main)
            other.trip_routes.all().delete()
            other.delete()

        all_route_ids = [main.route_id] + list(main.trip_routes.values_list('route_id', flat=True))
        routes = TransportRoute.objects.filter(id__in=all_route_ids)
        if routes.exists():
            main.departure_time = min(r.departure_time or timezone.now().time() for r in routes)
            main.return_time = max(r.return_time or timezone.now().time() for r in routes)
            main.save()

        return Response({'message': f'تم دمج {len(trip_ids)} رحلة في رحلة واحدة'})


class RideLogViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = RideLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RideLog.objects.filter(company=self.request.user.company).select_related('trip__route')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=['post'])
    def board(self, request):
        trip_id = request.data.get('trip_id')
        employee_id = request.data.get('employee_id')
        employee_name = request.data.get('employee_name', '')
        action_type = request.data.get('action', 'board')

        trip = Trip.objects.filter(id=trip_id, company=request.user.company).first()
        if not trip:
            return Response({'error': 'الرحلة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        if trip.status != 'in_progress':
            return Response({'error': 'يجب بدء الرحلة أولاً'}, status=status.HTTP_400_BAD_REQUEST)

        if RideLog.objects.filter(trip=trip, employee_id=employee_id, action=action_type).exists():
            return Response({'error': 'مسجل مسبقاً في هذه الرحلة'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate board across trips on same day
        if action_type == 'board':
            already = RideLog.objects.filter(
                company=request.user.company,
                employee_id=employee_id,
                action='board',
                trip__trip_date=trip.trip_date
            ).exclude(trip=trip).exists()
            if already:
                return Response({'error': 'هذا الموظف مسجل في رحلة أخرى اليوم'}, status=status.HTTP_400_BAD_REQUEST)

        log = RideLog.objects.create(
            company=request.user.company, trip=trip,
            employee_id=employee_id, employee_name=employee_name,
            action=action_type, method='manual', status='on_time'
        )
        return Response(RideLogSerializer(log).data)

    @action(detail=False, methods=['post'])
    def board_by_code(self, request):
        """Board by scanning employee code. Supports manual add for unknown employees."""
        trip_id = request.data.get('trip_id')
        employee_code = request.data.get('code', '').strip()
        action_type = request.data.get('action', 'board')

        trip = Trip.objects.filter(id=trip_id, company=request.user.company).first()
        if not trip:
            return Response({'error': 'الرحلة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        if trip.status != 'in_progress':
            return Response({'error': 'يجب بدء الرحلة أولاً'}, status=status.HTTP_400_BAD_REQUEST)

        # Try to find employee in centralized Employee model first
        from employees.models import Employee as CentralEmployee
        emp = CentralEmployee.objects.filter(
            company=request.user.company, employee_id=employee_code
        ).first()

        # Then try EmployeeTransportInfo
        info = EmployeeTransportInfo.objects.filter(
            company=request.user.company,
            employee_id=employee_code
        ).first()

        if not info:
            info = EmployeeTransportInfo.objects.filter(
                company=request.user.company,
                employee_name__icontains=employee_code
            ).first()

        # If found in central Employee but no transport info, create a link
        if emp and not info:
            info, _ = EmployeeTransportInfo.objects.get_or_create(
                company=request.user.company,
                employee_id=emp.employee_id,
                defaults={
                    'employee_name': emp.full_name,
                    'employee_record': emp,
                    'department': emp.department.name if emp.department else '',
                }
            )

        is_planned = False
        warning = None

        if info:
            is_planned = RideLog.objects.filter(
                trip=trip, employee_id=info.employee_id, action='assigned'
            ).exists()

            if not is_planned:
                warning = f'تحذير: {info.employee_name} غير مدرج ضمن خطة اليوم'

            if RideLog.objects.filter(trip=trip, employee_id=info.employee_id, action=action_type).exists():
                return Response({'error': f'{info.employee_name} مسجل مسبقاً'}, status=status.HTTP_400_BAD_REQUEST)

            # Prevent duplicate board across trips on same day
            if action_type == 'board':
                already = RideLog.objects.filter(
                    company=request.user.company,
                    employee_id=info.employee_id,
                    action='board',
                    trip__trip_date=trip.trip_date
                ).exclude(trip=trip).exists()
                if already:
                    return Response({'error': f'{info.employee_name} مسجل في رحلة أخرى اليوم'}, status=status.HTTP_400_BAD_REQUEST)

            log = RideLog.objects.create(
                company=request.user.company, trip=trip,
                employee_id=info.employee_id, employee_name=info.employee_name,
                action=action_type, method='scan', status='on_time'
            )
            return Response({
                'success': True, 'message': f'تم تسجيل {info.employee_name}',
                'warning': warning, 'is_planned': is_planned,
                'employee_name': info.employee_name,
            })
        else:
            return Response({
                'success': False, 'error': 'الموظف غير موجود',
                'not_found': True, 'code': employee_code
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def add_manual(self, request):
        """Manually add employee not in system to a trip."""
        trip_id = request.data.get('trip_id')
        employee_name = request.data.get('name', '').strip()
        company_name = request.data.get('company', '')
        position = request.data.get('position', '')
        notes = request.data.get('notes', '')
        action_type = request.data.get('action', 'board')

        if not employee_name:
            return Response({'error': 'الرجاء إدخال اسم الموظف'}, status=status.HTTP_400_BAD_REQUEST)

        trip = Trip.objects.filter(id=trip_id, company=request.user.company).first()
        if not trip:
            return Response({'error': 'الرحلة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)

        import time as time_module
        temp_id = f"MANUAL-{int(time_module.time())}"

        info = EmployeeTransportInfo.objects.create(
            company=request.user.company,
            employee_id=temp_id,
            employee_name=employee_name,
            external_company=company_name,
        )

        log = RideLog.objects.create(
            company=request.user.company, trip=trip,
            employee_id=info.employee_id, employee_name=employee_name,
            action=action_type, method='manual', status='on_time',
            notes=notes,
        )
        return Response({'success': True, 'message': f'تم إضافة {employee_name}', 'employee_id': info.employee_id})


class EmployeeTransportInfoViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = EmployeeTransportInfoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = EmployeeTransportInfo.objects.filter(company=self.request.user.company).select_related(
            'shift_type', 'route'
        )
        shift_type = self.request.query_params.get('shift_type')
        if shift_type:
            qs = qs.filter(shift_type_id=shift_type)
        route_id = self.request.query_params.get('route_id')
        if route_id:
            qs = qs.filter(route_id=route_id)
        status_filter = self.request.query_params.get('today_status')
        if status_filter:
            from datetime import date
            today = date.today()
            result_ids = []
            for info in qs:
                cs = get_employee_cycle_status(info, today)
                if cs and cs['status'] == status_filter:
                    result_ids.append(info.id)
            qs = qs.filter(id__in=result_ids)
        return qs

    def perform_create(self, serializer):
        pin = serializer.validated_data.get('pin', '')
        if pin:
            serializer.validated_data['pin'] = make_password(pin)
        info = serializer.save(company=self.request.user.company)
        if not info.employee_record:
            from employees.models import Employee as CentralEmployee
            emp, created = CentralEmployee.objects.get_or_create(
                company=info.company,
                employee_id=info.employee_id,
                defaults={'full_name': info.employee_name or info.employee_id}
            )
            if info.employee_name:
                emp.full_name = info.employee_name
                emp.save()
            info.employee_record = emp
            info.save(update_fields=['employee_record'])

    def perform_update(self, serializer):
        pin = serializer.validated_data.get('pin', '')
        if pin:
            serializer.validated_data['pin'] = make_password(pin)
        serializer.save()

    @action(detail=True, methods=['get'])
    def cycle_status(self, request, pk=None):
        info = self.get_object()
        target_date_str = request.query_params.get('date', date.today().isoformat())
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        except ValueError:
            target_date = date.today()
        result = get_employee_cycle_status(info, target_date)
        if result:
            return Response(result)
        return Response({'status': 'unknown', 'label': 'غير معروف', 'color': 'secondary'})

    @action(detail=False, methods=['post'])
    def promote(self, request):
        """Promote a TEMP employee to regular with full transport info."""
        employee_id = request.data.get('employee_id')
        info = EmployeeTransportInfo.objects.filter(
            employee_id=employee_id, company=request.user.company
        ).first()
        if not info:
            return Response({'error': 'الموظف غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        info.employee_name = request.data.get('name', info.employee_name)
        info.department = request.data.get('department', info.department)
        info.external_company = request.data.get('external_company', info.external_company)
        shift_type_id = request.data.get('shift_type_id')
        if shift_type_id:
            info.shift_type_id = shift_type_id
        route_id = request.data.get('route_id')
        if route_id:
            info.route_id = route_id
        info.city = request.data.get('city', info.city)
        arrival = request.data.get('arrival_time')
        if arrival:
            try:
                info.arrival_time = datetime.strptime(arrival, '%H:%M').time()
            except ValueError:
                pass
        departure = request.data.get('departure_time')
        if departure:
            try:
                info.departure_time = datetime.strptime(departure, '%H:%M').time()
            except ValueError:
                pass
        info.transport_type = request.data.get('transport_type', 'ورديات')
        info.save()

        # Sync with central Employee
        from employees.models import Employee as CentralEmployee
        from employees.serializers import EmployeeSerializer
        emp, _ = CentralEmployee.objects.get_or_create(
            company=info.company, employee_id=info.employee_id,
            defaults={'full_name': info.employee_name}
        )
        emp.full_name = info.employee_name
        emp.save()
        if not info.employee_record:
            info.employee_record = emp
            info.save()

        return Response({'success': True, 'message': f'تم ترقية {info.employee_name} بنجاح'})

    @action(detail=False, methods=['post'])
    def transfer_to_trips(self, request):
        """Create trips from employee assignments for a given date."""
        rows = request.data.get('rows', [])
        trip_date_str = request.data.get('date', '')
        try:
            trip_date = datetime.strptime(trip_date_str, '%Y-%m-%d').date() if trip_date_str else date.today()
        except ValueError:
            trip_date = date.today()

        cid = request.user.company
        route_groups = {}
        route_cache = {}

        for row in rows:
            parts = row.split('|')
            if len(parts) < 3:
                continue
            emp_id = parts[0].strip()
            route_name = parts[2].strip()
            if not route_name:
                continue
            if route_name not in route_cache:
                route = TransportRoute.objects.filter(company=cid, name=route_name).first()
                if not route:
                    continue
                route_cache[route_name] = route
            route_groups.setdefault(route_name, []).append(emp_id)

        created = 0
        linked = 0
        for route_name, emp_ids in route_groups.items():
            route = route_cache[route_name]
            trip, was_created = Trip.objects.get_or_create(
                company=cid, route=route, trip_date=trip_date,
                defaults={
                    'vehicle': route.default_vehicle,
                    'driver': route.default_driver,
                    'departure_time': route.departure_time,
                    'return_time': route.return_time,
                }
            )
            if was_created:
                created += 1
            for emp_id in emp_ids:
                if not RideLog.objects.filter(company=cid, trip=trip, employee_id=emp_id, action='assigned').exists():
                    info = EmployeeTransportInfo.objects.filter(employee_id=emp_id, company=cid).first()
                    RideLog.objects.create(
                        company=cid, trip=trip,
                        employee_id=emp_id,
                        employee_name=info.employee_name if info else '',
                        action='assigned', method='auto'
                    )
                    linked += 1

        parts = []
        if created:
            parts.append(f'تم إنشاء {created} رحلة')
        if linked:
            parts.append(f'تم ربط {linked} موظف')
        msg = '، '.join(parts) if parts else 'لم يتم العثور على خطوط سير'
        return Response({'success': True, 'message': msg, 'date': trip_date.isoformat()})

    @action(detail=False, methods=['post'], permission_classes=[])
    def employee_login(self, request):
        employee_id = request.data.get('employee_id', '').strip()
        password = request.data.get('password', '').strip() or employee_id
        if not employee_id:
            return Response({'error': 'كود الموظف مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
        info = EmployeeTransportInfo.objects.filter(employee_id=employee_id).first()
        if not info:
            return Response({'error': 'الموظف غير موجود في بيانات النقل'}, status=status.HTTP_404_NOT_FOUND)
        email = f"emp-{info.employee_id}@local"
        user = User.objects.filter(email=email).first()
        if not user:
            user = User.objects.create(
                company=info.company,
                email=email,
                full_name=info.employee_name or info.employee_id,
                role='employee',
                is_active=True,
            )
            user.set_password(password)
            user.save()
        elif not user.check_password(password):
            return Response({'error': 'كلمة المرور غير صحيحة'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'employee': {
                'employee_id': info.employee_id,
                'employee_name': info.employee_name,
                'department': info.department,
                'route_name': info.route.name if info.route else None,
            }
        })


class ViolationViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = ViolationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['date', 'employee_id', 'resolved']

    def get_queryset(self):
        return Violation.objects.filter(company=self.request.user.company).select_related('trip__route')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        violation = self.get_object()
        violation.resolved = True
        violation.resolved_by = request.user.full_name
        violation.resolved_at = timezone.now()
        violation.notes = request.data.get('notes', violation.notes)
        violation.save()
        return Response(ViolationSerializer(violation).data)


class AssemblyPointViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = AssemblyPointSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AssemblyPoint.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class EmployeeAssignmentViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = EmployeeAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmployeeAssignment.objects.filter(company=self.request.user.company).select_related('route', 'shift_type')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        assignment = self.get_object()
        assignment.status = 'suspended' if assignment.status == 'active' else 'active'
        assignment.save()
        return Response(EmployeeAssignmentSerializer(assignment).data)


class TransportRequestViewSet(viewsets.ModelViewSet):
    module = 'transport'
    serializer_class = TransportRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'request_date', 'employee_id']

    def get_queryset(self):
        return TransportRequest.objects.filter(company=self.request.user.company).select_related('assigned_driver', 'assigned_vehicle')

    def _set_driver_vehicle(self, req, data):
        req.assigned_driver_id = data.get('assigned_driver')
        req.assigned_vehicle_id = data.get('assigned_vehicle')
        dep_str = data.get('departure_time')
        if dep_str:
            from django.utils.dateparse import parse_datetime
            req.departure_time = parse_datetime(dep_str) or dep_str
        req.save()

    def perform_create(self, serializer):
        req = serializer.save(company=self.request.user.company)
        from .email_utils import send_supervisor_notification
        send_supervisor_notification(req)

    @action(detail=True, methods=['post'])
    def escalate_to_manager(self, request, pk=None):
        req = self.get_object()
        req.status = 'manager_pending'
        req.save()
        from .email_utils import send_manager_notification
        send_manager_notification(req)
        return Response(TransportRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def assign_to_progress(self, request, pk=None):
        req = self.get_object()
        req.status = 'in_progress'
        self._set_driver_vehicle(req, request.data)
        return Response(TransportRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def approve_manager(self, request, pk=None):
        req = self.get_object()
        req.status = 'in_progress'
        req.save()
        return Response(TransportRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        req.status = 'rejected'
        req.notes = request.data.get('notes', req.notes)
        req.save()
        return Response(TransportRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        req = self.get_object()
        req.status = 'completed'
        ret_str = request.data.get('return_time')
        if ret_str:
            from django.utils.dateparse import parse_datetime
            req.return_time = parse_datetime(ret_str) or ret_str
        req.fuel_consumed = request.data.get('fuel_consumed')
        req.distance_traveled = request.data.get('distance_traveled')
        req.completed_at = timezone.now()
        req.notes = request.data.get('notes', req.notes)
        req.save()
        return Response(TransportRequestSerializer(req).data)

    def _resolve_token(self, token, max_age=86400):
        from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
        try:
            signer = TimestampSigner()
            request_id = signer.unsign(token, max_age=max_age)
        except SignatureExpired:
            return None, 'انتهت صلاحية الرابط'
        except BadSignature:
            return None, 'رابط غير صالح'
        try:
            req = TransportRequest.objects.get(id=request_id)
            return req, None
        except TransportRequest.DoesNotExist:
            return None, 'الطلب غير موجود'

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def email_approve(self, request):
        token = request.query_params.get('token', '')
        level = request.query_params.get('level', 'supervisor')
        req, err = self._resolve_token(token)
        if err:
            return Response({'success': False, 'message': err}, status=400)
        if req.status == 'rejected':
            return Response({'success': False, 'message': 'تم رفض هذا الطلب مسبقاً'}, status=400)
        if level == 'manager':
            if req.status != 'manager_pending':
                return Response({'success': False, 'message': 'الطلب ليس بانتظار المدير'}, status=400)
            req.status = 'in_progress'
            req.save()
            return Response({'success': True, 'message': f'تم اعتماد المدير للطلب - {req.employee_name} - {req.purpose}'})
        req.status = 'manager_pending'
        req.save()
        from .email_utils import send_manager_notification
        send_manager_notification(req)
        return Response({'success': True, 'message': f'تم تصعيد الطلب للمدير - {req.employee_name} - {req.purpose}'})

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def email_reject(self, request):
        token = request.query_params.get('token', '')
        req, err = self._resolve_token(token)
        if err:
            return Response({'success': False, 'message': err}, status=400)
        if req.status in ('completed',):
            return Response({'success': False, 'message': 'تم إكمال هذا الطلب ولا يمكن رفضه'}, status=400)
        req.status = 'rejected'
        req.save()
        return Response({'success': True, 'message': f'تم رفض الطلب - {req.employee_name} - {req.purpose}'})
