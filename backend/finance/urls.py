from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('categories', views.CategoryViewSet, basename='category')
router.register('transactions', views.TransactionViewSet, basename='transaction')
router.register('imports', views.StatementImportViewSet, basename='statement-import')

urlpatterns = [
    path('reports/dre/', views.dre_report, name='dre-report'),
    *router.urls,
]
