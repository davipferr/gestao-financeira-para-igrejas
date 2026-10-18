from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile

from .models import Category, Kind, Transaction

User = get_user_model()


class DreReportTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='contador', password='senha-de-teste-123')
        self.admin.profile.role = Profile.Role.ADMIN
        self.admin.profile.save()
        self.member = User.objects.create_user(username='maria', password='senha-de-teste-123')
        self.client.force_login(self.admin)

        tithes = Category.objects.get(name='Dízimos')
        offerings = Category.objects.get(name='Ofertas')
        water = Category.objects.get(name='Água')
        self.add(date(2026, 7, 5), '1000.00', Kind.INCOME, tithes)
        self.add(date(2026, 7, 12), '250.10', Kind.INCOME, offerings)
        self.add(date(2026, 7, 20), '89.90', Kind.EXPENSE, water)
        self.add(date(2026, 9, 3), '0.10', Kind.INCOME, tithes)
        self.add(date(2026, 9, 3), '0.20', Kind.INCOME, tithes)
        self.add(date(2026, 9, 15), '40.00', Kind.INCOME, None)
        self.add(date(2026, 9, 20), '500.00', Kind.EXPENSE, water)
        self.add(date(2026, 10, 1), '999.00', Kind.INCOME, tithes)

    def add(self, day, amount, kind, category):
        Transaction.objects.create(
            date=day, description='Lançamento de teste', amount=Decimal(amount),
            kind=kind, category=category, created_by=self.admin,
        )

    def get_dre(self, **params):
        response = self.client.get(reverse('dre-report'), params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.json()

    def test_totals_by_category_and_result(self):
        dre = self.get_dre(date_from='2026-07-01', date_to='2026-07-31')

        self.assertEqual(dre['income']['total'], '1250.10')
        self.assertEqual(dre['income']['categories'], [
            {'id': Category.objects.get(name='Dízimos').pk, 'name': 'Dízimos', 'total': '1000.00'},
            {'id': Category.objects.get(name='Ofertas').pk, 'name': 'Ofertas', 'total': '250.10'},
        ])
        self.assertEqual(dre['expense']['total'], '89.90')
        self.assertEqual(dre['result'], '1160.20')
        self.assertEqual(dre['result_label'], 'Superávit')

    def test_sums_keep_exact_cents(self):
        dre = self.get_dre(date_from='2026-09-03', date_to='2026-09-03')

        self.assertEqual(dre['income']['total'], '0.30')

    def test_uncategorized_transactions_appear_as_own_line(self):
        dre = self.get_dre(date_from='2026-09-01', date_to='2026-09-30')

        self.assertIn({'id': None, 'name': 'Sem categoria', 'total': '40.00'}, dre['income']['categories'])

    def test_negative_result_is_a_deficit(self):
        dre = self.get_dre(date_from='2026-09-01', date_to='2026-09-30')

        self.assertEqual(dre['result'], '-459.70')
        self.assertEqual(dre['result_label'], 'Déficit')

    def test_monthly_series_fills_months_without_transactions(self):
        dre = self.get_dre(date_from='2026-07-01', date_to='2026-10-31')

        self.assertEqual([month['month'] for month in dre['monthly']], ['2026-07', '2026-08', '2026-09', '2026-10'])
        self.assertEqual(dre['monthly'][1], {'month': '2026-08', 'income': '0.00', 'expense': '0.00', 'result': '0.00'})
        self.assertEqual(dre['monthly'][3]['income'], '999.00')

    def test_default_period_is_current_month(self):
        today = timezone.localdate()

        dre = self.get_dre()

        self.assertEqual(dre['period']['date_from'], today.replace(day=1).isoformat())
        self.assertEqual(len(dre['monthly']), 1)

    def test_member_sees_totals_without_transaction_details(self):
        self.client.force_login(self.member)

        dre = self.get_dre(date_from='2026-07-01', date_to='2026-07-31')

        self.assertEqual(dre['income']['total'], '1250.10')
        self.assertNotIn('Lançamento de teste', str(dre))

    def test_anonymous_user_cannot_see_report(self):
        self.client.logout()

        response = self.client.get(reverse('dre-report'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_period_returns_message(self):
        response = self.client.get(reverse('dre-report'), {'date_from': '2026-09-30', 'date_to': '2026-09-01'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['date_to'], ['A data final não pode ser anterior à data inicial.'])
