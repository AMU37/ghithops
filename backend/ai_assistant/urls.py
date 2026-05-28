from rest_framework.routers import DefaultRouter
from .views import AIChatViewSet, OCRDocumentViewSet, AnalyticsViewSet

router = DefaultRouter()
router.register(r'chats', AIChatViewSet, basename='ai-chats')
router.register(r'ocr', OCRDocumentViewSet, basename='ocr-documents')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')

urlpatterns = router.urls
