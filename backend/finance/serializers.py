from rest_framework import serializers

from .models import Category, Kind, StatementImport, Transaction


class CategorySerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'kind', 'kind_display', 'is_active']

    def validate_name(self, value):
        return value.strip()

    def validate(self, attrs):
        # Mudar o tipo deixaria os lançamentos já classificados com o tipo errado.
        if self.instance is not None and 'kind' in attrs and attrs['kind'] != self.instance.kind:
            raise serializers.ValidationError({'kind': 'O tipo não pode ser alterado depois de criada a categoria.'})
        name = attrs.get('name', getattr(self.instance, 'name', None))
        kind = attrs.get('kind', getattr(self.instance, 'kind', None))
        duplicates = Category.objects.filter(name__iexact=name, kind=kind)
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError(
                {'name': f'Já existe uma categoria de {Kind(kind).label.lower()} com este nome.'}
            )
        return attrs


def display_name(user):
    return user.get_full_name() or user.get_username()


class TransactionSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    created_by_name = serializers.SerializerMethodField()
    imported = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'date', 'description', 'amount', 'kind', 'kind_display',
            'category', 'category_name', 'created_by_name', 'imported', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {
            'amount': {'error_messages': {'min_value': 'O valor deve ser maior que zero.'}},
        }

    def get_created_by_name(self, transaction):
        return display_name(transaction.created_by)

    def get_imported(self, transaction):
        return transaction.statement_import_id is not None

    def validate_description(self, value):
        return value.strip()

    def validate(self, attrs):
        kind = attrs.get('kind', getattr(self.instance, 'kind', None))
        category = attrs.get('category', getattr(self.instance, 'category', None))
        if category is not None and category.kind != kind:
            raise serializers.ValidationError({
                'category': (
                    f'A categoria "{category.name}" é de {category.get_kind_display().lower()}, '
                    f'mas o lançamento é um {Kind(kind).label.lower()}.'
                )
            })
        return attrs


class StatementUploadSerializer(serializers.Serializer):
    file = serializers.FileField(label='arquivo', error_messages={
        'required': 'Selecione o arquivo do extrato (.ofx ou .csv).',
        'empty': 'O arquivo enviado está vazio.',
    })


class StatementImportSerializer(serializers.ModelSerializer):
    imported_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StatementImport
        fields = [
            'id', 'file_name', 'file_format', 'imported_by_name', 'imported_at',
            'created_count', 'duplicate_count', 'ignored_count',
        ]

    def get_imported_by_name(self, statement_import):
        return display_name(statement_import.imported_by)
