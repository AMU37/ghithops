import uuid
from django.db import models
from core.models import Company, User


class AIChat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ai_chats')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_chats')
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_chats'
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f"Chat {self.created_at}"


class AIMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(AIChat, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=[('user', 'User'), ('assistant', 'Assistant')])
    content = models.TextField()
    tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_messages'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class OCRDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ocr_documents')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ocr_documents')
    title = models.CharField(max_length=255, blank=True)
    image = models.TextField(blank=True)
    extracted_text = models.TextField(blank=True)
    doc_type = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ocr_documents'
        ordering = ['-created_at']

    def __str__(self):
        return self.title or f"OCR {self.created_at}"


class AnalyticsReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='analytics_reports')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analytics_reports')
    report_type = models.CharField(max_length=100)
    parameters = models.JSONField(default=dict, blank=True)
    result_data = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'), ('generating', 'Generating'), ('ready', 'Ready'), ('failed', 'Failed'),
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analytics_reports'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.report_type} - {self.status}"
