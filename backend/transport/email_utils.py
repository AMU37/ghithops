from django.core.mail import send_mail
from django.core.signing import TimestampSigner
from django.conf import settings

signer = TimestampSigner()


def make_approval_token(request_id):
    return signer.sign(str(request_id))


def _build_html_email(request_obj, approve_url, reject_url, level_label):
    return f"""
    <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #d97706;">طلب {(request_obj.employee_name or '')}</h2>
        <p style="color: #666;">الموافقة المطلوبة: {level_label}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>الموظف</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{request_obj.employee_name}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>الغرض</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{request_obj.purpose}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>التاريخ</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{request_obj.request_date}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>الوجهة</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{request_obj.destination}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>نوع النقل</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{request_obj.transport_type}</td></tr>
        </table>
        <div style="display: flex; gap: 12px;">
            <a href="{approve_url}" style="display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; font-size: 16px;">اعتماد الطلب</a>
            <a href="{reject_url}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-size: 16px;">رفض الطلب</a>
        </div>
        <p style="margin-top: 16px; color: #666; font-size: 12px;">هذا الرابط صالح لمدة 24 ساعة</p>
    </div>
    """


def send_supervisor_notification(request_obj):
    from core.models import User
    company = request_obj.company
    supervisors = User.objects.filter(company=company, role='department_user', is_active=True)
    if not supervisors:
        send_manager_notification(request_obj)
        return
    token = make_approval_token(request_obj.id)
    frontend = settings.FRONTEND_URL.rstrip('/')
    approve_url = f"{frontend}/requests/approve?token={token}&level=supervisor"
    reject_url = f"{frontend}/requests/reject?token={token}"
    subject = f"[موافقة المشرف] طلب {request_obj.employee_name or ''} - {request_obj.purpose}"
    plain = (
        f"تم تقديم طلب جديد من {request_obj.employee_name}\n"
        f"الغرض: {request_obj.purpose}\n"
        f"التاريخ: {request_obj.request_date}\n"
        f"الوجهة: {request_obj.destination}\n\n"
        f"الموافقة المطلوبة: المشرف\n"
        f"للاعتماد: {approve_url}\n"
        f"للرفض: {reject_url}"
    )
    send_mail(
        subject=subject,
        message=plain,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[u.email for u in supervisors],
        html_message=_build_html_email(request_obj, approve_url, reject_url, "المشرف"),
        fail_silently=True,
    )


def send_manager_notification(request_obj):
    from core.models import User
    company = request_obj.company
    managers = User.objects.filter(company=company, role='company_admin', is_active=True)
    if not managers:
        return
    token = make_approval_token(request_obj.id)
    frontend = settings.FRONTEND_URL.rstrip('/')
    approve_url = f"{frontend}/requests/approve?token={token}&level=manager"
    reject_url = f"{frontend}/requests/reject?token={token}"
    subject = f"[موافقة المدير] طلب {request_obj.employee_name or ''} - {request_obj.purpose}"
    plain = (
        f"تمت موافقة المشرف على طلب {request_obj.employee_name}\n"
        f"الغرض: {request_obj.purpose}\n"
        f"التاريخ: {request_obj.request_date}\n"
        f"الوجهة: {request_obj.destination}\n\n"
        f"الموافقة المطلوبة: المدير\n"
        f"للاعتماد: {approve_url}\n"
        f"للرفض: {reject_url}"
    )
    send_mail(
        subject=subject,
        message=plain,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[u.email for u in managers],
        html_message=_build_html_email(request_obj, approve_url, reject_url, "المدير"),
        fail_silently=True,
    )
