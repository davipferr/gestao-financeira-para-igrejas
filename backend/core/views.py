from django.conf import settings
from django.db import connection
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    connection.ensure_connection()
    return Response({'status': 'ok', 'database': connection.vendor})


def frontend(request):
    """
    Entrega a página do React para os endereços do frontend (ex.: /lancamentos).

    Quem decide o que mostrar em cada endereço é o React Router; o Django só
    precisa devolver o index.html. Os arquivos estáticos em si (JS, CSS, ícones)
    são servidos antes pelo WhiteNoise.
    """
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.exists():
        raise Http404('O frontend ainda não foi compilado. Rode "npm run build" na pasta frontend.')
    return FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')
