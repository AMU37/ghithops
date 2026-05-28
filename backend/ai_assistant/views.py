import json
import base64
import os
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
from core.models import User as CoreUser, Company as CoreCompany, Department as CoreDepartment
from core.permissions import IsSuperAdmin, IsCompanyAdmin


# ─── Gemini tool (function) definitions ─────────────────────────────
TOOLS = [
    {
        "name": "create_company",
        "description": "إنشاء شركة جديدة في النظام (يتطلب صلاحية super_admin)",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "اسم الشركة"},
                "code": {"type": "string", "description": "رمز الشركة المختصر"},
            },
            "required": ["name", "code"],
        },
    },
    {
        "name": "create_department",
        "description": "إنشاء قسم جديد ضمن شركة معينة (يتطلب صلاحية company_admin أو super_admin)",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "اسم القسم"},
                "code": {"type": "string", "description": "رمز القسم المختصر"},
                "company_id": {"type": "string", "description": "معرف UUID للشركة التابع لها القسم"},
            },
            "required": ["name", "code", "company_id"],
        },
    },
    {
        "name": "create_user",
        "description": "إنشاء مستخدم جديد في النظام (يتطلب صلاحية company_admin أو super_admin)",
        "parameters": {
            "type": "object",
            "properties": {
                "full_name": {"type": "string", "description": "الاسم الكامل للمستخدم"},
                "email": {"type": "string", "description": "البريد الإلكتروني (فريد)"},
                "password": {"type": "string", "description": "كلمة المرور"},
                "role": {
                    "type": "string",
                    "enum": ["department_user", "company_admin", "driver", "service_requester"],
                    "description": "صلاحية المستخدم",
                },
                "company_id": {"type": "string", "description": "معرف UUID للشركة"},
                "department_id": {
                    "type": "string",
                    "description": "معرف UUID للقسم (اختياري)",
                },
                "phone": {"type": "string", "description": "رقم الهاتف (اختياري)"},
            },
            "required": ["full_name", "email", "password", "role", "company_id"],
        },
    },
    {
        "name": "search_company",
        "description": "البحث عن شركة بالاسم أو الرمز. استخدم هذه الأداة عندما تحتاج لمعرفة company_id قبل إنشاء قسم أو مستخدم.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "جزء من اسم الشركة أو رمزها للبحث"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "search_department",
        "description": "البحث عن قسم بالاسم أو الرمز ضمن شركة معينة. استخدم هذه الأداة عندما تحتاج لمعرفة department_id.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "جزء من اسم القسم أو رمزه للبحث"},
                "company_id": {"type": "string", "description": "معرف UUID للشركة (اختياري)"},
            },
            "required": ["query"],
        },
    },
]

SYSTEM_INSTRUCTION = """
أنت المساعد الذكي لنظام "غيث" لأتمتة العمليات الإدارية التشغيلية.

مهمتك:
1. الرد على استفسارات المستخدم باللغة العربية الفصحى.
2. عند طلب المستخدم تنفيذ إجراء (مثل إنشاء مستخدم، شركة، قسم)، استخدم أداة من الأدوات المتاحة.

تعليمات هامة للأدوات:
- عند إنشاء مستخدم، تأكد من أن البريد الإلكتروني فريد.
- عند إنشاء شركة، تأكد من أن الرمز فريد.
- صلاحية المستخدم المسؤول (super_admin) لا يمكن منحها عبر المساعد الذكي.
- اشرح للمستخدم ما قمت به بعد تنفيذ أي إجراء.
""".strip()


