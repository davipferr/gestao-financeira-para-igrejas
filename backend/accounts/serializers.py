from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from .models import AccessLog


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(label='usuário')
    password = serializers.CharField(label='senha', style={'input_type': 'password'}, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['username'],
            password=attrs['password'],
        )
        if user is None:
            # Mesma mensagem para usuário inexistente e senha errada, para não revelar quais usuários existem.
            raise serializers.ValidationError('Usuário ou senha inválidos.', code='authorization')
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    role = serializers.CharField(source='profile.role', read_only=True)
    role_display = serializers.CharField(source='profile.get_role_display', read_only=True)

    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'full_name', 'role', 'role_display']


class AccessLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.get_username', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = AccessLog
        fields = ['id', 'username', 'full_name', 'accessed_at']
