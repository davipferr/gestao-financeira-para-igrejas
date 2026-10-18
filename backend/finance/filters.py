import calendar

from django.utils import timezone
from rest_framework import serializers

from .models import Kind

UNCATEGORIZED = 'none'


class TransactionFilterSerializer(serializers.Serializer):
    """Valida os filtros da listagem de lançamentos recebidos pela URL."""

    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    kind = serializers.ChoiceField(choices=Kind.choices, required=False)
    # Aceita o id de uma categoria ou "none" para listar os lançamentos sem categoria.
    category = serializers.CharField(required=False)
    search = serializers.CharField(required=False)

    def validate_category(self, value):
        if value == UNCATEGORIZED or value.isdigit():
            return value
        raise serializers.ValidationError('Informe o id de uma categoria ou "none" para lançamentos sem categoria.')

    def validate(self, attrs):
        date_from, date_to = attrs.get('date_from'), attrs.get('date_to')
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({'date_to': 'A data final não pode ser anterior à data inicial.'})
        return attrs

    def apply(self, queryset):
        filters = self.validated_data
        if 'date_from' in filters:
            queryset = queryset.filter(date__gte=filters['date_from'])
        if 'date_to' in filters:
            queryset = queryset.filter(date__lte=filters['date_to'])
        if 'kind' in filters:
            queryset = queryset.filter(kind=filters['kind'])
        if filters.get('category') == UNCATEGORIZED:
            queryset = queryset.filter(category__isnull=True)
        elif 'category' in filters:
            queryset = queryset.filter(category_id=int(filters['category']))
        if 'search' in filters:
            queryset = queryset.filter(description__icontains=filters['search'])
        return queryset


class ReportPeriodSerializer(serializers.Serializer):
    """Valida o período do relatório; sem datas, usa o mês atual."""

    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        today = timezone.localdate()
        last_day = calendar.monthrange(today.year, today.month)[1]
        attrs.setdefault('date_from', today.replace(day=1))
        attrs.setdefault('date_to', today.replace(day=last_day))
        if attrs['date_from'] > attrs['date_to']:
            raise serializers.ValidationError({'date_to': 'A data final não pode ser anterior à data inicial.'})
        return attrs
