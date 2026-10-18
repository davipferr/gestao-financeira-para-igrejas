"""
Demonstrativo de Resultado do Exercício (DRE) simplificado para a igreja.

O relatório traz apenas totais (por tipo, por categoria e por mês), nunca os
lançamentos individuais. Por isso ele pode ser mostrado aos membros como
prestação de contas sem expor quem deu cada dízimo ou oferta.
"""

from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncMonth

from .models import Kind, Transaction

ZERO = Decimal('0.00')
UNCATEGORIZED_LABEL = 'Sem categoria'


def money(value):
    return str((value or ZERO).quantize(ZERO))


def months_between(start, end):
    current = date(start.year, start.month, 1)
    while current <= end:
        yield current
        current = date(current.year + current.month // 12, current.month % 12 + 1, 1)


def build_dre(date_from, date_to):
    transactions = Transaction.objects.filter(date__gte=date_from, date__lte=date_to)

    sections = {}
    for kind in Kind:
        rows = list(
            transactions.filter(kind=kind)
            .values('category_id', 'category__name')
            .annotate(total=Sum('amount'))
            .order_by('-total', 'category__name')
        )
        categories = [
            {
                'id': row['category_id'],
                'name': row['category__name'] or UNCATEGORIZED_LABEL,
                'total': money(row['total']),
            }
            for row in rows
        ]
        sections[kind] = {
            'total': sum((row['total'] for row in rows), ZERO),
            'categories': categories,
        }

    totals_by_month = {
        (row['month'], row['kind']): row['total']
        for row in transactions.annotate(month=TruncMonth('date'))
        .values('month', 'kind')
        .annotate(total=Sum('amount'))
    }
    monthly = []
    for month in months_between(date_from, date_to):
        income = totals_by_month.get((month, Kind.INCOME), ZERO)
        expense = totals_by_month.get((month, Kind.EXPENSE), ZERO)
        monthly.append({
            'month': month.strftime('%Y-%m'),
            'income': money(income),
            'expense': money(expense),
            'result': money(income - expense),
        })

    income_total = sections[Kind.INCOME]['total']
    expense_total = sections[Kind.EXPENSE]['total']
    result = income_total - expense_total
    return {
        'period': {'date_from': date_from.isoformat(), 'date_to': date_to.isoformat()},
        'income': {'total': money(income_total), 'categories': sections[Kind.INCOME]['categories']},
        'expense': {'total': money(expense_total), 'categories': sections[Kind.EXPENSE]['categories']},
        'result': money(result),
        'result_label': 'Superávit' if result >= 0 else 'Déficit',
        'monthly': monthly,
    }
