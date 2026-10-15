# Gerada pelo Django 6.1.2 em 15/10/2026 às 23:40

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AccessLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('accessed_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='data e hora do acesso')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='access_logs', to=settings.AUTH_USER_MODEL, verbose_name='usuário')),
            ],
            options={
                'verbose_name': 'registro de acesso',
                'verbose_name_plural': 'registros de acesso',
                'ordering': ['-accessed_at'],
            },
        ),
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('admin', 'Administrador'), ('member', 'Membro')], default='member', max_length=10, verbose_name='perfil')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL, verbose_name='usuário')),
            ],
            options={
                'verbose_name': 'perfil',
                'verbose_name_plural': 'perfis',
            },
        ),
    ]
