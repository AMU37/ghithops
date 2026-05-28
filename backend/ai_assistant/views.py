import json
import base64
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AIChat, AIMessage, OCRDocument, AnalyticsReport
from .serializers import (
    AIChatSerializer, AIChatListSerializer, AIChatCreateSerializer,
    AIMessageSerializer, OCRDocumentSerializer,
    AnalyticsReportSerializer, AnalyticsReportListSerializer
)


class AIChatViewSet(viewsets.ModelViewSet):
    module = 'ai'
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return AIChatListSerializer
        return AIChatSerializer

    def get_queryset(self):
        return AIChat.objects.filter(
            company=self.request.user.company,
            user=self.request.user
        ).prefetch_related('messages')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, user=self.request.user)

    @action(detail=False, methods=['post'])
    def chat(self, request):
        message = request.data.get('message', '')
        chat_id = request.data.get('chat_id')

        if not message:
            return Response({'error': 'الرجاء إدخال رسالة'}, status=status.HTTP_400_BAD_REQUEST)

        chat = None
        if chat_id:
            chat = AIChat.objects.filter(id=chat_id, company=request.user.company, user=request.user).first()

        if not chat:
            chat = AIChat.objects.create(
                company=request.user.company,
                user=request.user,
                title=message[:50]
            )

        AIMessage.objects.create(chat=chat, role='user', content=message)

        try:
            import google.generativeai as genai
            genai.configure(api_key=__import__('os').environ.get('GEMINI_API_KEY', ''))

            history = list(chat.messages.all().values('role', 'content'))
            gemini_history = [
                {"role": "user" if m['role'] == "user" else "model", "parts": [m['content']]}
                for m in history[:-1]  # exclude the current user message (already passed via send_message)
            ]

            model = genai.GenerativeModel(
                'gemini-2.0-flash',
                system_instruction="أنت مساعد ذكي لنظام غيث لأتمتة العمليات الإدارية التشغيلية. أجب باللغة العربية."
            )
            chat_session = model.start_chat(history=gemini_history)
            response = chat_session.send_message(message)

            reply = response.text

            AIMessage.objects.create(chat=chat, role='assistant', content=reply)

            if not chat.title or chat.title == message[:50]:
                chat.title = message[:80]
                chat.save()

            return Response({
                'chat_id': chat.id,
                'reply': reply,
            })

        except Exception as e:
            error_msg = str(e)
            reply = "عذراً، حدث خطأ في الاتصال بالمساعد الذكي. يرجى التحقق من مفتاح API."
            AIMessage.objects.create(chat=chat, role='assistant', content=reply)
            return Response({
                'chat_id': chat.id,
                'reply': reply,
                'error': error_msg,
            })

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        chat = self.get_object()
        last_user_msg = chat.messages.filter(role='user').last()
        if not last_user_msg:
            return Response({'error': 'لا توجد رسالة سابقة'}, status=status.HTTP_400_BAD_REQUEST)

        chat.messages.filter(role='assistant', chat=chat).delete()

        try:
            import google.generativeai as genai
            genai.configure(api_key=__import__('os').environ.get('GEMINI_API_KEY', ''))

            history = list(chat.messages.all().values('role', 'content'))
            gemini_history = [
                {"role": "user" if m['role'] == "user" else "model", "parts": [m['content']]}
                for m in history[:-1]  # exclude the last user message (resend via send_message below)
            ]

            model = genai.GenerativeModel(
                'gemini-2.0-flash',
                system_instruction="أنت مساعد ذكي لنظام غيث."
            )
            chat_session = model.start_chat(history=gemini_history)
            response = chat_session.send_message(history[-1]['content'])

            reply = response.text

            AIMessage.objects.create(chat=chat, role='assistant', content=reply)

            return Response({
                'chat_id': chat.id,
                'reply': reply,
            })

        except Exception as e:
            return Response({
                'reply': "عذراً، حدث خطأ في الاتصال بالمساعد الذكي.",
                'error': str(e),
            })


class OCRDocumentViewSet(viewsets.ModelViewSet):
    module = 'ai'
    serializer_class = OCRDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OCRDocument.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, user=self.request.user)

    @action(detail=False, methods=['post'])
    def process(self, request):
        image_data = request.data.get('image', '')
        title = request.data.get('title', '')

        if not image_data:
            return Response({'error': 'الرجاء إرفاق صورة'}, status=status.HTTP_400_BAD_REQUEST)

        doc = OCRDocument.objects.create(
            company=request.user.company,
            user=request.user,
            title=title or 'مستند',
            image=image_data,
        )

        try:
            import google.generativeai as genai
            genai.configure(api_key=__import__('os').environ.get('GEMINI_API_KEY', ''))

            image_content = image_data
            if ',' in image_data:
                image_content = image_data.split(',')[1]

            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content([
                "استخرج كل النصوص من هذه الصورة وأعدها كما هي باللغة العربية.",
                {"mime_type": "image/jpeg", "data": image_content}
            ])

            extracted = response.text
            doc.extracted_text = extracted
            doc.save()

            return Response({
                'id': doc.id,
                'extracted_text': extracted,
                'title': doc.title,
            })

        except Exception as e:
            doc.extracted_text = f"خطأ في المعالجة: {str(e)}"
            doc.save()
            return Response({
                'id': doc.id,
                'extracted_text': doc.extracted_text,
                'error': str(e),
            })


