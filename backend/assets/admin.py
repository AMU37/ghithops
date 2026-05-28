from django.contrib import admin
from .models import AssetCategory, Asset, AssetRequest

admin.site.register(AssetCategory)
admin.site.register(Asset)
admin.site.register(AssetRequest)
