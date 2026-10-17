from django.db.models import ProtectedError
from rest_framework import status, viewsets
from rest_framework.response import Response

from accounts.permissions import IsAdministrator

from .filters import TransactionFilterSerializer
from .models import Category, Kind, Transaction
from .serializers import CategorySerializer, TransactionSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAdministrator]
    # São poucas categorias, então a lista vem completa para preencher os campos de seleção.
    pagination_class = None

    def get_queryset(self):
        queryset = Category.objects.all()
        kind = self.request.query_params.get('kind')
        if kind in Kind.values:
            queryset = queryset.filter(kind=kind)
        if self.request.query_params.get('active') == 'true':
            queryset = queryset.filter(is_active=True)
        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'Esta categoria já possui lançamentos e não pode ser excluída. Desative-a em vez de excluir.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class TransactionViewSet(viewsets.ModelViewSet):
    # Lançamentos individuais podem identificar quem deu dízimo ou oferta, por isso
    # só administradores os acessam. Os membros veem apenas totais agregados.
    serializer_class = TransactionSerializer
    permission_classes = [IsAdministrator]

    def get_queryset(self):
        queryset = Transaction.objects.select_related('category', 'created_by')
        if self.action != 'list':
            return queryset
        filters = TransactionFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        return filters.apply(queryset)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