class AnalyticsViewSet(viewsets.ViewSet):
    module = 'ai'
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        company = request.user.company
        from core.models import User, AuditLog, Notification
        from transport.models import Trip, Vehicle, Driver, TransportRoute, RideLog

        today = date.today()

        data = {
            'users': User.objects.filter(company=company).count(),
            'trips_today': Trip.objects.filter(company=company, trip_date=today).count(),
            'active_vehicles': Vehicle.objects.filter(company=company, status='active').count(),
            'active_drivers': Driver.objects.filter(company=company, status='available').count(),
            'active_routes': TransportRoute.objects.filter(company=company, status='active').count(),
            'total_boarded_today': RideLog.objects.filter(company=company, trip__trip_date=today, action='board').count(),
            'total_absences_today': RideLog.objects.filter(company=company, trip__trip_date=today, action='absent').count(),
            'unread_notifications': Notification.objects.filter(company=company, status='unread').count(),
        }

        return Response(data)

    @action(detail=False, methods=['get'])
    def transport_stats(self, request):
        company = request.user.company
        from transport.models import Trip, RideLog, Violation
        from django.db.models.functions import TruncMonth

        period = request.query_params.get('period', '30')

        try:
            days = int(period)
        except ValueError:
            days = 30

        start_date = date.today() - timedelta(days=days)

        trips = Trip.objects.filter(company=company, trip_date__gte=start_date)

        monthly = trips.annotate(month=TruncMonth('trip_date')).values('month').annotate(
            count=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
        ).order_by('month')

        violations = Violation.objects.filter(company=company, date__gte=start_date)
        boardings = RideLog.objects.filter(company=company, trip__trip_date__gte=start_date, action='board')

        total_trips = trips.count()
        completed_trips = trips.filter(status='completed').count()
        cancelled_trips = trips.filter(status='cancelled').count()

        data = {
            'period_days': days,
            'total_trips': total_trips,
            'completed_trips': completed_trips,
            'cancelled_trips': cancelled_trips,
            'completion_rate': round((completed_trips / total_trips * 100) if total_trips else 0, 1),
            'total_violations': violations.count(),
            'resolved_violations': violations.filter(resolved=True).count(),
            'total_boardings': boardings.count(),
            'monthly': list(monthly),
        }

        return Response(data)

    @action(detail=False, methods=['get'])
    def housing_stats(self, request):
        from housing.models import HousingBuilding, Room, OccupancyLog

        buildings = HousingBuilding.objects.filter(company=request.user.company)
        rooms = Room.objects.filter(building__company=request.user.company)
        total_rooms = rooms.count()
        occupied = rooms.filter(status='occupied').count()

        data = {
            'buildings': buildings.count(),
            'total_rooms': total_rooms,
            'occupied_rooms': occupied,
            'available_rooms': rooms.filter(status='available').count(),
            'occupancy_rate': round((occupied / total_rooms * 100) if total_rooms else 0, 1),
            'active_occupants': OccupancyLog.objects.filter(room__building__company=request.user.company, check_out__isnull=True).count(),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def service_stats(self, request):
        from services.models import ServiceRequest, WorkOrder

        requests = ServiceRequest.objects.filter(company=request.user.company)
        orders = WorkOrder.objects.filter(request__company=request.user.company)

        data = {
            'total_requests': requests.count(),
            'pending': requests.filter(status='pending').count(),
            'in_progress': requests.filter(status='in_progress').count(),
            'completed': requests.filter(status='completed').count(),
            'urgent': requests.filter(priority='urgent').count(),
            'active_work_orders': orders.filter(status='in_progress').count(),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def cleaning_stats(self, request):
        from cleaning.models import CleaningTask, Inspection

        tasks = CleaningTask.objects.filter(company=request.user.company)
        inspections = Inspection.objects.filter(task__company=request.user.company)

        avg_score = inspections.aggregate(avg=Avg('score'))['avg'] or 0

        data = {
            'total_tasks': tasks.count(),
            'pending': tasks.filter(status='pending').count(),
            'in_progress': tasks.filter(status='in_progress').count(),
            'completed': tasks.filter(status='completed').count(),
            'total_inspections': inspections.count(),
            'average_score': round(float(avg_score), 1),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def agriculture_stats(self, request):
        from agriculture.models import Farm, Crop, IrrigationPlan

        data = {
            'farms': Farm.objects.filter(company=request.user.company).count(),
            'crops': Crop.objects.filter(farm__company=request.user.company).count(),
            'irrigation_plans': IrrigationPlan.objects.filter(crop__farm__company=request.user.company).count(),
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def system_audit(self, request):
        from core.models import AuditLog
        limit = int(request.query_params.get('limit', 50))
        logs = AuditLog.objects.filter(company=request.user.company)[:limit]
        return Response([{
            'id': str(l.id),
            'user_name': l.user.full_name if l.user else 'نظام',
            'action': l.action,
            'entity': l.entity,
            'created_at': l.created_at.isoformat(),
        } for l in logs])
