from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile

from .importers import (
    MAX_FILE_SIZE,
    ParsedEntry,
    StatementImportError,
    build_import_keys,
    parse_amount,
    parse_csv,
    parse_ofx,
)
from .models import Kind, StatementImport, Transaction

User = get_user_model()

# Extrato no formato SGML (OFX 1.x), como os bancos brasileiros costumam gerar:
# tags simples sem fechamento, cabeçalho em texto e codificação Windows-1252.
OFX_SAMPLE = """OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260907120000[-3:BRT]
<TRNAMT>350.00
<FITID>202609070001
<MEMO>PIX RECEBIDO - OFERTA MISSIONÁRIA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260910
<TRNAMT>-89,90
<FITID>202609100002
<NAME>CONTA DE ÁGUA SAAE
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>
"""

CSV_SAMPLE = """Data;Histórico;Valor
01/09/2026;PIX RECEBIDO;50,00
01/09/2026;PIX RECEBIDO;50,00
05/09/2026;Tarifa pacote de serviços;-32,50
08/09/2026;Dízimos culto domingo;1.234,56
"""


class ParseAmountTests(SimpleTestCase):
    def test_brazilian_and_international_formats(self):
        self.assertEqual(parse_amount('1.234,56'), Decimal('1234.56'))
        self.assertEqual(parse_amount('-150,00'), Decimal('-150.00'))
        self.assertEqual(parse_amount('1,234.56'), Decimal('1234.56'))
        self.assertEqual(parse_amount('R$ 25,5'), Decimal('25.50'))

    def test_dot_without_cents_is_thousands_separator(self):
        self.assertEqual(parse_amount('1.000'), Decimal('1000.00'))

    def test_ofx_amount_accepts_comma_as_decimal(self):
        self.assertEqual(parse_amount('-89,90', decimal_point_only=True), Decimal('-89.90'))

    def test_invalid_amount_raises(self):
        with self.assertRaisesMessage(ValueError, 'valor inválido "abc"'):
            parse_amount('abc')


class ParseOfxTests(SimpleTestCase):
    def test_reads_sgml_ofx(self):
        entries = parse_ofx(OFX_SAMPLE)

        self.assertEqual(entries, [
            ParsedEntry(date(2026, 9, 7), 'PIX RECEBIDO - OFERTA MISSIONÁRIA', Decimal('350.00'), '202609070001'),
            ParsedEntry(date(2026, 9, 10), 'CONTA DE ÁGUA SAAE', Decimal('-89.90'), '202609100002'),
        ])

    def test_file_without_transactions_is_rejected(self):
        with self.assertRaisesMessage(StatementImportError, 'Nenhum lançamento foi encontrado no arquivo OFX.'):
            parse_ofx('<OFX></OFX>')

    def test_invalid_date_points_to_the_transaction(self):
        broken = OFX_SAMPLE.replace('<DTPOSTED>20260910', '<DTPOSTED>ontem')

        with self.assertRaisesMessage(StatementImportError, 'Lançamento 2 do OFX: data inválida "ontem".'):
            parse_ofx(broken)


class ParseCsvTests(SimpleTestCase):
    def test_reads_semicolon_csv_with_accented_header(self):
        entries = parse_csv(CSV_SAMPLE)

        self.assertEqual(len(entries), 4)
        self.assertEqual(entries[2], ParsedEntry(date(2026, 9, 5), 'Tarifa pacote de serviços', Decimal('-32.50')))
        self.assertEqual(entries[3].amount, Decimal('1234.56'))

    def test_reads_comma_csv_with_iso_dates(self):
        entries = parse_csv('data,descricao,valor\n2026-09-01,Oferta,"10,00"\n')

        self.assertEqual(entries, [ParsedEntry(date(2026, 9, 1), 'Oferta', Decimal('10.00'))])

    def test_missing_column_lists_found_columns(self):
        with self.assertRaisesMessage(StatementImportError, 'Colunas encontradas: Data, Valor.'):
            parse_csv('Data;Valor\n01/09/2026;10,00\n')

    def test_invalid_line_reports_line_number(self):
        broken = CSV_SAMPLE.replace('05/09/2026', '31/02/2026')

        with self.assertRaisesMessage(StatementImportError, 'Linha 4 do CSV: data inválida "31/02/2026"'):
            parse_csv(broken)


