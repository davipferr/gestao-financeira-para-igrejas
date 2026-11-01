import os
import re
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')


def required_env(name):
    if name not in os.environ:
        raise ImproperlyConfigured(
            f'A variável de ambiente {name} não foi definida. '
            'Confira o arquivo backend/.env (use o .env.example como modelo).'
        )
    return os.environ[name]


def env_list(name, default=''):
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]


SECRET_KEY = required_env('DJANGO_SECRET_KEY')

DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')

# O Render informa o endereço público do serviço nesta variável.
if os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    ALLOWED_HOSTS.append(os.environ['RENDER_EXTERNAL_HOSTNAME'])

CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS')


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'core',
    'accounts',
    'finance',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Em produção os serviços de hospedagem fornecem o banco em uma única variável
# (DATABASE_URL). Localmente, cada parte da conexão fica no arquivo .env.
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.parse(os.environ['DATABASE_URL'], conn_max_age=600, conn_health_checks=True),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': required_env('DB_NAME'),
            'USER': required_env('DB_USER'),
            'PASSWORD': required_env('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'pt-br'

TIME_ZONE = 'America/Sao_Paulo'

USE_I18N = True

USE_TZ = True


STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}

# Em produção o Django também entrega o frontend já compilado (pasta frontend/dist),
# assim tudo fica no mesmo endereço e o cookie de sessão funciona sem CORS.
FRONTEND_DIST = BASE_DIR.parent / 'frontend' / 'dist'
if FRONTEND_DIST.exists():
    WHITENOISE_ROOT = FRONTEND_DIST
    WHITENOISE_INDEX_FILE = True


def whitenoise_immutable_file(path, url):
    # Os arquivos que o Vite gera em /assets/ têm um código no nome que muda a cada
    # versão, então o navegador pode guardá-los em cache por tempo indeterminado.
    return re.match(r'^/assets/.+-[A-Za-z0-9_-]{8,}\.\w+$', url) is not None


WHITENOISE_IMMUTABLE_FILE_TEST = whitenoise_immutable_file
WHITENOISE_MIMETYPES = {'.csv': 'text/csv'}


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # Limita tentativas de login para dificultar ataques de força bruta.
        'login': '10/min',
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# A sessão expira após 8 horas, para que um computador esquecido aberto não
# deixe as finanças da igreja expostas indefinidamente.
SESSION_COOKIE_AGE = 60 * 60 * 8


CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')
CORS_ALLOW_CREDENTIALS = True


# Proteções que só fazem sentido com HTTPS, ativadas fora do modo de desenvolvimento.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = os.environ.get('DJANGO_SECURE_SSL_REDIRECT', 'True') == 'True'
    # A checagem de saúde do serviço de hospedagem chega por HTTP interno, sem redirecionar.
    SECURE_REDIRECT_EXEMPT = [r'^api/health/$']
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
