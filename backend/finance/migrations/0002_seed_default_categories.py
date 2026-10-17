# Cadastra as categorias mais comuns nas finanças de uma igreja, para o sistema
# já começar pronto para uso. O contador pode editar ou desativar qualquer uma.

from django.db import migrations

DEFAULT_CATEGORIES = {
    'income': [
        'Dízimos',
        'Ofertas',
        'Doações',
        'Eventos',
        'Outros rendimentos',
    ],
    'expense': [
        'Água',
        'Energia elétrica',
        'Aluguel',
        'Manutenção',
        'Material de limpeza e consumo',
        'Ações sociais',
        'Tarifas bancárias',
        'Outros pagamentos',
    ],
}


def create_categories(apps, schema_editor):
    Category = apps.get_model('finance', 'Category')
    for kind, names in DEFAULT_CATEGORIES.items():
        for name in names:
            Category.objects.get_or_create(name=name, kind=kind)


def remove_categories(apps, schema_editor):
    Category = apps.get_model('finance', 'Category')
    for kind, names in DEFAULT_CATEGORIES.items():
        Category.objects.filter(kind=kind, name__in=names, transactions__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_categories, remove_categories),
    ]
