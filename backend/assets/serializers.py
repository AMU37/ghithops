from rest_framework import serializers
from .models import AssetCategory, Asset, AssetRequest


class AssetCategorySerializer(serializers.ModelSerializer):
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = AssetCategory
        fields = '__all__'
        read_only_fields = ['id', 'company']

    def get_asset_count(self, obj):
        return obj.assets.count()


class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)

    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ['id', 'company']


class AssetRequestSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)

    class Meta:
        model = AssetRequest
        fields = '__all__'
        read_only_fields = ['id', 'company']