def _execute_tool(tool_name, tool_args, user):
    """Execute a Gemini tool call and return a human-readable result dict."""
    from core.serializers import UserSerializer, CompanySerializer, DepartmentSerializer

    # ── search_company ──────────────────────────────────────────
    if tool_name == "search_company":
        q = tool_args.get("query", "")
        companies = CoreCompany.objects.filter(
            Q(name__icontains=q) | Q(code__icontains=q)
        )[:10]
        if not companies:
            return {"result": "لم يتم العثور على شركات تطابق البحث."}
        rows = [
            {"id": str(c.id), "name": c.name, "code": c.code, "status": c.status}
            for c in companies
        ]
        return {"result": "الشركات الموجودة:", "companies": rows}

    # ── search_department ───────────────────────────────────────
    if tool_name == "search_department":
        q = tool_args.get("query", "")
        company_id = tool_args.get("company_id")
        qs = CoreDepartment.objects.filter(
            Q(name__icontains=q) | Q(code__icontains=q)
        )
        if company_id:
            qs = qs.filter(company_id=company_id)
        depts = qs[:10]
        if not depts:
            return {"result": "لم يتم العثور على أقسام تطابق البحث."}
        rows = [
            {"id": str(d.id), "name": d.name, "code": d.code, "company_id": str(d.company_id)}
            for d in depts
        ]
        return {"result": "الأقسام الموجودة:", "departments": rows}

    # ── create_company ──────────────────────────────────────────
    if tool_name == "create_company":
        if user.role != "super_admin":
            return {"error": "إنشاء شركة يتطلب صلاحية super_admin."}
        name, code = tool_args["name"], tool_args["code"]
        if CoreCompany.objects.filter(code=code).exists():
            return {"error": f"الرمز {code} مستخدم بالفعل لشركة أخرى."}
        company = CoreCompany.objects.create(name=name, code=code)
        return {"result": f"تم إنشاء الشركة {company.name} (رمز: {company.code}) بنجاح.", "company": CompanySerializer(company).data}

    # ── create_department ──────────────────────────────────────
    if tool_name == "create_department":
        if user.role not in ("super_admin", "company_admin"):
            return {"error": "إنشاء قسم يتطلب صلاحية company_admin أو super_admin."}
        name, code = tool_args["name"], tool_args["code"]
        company_id = tool_args["company_id"]
        try:
            company = CoreCompany.objects.get(id=company_id)
        except CoreCompany.DoesNotExist:
            return {"error": "الشركة المحددة غير موجودة."}
        if user.role == "company_admin" and str(user.company_id) != company_id:
            return {"error": "لا يمكنك إنشاء قسم لشركة غير تابع لها."}
        if CoreDepartment.objects.filter(code=code, company=company).exists():
            return {"error": f"القسم برمز {code} موجود مسبقاً في هذه الشركة."}
        dept = CoreDepartment.objects.create(name=name, code=code, company=company)
        return {"result": f"تم إنشاء القسم {dept.name} (رمز: {dept.code}) ضمن {company.name} بنجاح.", "department": DepartmentSerializer(dept).data}

    # ── create_user ─────────────────────────────────────────────
    if tool_name == "create_user":
        if user.role not in ("super_admin", "company_admin"):
            return {"error": "إنشاء مستخدم يتطلب صلاحية company_admin أو super_admin."}
        full_name = tool_args["full_name"]
        email = tool_args["email"]
        password = tool_args["password"]
        role = tool_args.get("role", "department_user")
        company_id = tool_args["company_id"]
        department_id = tool_args.get("department_id")
        phone = tool_args.get("phone", "")

        if user.role == "company_admin" and str(user.company_id) != company_id:
            return {"error": "لا يمكنك إنشاء مستخدم لشركة غير تابع لها."}

        try:
            company = CoreCompany.objects.get(id=company_id)
        except CoreCompany.DoesNotExist:
            return {"error": "الشركة المحددة غير موجودة."}

        if CoreUser.objects.filter(email=email).exists():
            return {"error": f"البريد الإلكتروني {email} مستخدم بالفعل."}

        dept = None
        if department_id:
            try:
                dept = CoreDepartment.objects.get(id=department_id, company=company)
            except CoreDepartment.DoesNotExist:
                return {"error": "القسم المحدد غير موجود ضمن هذه الشركة."}

        new_user = CoreUser.objects.create(
            full_name=full_name,
            email=email,
            company=company,
            department=dept,
            role=role,
            phone=phone,
        )
        new_user.set_password(password)
        new_user.save()

        return {
            "result": f"تم إنشاء المستخدم {full_name} ({email}) بنجاح بصلاحية {role}.",
            "user": UserSerializer(new_user).data,
        }

    return {"error": f"أداة غير معروفة: {tool_name}"}


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

    def _call_gemini(self, chat, user_message):
        import google.generativeai as genai

        genai.configure(api_key=os.environ.get('GEMINI_API_KEY', ''))

        history = list(chat.messages.all().values('role', 'content'))

        # Build Gemini contents: all messages except the latest user turn
        gemini_contents = []
        for msg in history[:-1]:
            role = "user" if msg['role'] == "user" else "model"
            gemini_contents.append({"role": role, "parts": [{"text": msg['content']}]})

        # Append the current user message
        gemini_contents.append({"role": "user", "parts": [{"text": user_message}]})

        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            system_instruction=SYSTEM_INSTRUCTION,
            tools=TOOLS,
        )

        response = model.generate_content(gemini_contents)
        return response, model, gemini_contents

    def _process_response(self, response, model, gemini_contents, chat):
        """Handle Gemini response – if it's a function_call, execute & complete the turn."""
        import google.generativeai as genai

        candidate = response.candidates[0]
        part = candidate.content.parts[0]

        # Check for function call
        if hasattr(part, 'function_call') and part.function_call:
            fc = part.function_call
            tool_name = fc.name
            tool_args = {k: v for k, v in fc.args.items()}

            # Append the assistant's function_call to contents
            gemini_contents.append(candidate.content)

            # Execute the tool
            result = _execute_tool(tool_name, tool_args, chat.user)

            # Build function response part
            func_resp_part = {
                "function_response": {
                    "name": tool_name,
                    "response": result,
                }
            }
            gemini_contents.append({"role": "user", "parts": [func_resp_part]})

            # Let Gemini summarise the result
            final = model.generate_content(gemini_contents)
            reply_text = final.text
        else:
            reply_text = response.text

        # Store assistant reply
        AIMessage.objects.create(chat=chat, role='assistant', content=reply_text)

        # Update title on first turn
        if not chat.title or chat.title == user_message[:50]:
            chat.title = user_message[:80]
            chat.save()

        return reply_text

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
            response, model, contents = self._call_gemini(chat, message)
            reply = self._process_response(response, model, contents, chat)

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
            response, model, contents = self._call_gemini(chat, last_user_msg.content)
            reply = self._process_response(response, model, contents, chat)

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

            model = genai.GenerativeModel('gemini-2.5-flash')
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
