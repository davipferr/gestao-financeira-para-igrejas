from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = 'accounts'
    verbose_name = 'Contas e acessos'

    def ready(self):
        from . import signals  # noqa: F401
