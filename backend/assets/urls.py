from rest_framework.routers import DefaultRouter
from .views import AssetCategoryViewSet, AssetViewSet, AssetRequestViewSet

router = DefaultRouter()
router.register(r'categories', AssetCategoryViewSet, basename='asset-categories')
router.register(r'assets', AssetViewSet, basename='assets')
router.register(r'requests', AssetRequestViewSet, basename='asset-requests')

urlpatterns = router.urls
