from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile(sender, instance, created, **kwargs):
    # Usuário novo começa como Membro, exceto o superusuário (o contador ou
    # tesoureiro criado pelo createsuperuser), que já nasce Administrador.
    if created:
        role = Profile.Role.ADMIN if instance.is_superuser else Profile.Role.MEMBER
        Profile.objects.create(user=instance, role=role)
