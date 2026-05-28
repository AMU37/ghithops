from django.db import migrations


def create_requests_department(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    Department = apps.get_model('core', 'Department')
    for company in Company.objects.all():
        Department.objects.get_or_create(
            company=company,
            name='الطلبات',
            defaults={'code': 'REQUESTS'}
        )


def reverse_func(apps, schema_editor):
    Department = apps.get_model('core', 'Department')
    Department.objects.filter(name='الطلبات').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_add_service_requester_role'),
    ]

    operations = [
        migrations.RunPython(create_requests_department, reverse_func),
    ]
