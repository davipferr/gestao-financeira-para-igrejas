from django.contrib import admin

from .models import Category, StatementImport, Transaction


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'kind', 'is_active']
    list_filter = ['kind', 'is_active']
    search_fields = ['name']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['date', 'description', 'kind', 'amount', 'category']
    list_filter = ['kind', 'category', 'date']
    search_fields = ['description']
    date_hierarchy = 'date'
    autocomplete_fields = ['category']
    readonly_fields = ['created_by', 'created_at', 'updated_at']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(StatementImport)
class StatementImportAdmin(admin.ModelAdmin):
    # O histórico é gerado pela importação na API, então fica somente leitura.
    list_display = ['file_name', 'file_format', 'imported_by', 'imported_at', 'created_count', 'duplicate_count']
    list_filter = ['file_format', 'imported_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
