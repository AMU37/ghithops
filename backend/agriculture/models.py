import uuid
from django.db import models
from core.models import Company


class Farm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='farms')
    farm_name = models.CharField(max_length=255)
    location = models.TextField()

    class Meta:
        db_table = 'farms'

    def __str__(self):
        return self.farm_name


class Crop(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='crops')
    crop_name = models.CharField(max_length=255)
    season = models.CharField(max_length=100)

    class Meta:
        db_table = 'crops'

    def __str__(self):
        return f"{self.crop_name} - {self.season}"


class IrrigationPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE, related_name='irrigation_plans')
    irrigation_date = models.DateField()
    water_quantity = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'irrigation_plans'

    def __str__(self):
        return f"Irrigation for {self.crop} on {self.irrigation_date}"
