# Etapa 1: compila o frontend (React) e gera a pasta frontend/dist.
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Etapa 2: imagem final com o Django, que serve a API e o frontend compilado.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
# Gera versões comprimidas (.gz) do frontend, que o WhiteNoise entrega aos navegadores.
RUN python -m whitenoise.compress /app/frontend/dist

# O collectstatic só lê as configurações; os valores abaixo existem apenas para
# o Django carregar durante a construção da imagem e não são usados em execução.
RUN DJANGO_SECRET_KEY=somente-para-build DATABASE_URL=postgres://build:build@localhost/build \
    python manage.py collectstatic --no-input

# Garante fim de linha Unix no script, caso ele tenha vindo de um checkout no Windows.
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh && useradd --create-home sistema
USER sistema

EXPOSE 8000
CMD ["./start.sh"]
