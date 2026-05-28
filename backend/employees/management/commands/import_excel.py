import openpyxl
from django.core.management.base import BaseCommand
from core.models import Company, Department
from employees.models import Employee, ServiceType
from transport.models import ShiftType

EXCEL_PATH = 'employees.xlsx'
COMPANY_NAME = 'الشركة اليمنية لتكرير السكر'


class Command(BaseCommand):
    help = 'Import employees from employees.xlsx under الشركة اليمنية لتكرير السكر'

    def handle(self, *args, **options):
        self.stdout.write('=== Importing employees ===')
        wb = openpyxl.load_workbook(EXCEL_PATH)
        ws = wb.active

        company = Company.objects.filter(name=COMPANY_NAME).first()
        if not company:
            self.stdout.write(self.style.ERROR(f'Company "{COMPANY_NAME}" not found!'))
            return

        dept_set, shift_set, service_set = set(), set(), set()
        excel_data = []
        for row in range(2, ws.max_row + 1):
            vals = [ws.cell(row, c).value or '' for c in range(1, 11)]
            emp_id = str(vals[0]).strip()
            name = str(vals[1]).strip()
            if not emp_id or not name:
                continue
            excel_data.append({
                'employee_id': emp_id,
                'full_name': name,
                'phone': str(vals[2]).strip() if vals[2] else '',
                'department': str(vals[3]).strip() if vals[3] else '',
                'position': str(vals[4]).strip() if vals[4] else '',
                'shift': str(vals[5]).strip() if vals[5] else '',
                'service': str(vals[6]).strip() if vals[6] else '',
                'city': str(vals[7]).strip() if vals[7] else '',
                'status': str(vals[8]).strip() if vals[8] else '',
            })
            if vals[3]: dept_set.add(str(vals[3]).strip())
            if vals[5]: shift_set.add(str(vals[5]).strip())
            if vals[6]: service_set.add(str(vals[6]).strip())

        self.stdout.write(f'Rows: {len(excel_data)}, Depts: {len(dept_set)}, Shifts: {len(shift_set)}, Services: {len(service_set)}')

        existing_depts = set(Department.objects.values_list('name', flat=True))
        for dname in sorted(dept_set):
            if dname not in existing_depts:
                Department.objects.create(name=dname, company=company)
                existing_depts.add(dname)
        self.stdout.write(f'Departments: {len(existing_depts)}')

        shift_map = {s.name: s for s in ShiftType.objects.all()}
        for sname in sorted(shift_set):
            if sname not in shift_map:
                shift_map[sname] = ShiftType.objects.create(name=sname, company=company)
        self.stdout.write(f'Shift types: {len(shift_map)}')

        service_map = {s.name: s for s in ServiceType.objects.all()}
        for svname in sorted(service_set):
            if svname not in service_map:
                service_map[svname] = ServiceType.objects.create(name=svname, company=company)
        self.stdout.write(f'Service types: {len(service_map)}')

        excel_ids = {d['employee_id'] for d in excel_data}
        old = Employee.objects.exclude(employee_id__in=excel_ids).count()
        if old:
            Employee.objects.exclude(employee_id__in=excel_ids).delete()
            self.stdout.write(f'Deleted {old} old employees')

        created = skipped = 0
        dept_cache = {}
        for d in excel_data:
            if Employee.objects.filter(employee_id=d['employee_id']).exists():
                skipped += 1
                continue
            dept_obj = None
            if d['department']:
                if d['department'] not in dept_cache:
                    dept_cache[d['department']] = Department.objects.filter(name=d['department']).first()
                dept_obj = dept_cache[d['department']]
            Employee.objects.create(
                employee_id=d['employee_id'],
                full_name=d['full_name'],
                phone=d['phone'] or '',
                email='',
                company=company,
                department=dept_obj,
                department_name=d['department'] or '',
                position=d['position'] or '',
                shift_type=shift_map.get(d['shift']),
                service_type=service_map.get(d['service']),
                city=d['city'] or '',
                status='inactive' if d['status'] == 'غير نشط' else 'active',
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done! Created: {created}, Skipped: {skipped}, Total: {Employee.objects.count()}'
        ))
