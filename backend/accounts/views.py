from django.contrib.auth import login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccessLog
from .permissions import IsAdministrator
from .serializers import AccessLogSerializer, LoginSerializer, UserSerializer


@method_decorator(ensure_csrf_cookie, name='get')
class CsrfView(APIView):
    """Entrega o cookie CSRF que o frontend precisa enviar junto com o login."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name='post')
class LoginView(APIView):
    # O DRF só confere o CSRF de quem já está logado. O csrf_protect cobre o
    # próprio login, evitando que outro site faça login em nome do usuário.
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        AccessLog.objects.create(user=user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class AccessLogListView(generics.ListAPIView):
    serializer_class = AccessLogSerializer
    permission_classes = [IsAdministrator]
    queryset = AccessLog.objects.select_related('user')
