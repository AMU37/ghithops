import uuid
from django.db import models
from core.models import Company


class CleaningTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='cleaning_tasks')
    location = models.CharField(max_length=255)
    task_date = models.DateField()
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ], default='pending')

    class Meta:
        db_table = 'cleaning_tasks'

    def __str__(self):
        return f"{self.location} - {self.task_date}"


class CleaningTeam(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='cleaning_teams')
    team_name = models.CharField(max_length=255)
    supervisor = models.CharField(max_length=255)

    class Meta:
        db_table = 'cleaning_teams'

    def __str__(self):
        return self.team_name


class Inspection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(CleaningTask, on_delete=models.CASCADE, related_name='inspections')
    score = models.IntegerField()
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'inspections'

    def __str__(self):
        return f"Inspection for {self.task} - Score: {self.score}"
