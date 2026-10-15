from django.conf import settings
from django.db import models


class Profile(models.Model):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrador'
        MEMBER = 'member', 'Membro'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='usuário',
    )
    role = models.CharField('perfil', max_length=10, choices=Role.choices, default=Role.MEMBER)

    class Meta:
        verbose_name = 'perfil'
        verbose_name_plural = 'perfis'

    def __str__(self):
        return f'{self.user.get_username()} ({self.get_role_display()})'

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN


class AccessLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='access_logs',
        verbose_name='usuário',
    )
    accessed_at = models.DateTimeField('data e hora do acesso', auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'registro de acesso'
        verbose_name_plural = 'registros de acesso'
        ordering = ['-accessed_at']

    def __str__(self):
        return f'{self.user.get_username()} em {self.accessed_at:%d/%m/%Y %H:%M}'
