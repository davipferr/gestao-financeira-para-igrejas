from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import AccessLog, Profile

User = get_user_model()
PASSWORD = 'senha-de-teste-123'


def create_user(username, role=Profile.Role.MEMBER, **extra):
    user = User.objects.create_user(username=username, password=PASSWORD, **extra)
    user.profile.role = role
    user.profile.save()
    return user


class ProfileCreationTests(APITestCase):
    def test_new_user_starts_as_member(self):
        user = User.objects.create_user(username='maria', password=PASSWORD)

        self.assertEqual(user.profile.role, Profile.Role.MEMBER)

    def test_superuser_starts_as_admin(self):
        user = User.objects.create_superuser(username='contador', password=PASSWORD)

        self.assertEqual(user.profile.role, Profile.Role.ADMIN)


class LoginTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = create_user('maria', first_name='Maria', last_name='Souza')

    def test_login_returns_user_and_records_access(self):
        response = self.client.post(reverse('auth-login'), {'username': 'maria', 'password': PASSWORD})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['full_name'], 'Maria Souza')
        self.assertEqual(response.json()['role'], 'member')
        self.assertEqual(AccessLog.objects.filter(user=self.user).count(), 1)

    def test_wrong_password_is_rejected_without_recording_access(self):
        response = self.client.post(reverse('auth-login'), {'username': 'maria', 'password': 'errada'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Usuário ou senha inválidos.', str(response.json()))
        self.assertFalse(AccessLog.objects.exists())

    def test_login_requires_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)

        response = client.post(reverse('auth-login'), {'username': 'maria', 'password': PASSWORD})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_works_with_csrf_token_from_csrf_endpoint(self):
        client = APIClient(enforce_csrf_checks=True)
        client.get(reverse('auth-csrf'))
        token = client.cookies['csrftoken'].value

        response = client.post(
            reverse('auth-login'),
            {'username': 'maria', 'password': PASSWORD},
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_repeated_login_attempts_are_throttled(self):
        for _ in range(10):
            self.client.post(reverse('auth-login'), {'username': 'maria', 'password': 'errada'})

        response = self.client.post(reverse('auth-login'), {'username': 'maria', 'password': PASSWORD})

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class SessionTests(APITestCase):
    def setUp(self):
        self.user = create_user('maria')

    def test_me_requires_authentication(self):
        response = self.client.get(reverse('auth-me'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_returns_logged_user(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse('auth-me'))

        self.assertEqual(response.json()['username'], 'maria')
        self.assertEqual(response.json()['role_display'], 'Membro')

    def test_logout_ends_session(self):
        self.client.force_login(self.user)

        self.client.post(reverse('auth-logout'))
        response = self.client.get(reverse('auth-me'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AccessLogListTests(APITestCase):
    def setUp(self):
        self.admin = create_user('contador', role=Profile.Role.ADMIN)
        self.member = create_user('maria', first_name='Maria')
        AccessLog.objects.create(user=self.member)

    def test_admin_can_list_access_logs(self):
        self.client.force_login(self.admin)

        response = self.client.get(reverse('access-log-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]['username'], 'maria')
        self.assertIn('accessed_at', response.json()['results'][0])

    def test_member_cannot_list_access_logs(self):
        self.client.force_login(self.member)

        response = self.client.get(reverse('access-log-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()['detail'], 'Apenas administradores podem realizar esta ação.')
