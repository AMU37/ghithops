from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import AssetCategory, Asset, AssetRequest
from .serializers import AssetCategorySerializer, AssetSerializer, AssetRequestSerializer


class AssetCategoryViewSet(viewsets.ModelViewSet):
    module = 'assets'
    serializer_class = AssetCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AssetCategory.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class AssetViewSet(viewsets.ModelViewSet):
    module = 'assets'
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Asset.objects.filter(company=self.request.user.company).select_related('category')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class AssetRequestViewSet(viewsets.ModelViewSet):
    module = 'assets'
    serializer_class = AssetRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AssetRequest.objects.filter(company=self.request.user.company).select_related('asset', 'category')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)