class ImportKeyTests(SimpleTestCase):
    def test_identical_entries_in_same_file_get_different_keys(self):
        entry = ParsedEntry(date(2026, 9, 1), 'PIX RECEBIDO', Decimal('50.00'))

        first, second = build_import_keys([entry, entry])

        self.assertNotEqual(first, second)

    def test_same_file_always_produces_same_keys(self):
        entries = parse_csv(CSV_SAMPLE)

        self.assertEqual(build_import_keys(entries), build_import_keys(entries))


class StatementImportApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='contador', password='senha-de-teste-123')
        self.admin.profile.role = Profile.Role.ADMIN
        self.admin.profile.save()
        self.client.force_login(self.admin)

    def upload(self, name, content, encoding='utf-8'):
        file = SimpleUploadedFile(name, content.encode(encoding) if isinstance(content, str) else content)
        return self.client.post(reverse('statement-import-list'), {'file': file}, format='multipart')

    def test_ofx_import_creates_uncategorized_transactions(self):
        response = self.upload('extrato.ofx', OFX_SAMPLE, encoding='cp1252')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['created_count'], 2)
        expense = Transaction.objects.get(kind=Kind.EXPENSE)
        self.assertEqual(expense.amount, Decimal('89.90'))
        self.assertEqual(expense.description, 'CONTA DE ÁGUA SAAE')
        self.assertIsNone(expense.category)
        self.assertEqual(expense.created_by, self.admin)

    def test_reimporting_same_ofx_creates_nothing(self):
        self.upload('extrato.ofx', OFX_SAMPLE, encoding='cp1252')

        response = self.upload('extrato.ofx', OFX_SAMPLE, encoding='cp1252')

        self.assertEqual(response.json()['created_count'], 0)
        self.assertEqual(response.json()['duplicate_count'], 2)
        self.assertEqual(Transaction.objects.count(), 2)

    def test_csv_keeps_identical_offerings_and_skips_them_on_reimport(self):
        first = self.upload('extrato.csv', CSV_SAMPLE)
        second = self.upload('extrato.csv', CSV_SAMPLE)

        self.assertEqual(first.json()['created_count'], 4)
        self.assertEqual(second.json()['duplicate_count'], 4)
        self.assertEqual(Transaction.objects.filter(description='PIX RECEBIDO').count(), 2)

    def test_zero_amount_lines_are_ignored(self):
        response = self.upload('extrato.csv', 'Data;Descrição;Valor\n01/09/2026;Saldo anterior;0,00\n02/09/2026;Oferta;10,00\n')

        self.assertEqual(response.json()['created_count'], 1)
        self.assertEqual(response.json()['ignored_count'], 1)

    def test_invalid_file_saves_nothing(self):
        broken = CSV_SAMPLE.replace('-32,50', 'trinta')

        response = self.upload('extrato.csv', broken)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['detail'], 'Linha 4 do CSV: valor inválido "trinta".')
        self.assertFalse(Transaction.objects.exists())
        self.assertFalse(StatementImport.objects.exists())

    def test_unsupported_format_is_rejected(self):
        response = self.upload('extrato.pdf', 'conteúdo')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['detail'], 'Formato não suportado. Envie um arquivo .ofx ou .csv.')

    def test_file_too_large_is_rejected(self):
        response = self.upload('extrato.csv', b'x' * (MAX_FILE_SIZE + 1))

        self.assertEqual(response.json()['detail'], 'O arquivo deve ter no máximo 2 MB.')

    def test_missing_file_has_friendly_message(self):
        response = self.client.post(reverse('statement-import-list'), {}, format='multipart')

        self.assertEqual(response.json()['file'], ['Selecione o arquivo do extrato (.ofx ou .csv).'])

    def test_history_lists_imports(self):
        self.upload('extrato.csv', CSV_SAMPLE)

        response = self.client.get(reverse('statement-import-list'))

        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]['file_name'], 'extrato.csv')
        self.assertEqual(response.json()['results'][0]['imported_by_name'], 'contador')

    def test_member_cannot_import(self):
        member = User.objects.create_user(username='maria', password='senha-de-teste-123')
        self.client.force_login(member)

        response = self.upload('extrato.csv', CSV_SAMPLE)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
