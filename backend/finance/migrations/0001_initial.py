# Gerada pelo Django 6.1.2 em 17/10/2026 às 14:17

import django.core.validators
import django.db.models.deletion
import django.db.models.functions.text
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80, verbose_name='nome')),
                ('kind', models.CharField(choices=[('income', 'Rendimento'), ('expense', 'Pagamento')], max_length=10, verbose_name='tipo')),
                ('is_active', models.BooleanField(default=True, verbose_name='ativa')),
            ],
            options={
                'verbose_name': 'categoria',
                'verbose_name_plural': 'categorias',
                'ordering': ['kind', 'name'],
                'constraints': [models.UniqueConstraint(django.db.models.functions.text.Lower('name'), models.F('kind'), name='unique_category_name_per_kind')],
            },
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True, verbose_name='data')),
                ('description', models.CharField(max_length=255, verbose_name='descrição')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))], verbose_name='valor')),
                ('kind', models.CharField(choices=[('income', 'Rendimento'), ('expense', 'Pagamento')], max_length=10, verbose_name='tipo')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='cadastrado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='transactions', to='finance.category', verbose_name='categoria')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transactions', to=settings.AUTH_USER_MODEL, verbose_name='cadastrado por')),
            ],
            options={
                'verbose_name': 'lançamento',
                'verbose_name_plural': 'lançamentos',
                'ordering': ['-date', '-id'],
            },
        ),
    ]
