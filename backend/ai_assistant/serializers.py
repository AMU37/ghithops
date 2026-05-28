from rest_framework import serializers
from .models import AIChat, AIMessage, OCRDocument, AnalyticsReport


class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = ['id', 'chat', 'role', 'content', 'tokens_used', 'created_at']
        read_only_fields = ['id', 'tokens_used', 'created_at']


class AIChatSerializer(serializers.ModelSerializer):
    messages = AIMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = AIChat
        fields = ['id', 'company', 'user', 'title', 'messages', 'message_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'company', 'user', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()


class AIChatListSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = AIChat
        fields = ['id', 'title', 'message_count', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()


class AIChatCreateSerializer(serializers.Serializer):
    message = serializers.CharField()


class OCRDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OCRDocument
        fields = ['id', 'company', 'user', 'title', 'image', 'extracted_text', 'doc_type', 'created_at']
        read_only_fields = ['id', 'company', 'user', 'extracted_text', 'created_at']


class AnalyticsReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsReport
        fields = '__all__'
        read_only_fields = ['id', 'company', 'user', 'result_data', 'status', 'created_at']


class AnalyticsReportListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsReport
        fields = ['id', 'report_type', 'parameters', 'status', 'created_at']
