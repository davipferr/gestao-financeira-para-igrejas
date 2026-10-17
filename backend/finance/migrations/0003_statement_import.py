# Gerada pelo Django 6.1.2 em 17/10/2026 às 19:05

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0002_seed_default_categories'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='import_key',
            field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True, verbose_name='chave de importação'),
        ),
        migrations.CreateModel(
            name='StatementImport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_name', models.CharField(max_length=255, verbose_name='arquivo')),
                ('file_format', models.CharField(choices=[('ofx', 'OFX'), ('csv', 'CSV')], max_length=3, verbose_name='formato')),
                ('imported_at', models.DateTimeField(auto_now_add=True, verbose_name='importado em')),
                ('created_count', models.PositiveIntegerField(default=0, verbose_name='lançamentos criados')),
                ('duplicate_count', models.PositiveIntegerField(default=0, verbose_name='duplicados ignorados')),
                ('ignored_count', models.PositiveIntegerField(default=0, verbose_name='linhas sem valor ignoradas')),
                ('imported_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='statement_imports', to=settings.AUTH_USER_MODEL, verbose_name='importado por')),
            ],
            options={
                'verbose_name': 'importação de extrato',
                'verbose_name_plural': 'importações de extrato',
                'ordering': ['-imported_at'],
            },
        ),
        migrations.AddField(
            model_name='transaction',
            name='statement_import',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='transactions', to='finance.statementimport', verbose_name='importação de origem'),
        ),
    ]
