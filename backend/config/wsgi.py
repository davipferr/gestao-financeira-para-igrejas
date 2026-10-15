"""
Configuração WSGI do projeto.

Disponibiliza a variável ``application``, que o servidor usa para rodar o
sistema em produção.

Mais detalhes em https://docs.djangoproject.com/en/6.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
