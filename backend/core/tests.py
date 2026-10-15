from django.test import TestCase
from django.urls import reverse


class HealthCheckTests(TestCase):
    def test_health_is_public_and_reports_postgresql(self):
        response = self.client.get(reverse('health'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok', 'database': 'postgresql'})
