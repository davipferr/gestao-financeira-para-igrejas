from django.contrib import admin
from django.urls import include, path, re_path

from core.views import frontend, health

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health, name='health'),
    path('api/', include('accounts.urls')),
    path('api/', include('finance.urls')),
    # Qualquer outro endereço é uma página do React (precisa ficar por último).
    re_path(r'^(?!api/|admin/|static/).*$', frontend, name='frontend'),
]
