from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

def root_redirect(request):
    return redirect('/api/')

urlpatterns = [
    path('', root_redirect),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/transport/', include('transport.urls')),
    path('api/housing/', include('housing.urls')),
    path('api/services/', include('services.urls')),
    path('api/assets/', include('assets.urls')),
    path('api/cleaning/', include('cleaning.urls')),
    path('api/agriculture/', include('agriculture.urls')),
    path('api/ai/', include('ai_assistant.urls')),
    path('api/employees/', include('employees.urls')),
]
