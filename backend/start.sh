#!/bin/sh
# Inicia o sistema em produção: aplica as migrações, cria o primeiro
# administrador (se configurado) e sobe o servidor web.
set -e

python manage.py migrate --no-input

# O primeiro administrador vem das variáveis DJANGO_SUPERUSER_USERNAME,
# DJANGO_SUPERUSER_EMAIL e DJANGO_SUPERUSER_PASSWORD. Nas próximas
# inicializações ele já existe, e o aviso abaixo é esperado.
if [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
  python manage.py createsuperuser --no-input 2>/dev/null || echo "Administrador inicial já existe; nada a criar."
fi

exec gunicorn config.wsgi --bind "0.0.0.0:${PORT:-8000}" --workers 2 --access-logfile -
