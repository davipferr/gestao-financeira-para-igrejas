from rest_framework.permissions import BasePermission


class IsAdministrator(BasePermission):
    message = 'Apenas administradores podem realizar esta ação.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.profile.is_admin)
