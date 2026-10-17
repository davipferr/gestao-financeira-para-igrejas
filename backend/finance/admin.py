from django.contrib import admin

from .models import Category, Transaction


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
