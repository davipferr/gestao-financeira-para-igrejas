"""
Leitura de extratos bancários (OFX e CSV) e importação dos lançamentos.

Os extratos dos bancos brasileiros costumam vir em OFX 1.x no formato SGML, em
que as tags simples não têm fechamento, e com codificação Windows-1252. Por isso
o OFX é lido com expressões regulares tolerantes, sem exigir um XML válido.
"""

import csv
import hashlib
import io
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django.db import transaction as db_transaction

from .models import Kind, StatementImport, Transaction

MAX_FILE_SIZE = 2 * 1024 * 1024
DESCRIPTION_MAX_LENGTH = 255
CENTS = Decimal('0.01')


class StatementImportError(Exception):
    """Erro de leitura do extrato, com mensagem pronta para mostrar ao usuário."""


@dataclass(frozen=True)
class ParsedEntry:
    date: date
    description: str
    # Valor com sinal, como vem do banco: negativo é saída e positivo é entrada.
    amount: Decimal
    external_id: str | None = None


def decode(raw):
    try:
        return raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        return raw.decode('cp1252')


def normalize(text):
    without_accents = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    return ' '.join(without_accents.casefold().split())


def parse_amount(value, decimal_point_only=False):
    text = value.strip().replace('R$', '').replace(' ', '')
    if decimal_point_only:
        # No OFX o ponto é sempre o separador decimal; alguns bancos usam vírgula no lugar.
        normalized = text.replace(',', '.')
    else:
        # No CSV o último separador é o decimal quando tem 1 ou 2 dígitos depois dele
        # ("1.234,56" ou "1,234.56"); caso contrário, os separadores são de milhar ("1.234").
        last = max(text.rfind(','), text.rfind('.'))
        if last != -1 and len(text) - last - 1 in (1, 2):
            integer_part = text[:last].replace(',', '').replace('.', '')
            normalized = f'{integer_part}.{text[last + 1:]}'
        else:
            normalized = text.replace(',', '').replace('.', '')
    try:
        return Decimal(normalized).quantize(CENTS, rounding=ROUND_HALF_UP)
    except InvalidOperation:
        raise ValueError(f'valor inválido "{value.strip()}"')


def parse_ofx(text):
    blocks = re.findall(r'<STMTTRN>(.*?)</STMTTRN>', text, flags=re.IGNORECASE | re.DOTALL)
    if not blocks:
        raise StatementImportError('Nenhum lançamento foi encontrado no arquivo OFX.')

    entries = []
    for position, block in enumerate(blocks, start=1):
        fields = {
            tag.upper(): content.strip()
            for tag, content in re.findall(r'<(\w+)>([^<\r\n]*)', block)
        }
        try:
            raw_date = fields.get('DTPOSTED', '')
            try:
                entry_date = datetime.strptime(raw_date[:8], '%Y%m%d').date()
            except ValueError:
                raise ValueError(f'data inválida "{raw_date}"')
            if 'TRNAMT' not in fields:
                raise ValueError('valor não informado')
            amount = parse_amount(fields['TRNAMT'], decimal_point_only=True)
        except ValueError as error:
            raise StatementImportError(f'Lançamento {position} do OFX: {error}.')

        description = fields.get('MEMO') or fields.get('NAME') or fields.get('TRNTYPE') or 'Lançamento importado'
        entries.append(ParsedEntry(entry_date, description, amount, fields.get('FITID') or None))
    return entries


CSV_COLUMNS = {
    'date': {'data'},
    'description': {'descricao', 'historico'},
    'amount': {'valor'},
}
CSV_DATE_FORMATS = ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']


def parse_csv_date(value):
    for date_format in CSV_DATE_FORMATS:
        try:
            return datetime.strptime(value.strip(), date_format).date()
        except ValueError:
            continue
    raise ValueError(f'data inválida "{value.strip()}" (use dd/mm/aaaa)')


def parse_csv(text):
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        raise StatementImportError('O arquivo CSV está vazio.')

    delimiter = ';' if ';' in lines[0] else ','
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    header = next(row for row in reader if any(cell.strip() for cell in row))

    columns = {}
    for index, name in enumerate(header):
        for key, accepted in CSV_COLUMNS.items():
            if normalize(name) in accepted:
                columns[key] = index
    missing = [key for key in CSV_COLUMNS if key not in columns]
    if missing:
        found = ', '.join(name.strip() for name in header)
        raise StatementImportError(
            f'O CSV precisa ter as colunas data, descrição e valor. Colunas encontradas: {found}.'
        )

    entries = []
    for row in reader:
        if not any(cell.strip() for cell in row):
            continue
        try:
            try:
                raw_date, description, raw_amount = (row[columns[key]] for key in CSV_COLUMNS)
            except IndexError:
                raise ValueError('a linha não tem todas as colunas')
            entries.append(ParsedEntry(
                parse_csv_date(raw_date),
                description.strip() or 'Lançamento importado',
                parse_amount(raw_amount),
            ))
        except ValueError as error:
            raise StatementImportError(f'Linha {reader.line_num} do CSV: {error}.')

    if not entries:
        raise StatementImportError('Nenhum lançamento foi encontrado no arquivo CSV.')
    return entries


def build_import_keys(entries):
    """
    Gera a impressão digital de cada lançamento para detectar duplicados.

    Quando o banco informa um identificador (FITID do OFX), ele é usado. Sem
    identificador, a chave combina data, valor e descrição, mais a ordem da
    repetição dentro do arquivo: assim duas ofertas iguais no mesmo dia não
    são confundidas, mas importar o mesmo extrato de novo não duplica nada.
    """
    occurrences = Counter()
    keys = []
    for entry in entries:
        if entry.external_id:
            base = f'ofx|{entry.external_id}|{entry.date}|{entry.amount}'
        else:
            signature = (entry.date, entry.amount, normalize(entry.description))
            occurrences[signature] += 1
            base = f'{entry.date}|{entry.amount}|{signature[2]}|{occurrences[signature]}'
        keys.append(hashlib.sha256(base.encode('utf-8')).hexdigest())
    return keys


def import_statement(uploaded_file, user):
    file_name = uploaded_file.name
    extension = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else ''
    if extension not in StatementImport.FileFormat.values:
        raise StatementImportError('Formato não suportado. Envie um arquivo .ofx ou .csv.')
    if uploaded_file.size > MAX_FILE_SIZE:
        raise StatementImportError('O arquivo deve ter no máximo 2 MB.')

    text = decode(uploaded_file.read())
    entries = parse_ofx(text) if extension == StatementImport.FileFormat.OFX else parse_csv(text)
    keys = build_import_keys(entries)

    with db_transaction.atomic():
        statement_import = StatementImport.objects.create(
            file_name=file_name[:255],
            file_format=extension,
            imported_by=user,
        )
        known_keys = set(Transaction.objects.filter(import_key__in=keys).values_list('import_key', flat=True))
        new_transactions = []
        for entry, key in zip(entries, keys):
            if entry.amount == 0:
                statement_import.ignored_count += 1
            elif key in known_keys:
                statement_import.duplicate_count += 1
            else:
                known_keys.add(key)
                new_transactions.append(Transaction(
                    date=entry.date,
                    description=entry.description[:DESCRIPTION_MAX_LENGTH],
                    amount=abs(entry.amount),
                    kind=Kind.EXPENSE if entry.amount < 0 else Kind.INCOME,
                    created_by=user,
                    statement_import=statement_import,
                    import_key=key,
                ))
        Transaction.objects.bulk_create(new_transactions)
        statement_import.created_count = len(new_transactions)
        statement_import.save()
    return statement_import
