from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.functions import Lower


class Kind(models.TextChoices):
    INCOME = 'income', 'Rendimento'
    EXPENSE = 'expense', 'Pagamento'


class Category(models.Model):
    name = models.CharField('nome', max_length=80)
    kind = models.CharField('tipo', max_length=10, choices=Kind.choices)
    is_active = models.BooleanField('ativa', default=True)

    class Meta:
        verbose_name = 'categoria'
        verbose_name_plural = 'categorias'
        ordering = ['kind', 'name']
        constraints = [
            models.UniqueConstraint(Lower('name'), 'kind', name='unique_category_name_per_kind'),
        ]

    def __str__(self):
        return f'{self.name} ({self.get_kind_display()})'


class Transaction(models.Model):
    date = models.DateField('data', db_index=True)
    description = models.CharField('descrição', max_length=255)
    # O valor é sempre positivo; o campo "kind" diz se ele entra ou sai do caixa.
    amount = models.DecimalField(
        'valor',
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    kind = models.CharField('tipo', max_length=10, choices=Kind.choices)
    # A categoria pode ficar vazia, porque os lançamentos importados do extrato
    # chegam sem categoria e são classificados depois.
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='transactions',
        verbose_name='categoria',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='transactions',
        verbose_name='cadastrado por',
    )
    created_at = models.DateTimeField('cadastrado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'lançamento'
        verbose_name_plural = 'lançamentos'
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.date:%d/%m/%Y} - {self.description} - R$ {self.amount}'

    def clean(self):
        # Usado pelo admin do Django; na API a mesma regra fica no serializer.
        if self.category_id and self.category.kind != self.kind:
            raise ValidationError({'category': 'A categoria precisa ser do mesmo tipo do lançamento.'})
