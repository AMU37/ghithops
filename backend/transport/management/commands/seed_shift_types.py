from django.core.management.base import BaseCommand
from core.models import Company
from transport.models import ShiftType

WORK_TYPE_SCHEDULE = {
    "YCSR-A": (4, 3), "YCSR-B": (4, 3), "YCSR-C": (4, 3), "YCSR-D": (4, 3),
    "YCSR-c": (4, 3), "YCSRW1": (7, 7), "YCSRW2": (7, 7), "YCSRK2": (14, 7),
    "YCSRK1": (14, 7), "YCSRSH1": (6, 1), "N_PR28H1": (28, 28), "N_PR28H2": (28, 28),
    "N_PR28H3": (28, 28), "N_PR28H4": (28, 28), "SHIFT2": (42, 14), "YCSRK3": (42, 14),
    "NORMYS4": (5, 2), "NORMALY2": (6, 1), "NORMALY3": (7, 0), "NORMYS5": (4, 3),
    "NORMYS6": (4, 3), "NORMYS7": (42, 21), "N_YCSRE2": (6, 1),
    "غير محدد": (6, 1), "ورديات": (6, 1), "ycsrsc": (6, 1), "YCSRE1": (6, 1),
    "NORMYS2": (6, 1),
}

DESCRIPTIONS = {
    "YCSR-A": "ورديات من السبت الى الثلاثاء",
    "YCSR-B": "اداري من الاحد الى الاربعاء",
    "YCSR-C": "ورديات من الاثنين الى الخميس",
    "YCSR-D": "ورديات الاثنين والثلاثاء اجازة",
    "YCSR-c": "ورديات من الاربعاء الى السبت",
    "YCSRW1": "اسبوع * اسبوع",
    "YCSRW2": "اسبوع * اسبوع",
    "YCSRK2": "اسبوعين * اسبوع",
    "YCSRK1": "اسبوعين * اسبوع",
    "YCSRSH1": "ورديات عادية",
    "N_PR28H1": "شهر * شهر",
    "N_PR28H2": "شهر * شهر",
    "N_PR28H3": "شهر * شهر",
    "N_PR28H4": "شهر * شهر",
    "SHIFT2": "42 يوم * 14 يوم",
    "YCSRK3": "6 اسابيع * 3 اسابيع",
    "NORMYS4": "اداري من الاحد الى الخميس",
    "NORMALY2": "6 ايام * 1 يوم",
    "NORMALY3": "دائم (بدون اجازة)",
    "NORMYS5": "اداري من السبت الى الثلاثاء",
    "NORMYS6": "اداري من الاثنين الى الخميس",
    "NORMYS7": "6 اسابيع * 3 اسابيع",
    "N_YCSRE2": "6 ايام * 1 يوم",
    "غير محدد": "نظام افتراضي",
    "ورديات": "ورديات عادية",
    "ycsrsc": "نظام عام",
    "YCSRE1": "6 ايام * 1 يوم",
    "NORMYS2": "ورديات المبيعات",
}


class Command(BaseCommand):
    help = 'Seeds shift types for all active companies'

    def handle(self, *args, **options):
        companies = Company.objects.all()
        if not companies:
            self.stdout.write(self.style.WARNING('لا توجد شركات'))
            return

        for company in companies:
            existing = set(ShiftType.objects.filter(company=company).values_list('name', flat=True))
            added = 0
            for name, (work, vacation) in WORK_TYPE_SCHEDULE.items():
                if name not in existing:
                    ShiftType.objects.create(
                        company=company,
                        name=name,
                        description=DESCRIPTIONS.get(name, ''),
                        work_days=work,
                        vacation_days=vacation,
                        status='active',
                    )
                    added += 1
            if added:
                self.stdout.write(self.style.SUCCESS(f'أضيف {added} نوع دوام لـ {company.name}'))
            else:
                self.stdout.write(f'كل الأنواع موجودة مسبقاً في {company.name}')
        self.stdout.write(self.style.SUCCESS('تم'))
