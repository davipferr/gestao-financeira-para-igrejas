"""
Configuração ASGI do projeto.

Disponibiliza a variável ``application``, usada por servidores assíncronos
para rodar o sistema.

Mais detalhes em https://docs.djangoproject.com/en/6.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()
