import tempfile
from pathlib import Path

from django.test import TestCase, override_settings
from django.urls import reverse


class HealthCheckTests(TestCase):
    def test_health_is_public_and_reports_postgresql(self):
        response = self.client.get(reverse('health'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok', 'database': 'postgresql'})


class FrontendTests(TestCase):
    def setUp(self):
        self.dist = Path(tempfile.mkdtemp())
        (self.dist / 'index.html').write_text('<div id="root"></div>', encoding='utf-8')

    def test_react_routes_receive_index_html(self):
        with override_settings(FRONTEND_DIST=self.dist):
            response = self.client.get('/lancamentos')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b''.join(response.streaming_content), b'<div id="root"></div>')

    def test_unknown_api_routes_are_not_sent_to_react(self):
        with override_settings(FRONTEND_DIST=self.dist):
            response = self.client.get('/api/nao-existe/')

        self.assertEqual(response.status_code, 404)

    def test_missing_build_explains_what_to_do(self):
        with override_settings(FRONTEND_DIST=self.dist / 'inexistente'):
            response = self.client.get('/lancamentos')

        self.assertEqual(response.status_code, 404)
