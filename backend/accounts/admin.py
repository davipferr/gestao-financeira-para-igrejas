from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin

from .models import AccessLog, Profile

User = get_user_model()


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False


class UserWithProfileAdmin(UserAdmin):
    inlines = [ProfileInline]
    list_display = ['username', 'first_name', 'last_name', 'role', 'is_active']

    @admin.display(description='perfil')
    def role(self, user):
        return user.profile.get_role_display()

    def get_inline_instances(self, request, obj=None):
        # Na criação o perfil já nasce pelo sinal; o inline aparece só na edição.
        if obj is None:
            return []
        return super().get_inline_instances(request, obj)


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    # O registro de acessos é evidência de uso do sistema, então fica somente leitura.
    list_display = ['user', 'accessed_at']
    list_filter = ['accessed_at']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.unregister(User)
admin.site.register(User, UserWithProfileAdmin)
