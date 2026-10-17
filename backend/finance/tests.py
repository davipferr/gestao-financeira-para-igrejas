from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile

from .models import Category, Kind, Transaction

User = get_user_model()


def create_user(username, role):
    user = User.objects.create_user(username=username, password='senha-de-teste-123')
    user.profile.role = role
    user.profile.save()
    return user


class FinanceTestCase(APITestCase):
    def setUp(self):
        self.admin = create_user('contador', Profile.Role.ADMIN)
        self.member = create_user('maria', Profile.Role.MEMBER)
        self.tithes = Category.objects.get(name='Dízimos')
        self.water = Category.objects.get(name='Água')
        self.client.force_login(self.admin)

    def create_transaction(self, **fields):
        data = {
            'date': date(2026, 9, 1),
            'description': 'Lançamento de teste',
            'amount': Decimal('100.00'),
            'kind': Kind.INCOME,
            'category': self.tithes,
            'created_by': self.admin,
        }
        data.update(fields)
        return Transaction.objects.create(**data)


class DefaultCategoriesTests(FinanceTestCase):
    def test_default_church_categories_are_created(self):
        self.assertTrue(Category.objects.filter(name='Ofertas', kind=Kind.INCOME).exists())
        self.assertTrue(Category.objects.filter(name='Energia elétrica', kind=Kind.EXPENSE).exists())


class CategoryTests(FinanceTestCase):
    def test_admin_creates_category(self):
        response = self.client.post(reverse('category-list'), {'name': 'Cantina', 'kind': 'income'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['kind_display'], 'Rendimento')

    def test_duplicate_name_in_same_kind_is_rejected_ignoring_case(self):
        response = self.client.post(reverse('category-list'), {'name': ' dízimos ', 'kind': 'income'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['name'], ['Já existe uma categoria de rendimento com este nome.'])

    def test_same_name_in_other_kind_is_allowed(self):
        response = self.client.post(reverse('category-list'), {'name': 'Eventos', 'kind': 'expense'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_can_be_filtered_by_kind_and_active(self):
        self.water.is_active = False
        self.water.save()

        response = self.client.get(reverse('category-list'), {'kind': 'expense', 'active': 'true'})

        names = [category['name'] for category in response.json()]
        self.assertNotIn('Água', names)
        self.assertNotIn('Dízimos', names)
        self.assertIn('Aluguel', names)

    def test_category_in_use_cannot_be_deleted(self):
        self.create_transaction(category=self.tithes)

        response = self.client.delete(reverse('category-detail', args=[self.tithes.pk]))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Desative-a em vez de excluir', response.json()['detail'])
        self.assertTrue(Category.objects.filter(pk=self.tithes.pk).exists())

    def test_unused_category_can_be_deleted(self):
        response = self.client.delete(reverse('category-detail', args=[self.water.pk]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_member_cannot_access_categories(self):
        self.client.force_login(self.member)

        response = self.client.get(reverse('category-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TransactionTests(FinanceTestCase):
    def payload(self, **fields):
        data = {
            'date': '2026-09-07',
            'description': 'Dízimos do culto de domingo',
            'amount': '1250.40',
            'kind': 'income',
            'category': self.tithes.pk,
        }
        data.update(fields)
        return data

    def test_admin_creates_transaction_and_is_recorded_as_author(self):
        response = self.client.post(reverse('transaction-list'), self.payload())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        transaction = Transaction.objects.get(pk=response.json()['id'])
        self.assertEqual(transaction.created_by, self.admin)
        self.assertEqual(response.json()['category_name'], 'Dízimos')

    def test_amount_keeps_exact_cents(self):
        response = self.client.post(reverse('transaction-list'), self.payload(amount='0.30'))

        self.assertEqual(response.json()['amount'], '0.30')
        self.assertEqual(Transaction.objects.get().amount, Decimal('0.30'))

    def test_amount_must_be_positive(self):
        response = self.client.post(reverse('transaction-list'), self.payload(amount='0'))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['amount'], ['O valor deve ser maior que zero.'])

    def test_category_must_match_transaction_kind(self):
        response = self.client.post(reverse('transaction-list'), self.payload(kind='expense'))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json()['category'],
            ['A categoria "Dízimos" é de rendimento, mas o lançamento é um pagamento.'],
        )

    def test_transaction_without_category_is_allowed(self):
        response = self.client.post(reverse('transaction-list'), self.payload(category=''))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.json()['category_name'])

    def test_admin_updates_and_deletes_transaction(self):
        transaction = self.create_transaction()
        url = reverse('transaction-detail', args=[transaction.pk])

        response = self.client.patch(url, {'amount': '150.00'})
        self.assertEqual(response.json()['amount'], '150.00')

        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Transaction.objects.exists())

    def test_member_cannot_access_transactions(self):
        self.client.force_login(self.member)

        response = self.client.get(reverse('transaction-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TransactionFilterTests(FinanceTestCase):
    def setUp(self):
        super().setUp()
        self.create_transaction(date=date(2026, 8, 30), description='Dízimos de agosto')
        self.create_transaction(date=date(2026, 9, 5), description='Oferta missionária')
        self.create_transaction(
            date=date(2026, 9, 10), description='Conta de água', kind=Kind.EXPENSE, category=self.water,
        )
        self.create_transaction(date=date(2026, 9, 12), description='Depósito sem identificação', category=None)

    def descriptions(self, params):
        response = self.client.get(reverse('transaction-list'), params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [item['description'] for item in response.json()['results']]

    def test_filter_by_period(self):
        result = self.descriptions({'date_from': '2026-09-01', 'date_to': '2026-09-10'})

        self.assertEqual(result, ['Conta de água', 'Oferta missionária'])

    def test_filter_by_kind(self):
        self.assertEqual(self.descriptions({'kind': 'expense'}), ['Conta de água'])

    def test_filter_uncategorized(self):
        self.assertEqual(self.descriptions({'category': 'none'}), ['Depósito sem identificação'])

    def test_filter_by_category_and_search(self):
        result = self.descriptions({'category': self.tithes.pk, 'search': 'oferta'})

        self.assertEqual(result, ['Oferta missionária'])

    def test_invalid_period_returns_message(self):
        response = self.client.get(reverse('transaction-list'), {'date_from': '2026-09-10', 'date_to': '2026-09-01'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['date_to'], ['A data final não pode ser anterior à data inicial.'])
