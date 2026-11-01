# Gestão Financeira para Igrejas

Sistema web para organizar as finanças de uma igreja: lançamentos de rendimentos e pagamentos, importação do extrato bancário, relatório de resultado (DRE) e prestação de contas para os membros.

Desenvolvido por **Davi Pinto Ferreira** na disciplina **Atividade Extensionista II: Tecnologia Aplicada à Inclusão Digital – Projeto**, do CST em Análise e Desenvolvimento de Sistemas (Uninter), e aplicado na **CENA – Comunidade Evangélica Novo Amanhecer**, em Monte Mor/SP.

**Objetivo de Desenvolvimento Sustentável:** ODS 16 – Paz, justiça e instituições eficazes, em especial a meta 16.6 (instituições eficazes, responsáveis e transparentes).

## Funcionalidades

| Perfil | O que pode fazer |
|---|---|
| **Administrador** (contador ou tesoureiro) | Cadastrar, editar e excluir lançamentos; organizar categorias; importar extratos OFX/CSV; ver a prestação de contas; consultar o registro de acessos |
| **Membro** | Ver a prestação de contas da igreja: totais do período, gráfico mês a mês e divisão por categoria |

- **Lançamentos** com filtros por período, tipo, categoria e busca na descrição.
- **Categorias** de rendimentos e pagamentos. O sistema já vem com as mais comuns de uma igreja, como dízimos, ofertas, água, energia e aluguel.
- **Importação de extrato** em OFX (formato dos bancos) ou CSV, sem duplicar lançamentos ao importar o mesmo arquivo de novo.
- **Prestação de contas (DRE)**: rendimentos, pagamentos e resultado (superávit ou déficit), com gráfico e tabelas.
- **Registro de acessos**: nome do usuário, data e horário de cada entrada no sistema. O registro não pode ser alterado.

Os membros veem só **totais**, nunca os lançamentos individuais, para não expor quem contribuiu com dízimos e ofertas.

## Acessibilidade: os 7 princípios do Desenho Universal

| Princípio | Como o sistema atende |
|---|---|
| 1. Uso igualitário | Mesma interface para todos, funcionando no computador e no celular. Navegação completa pelo teclado e compatível com leitores de tela (rótulos, títulos e regiões identificadas) |
| 2. Uso flexível | Botões para **aumentar o texto** (até 150%) e ativar o **alto contraste**. As escolhas ficam salvas no aparelho |
| 3. Uso simples e intuitivo | Linguagem simples ("Entrou mais do que saiu"), datas e valores no padrão brasileiro e um menu que mostra só o que cada perfil usa |
| 4. Informação de fácil percepção | Valores com sinal (+/−) além da cor, resultado escrito em palavras, gráfico acompanhado de tabela com os mesmos números e contraste de cores conforme a WCAG |
| 5. Tolerância ao erro | Confirmação antes de excluir (com o foco começando em "Cancelar"), mensagens de erro claras em cada campo e importação "tudo ou nada" |
| 6. Baixo esforço físico | Botões e campos com no mínimo 44 px, atalho "Pular para o conteúdo" e filtros que evitam rolar listas longas |
| 7. Dimensão e espaço para uso | Layout que se adapta à tela do celular sem rolagem lateral, com espaço adequado entre os elementos clicáveis |

## Requisitos

**Funcionais**
1. Login com perfis Administrador e Membro.
2. Cadastro de categorias de rendimentos e pagamentos.
3. Cadastro, edição e exclusão de lançamentos.
4. Importação de extrato bancário OFX/CSV, ignorando duplicados.
5. Classificação dos lançamentos importados.
6. Relatório DRE por período, com gráficos.
7. Prestação de contas para os membros.
8. Registro de acessos (usuário, data e horário).

**Não funcionais**
- **Precisão:** valores em `Decimal`, nunca em ponto flutuante (R$ 0,10 + R$ 0,20 = R$ 0,30 exatos).
- **Segurança e confidencialidade:** sessão em cookie que o JavaScript não lê, proteção CSRF, limite de 10 tentativas de login por minuto, sessão que expira em 8 horas e HTTPS em produção.
- **Privacidade (LGPD):** o registro de acessos guarda só usuário, data e horário, e os membros não veem dados individuais.
- **Desempenho:** listas paginadas e gráfico carregado só quando a página do relatório é aberta.
- **Usabilidade e acessibilidade:** ver a seção acima.
- **Testabilidade:** testes automatizados no backend e no frontend.

## Tecnologias

- **Backend:** Python 3.12, Django 6, Django REST Framework, PostgreSQL.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts.
- **Testes:** testes do Django (backend), Vitest e Testing Library (frontend).
- **Produção:** Docker, Gunicorn e WhiteNoise.

## Estrutura

```
backend/
  config/     Configurações do Django
  core/       Rota de saúde e entrega do frontend em produção
  accounts/   Login, perfis e registro de acessos
  finance/    Categorias, lançamentos, importação de extrato e DRE
frontend/
  src/pages/       Telas do sistema
  src/components/  Componentes reutilizáveis
  src/lib/         Comunicação com a API, formatação e acessibilidade
Dockerfile    Imagem de produção (compila o frontend e roda o Django)
render.yaml   Configuração do deploy no Render
```

## Como rodar localmente

**Pré-requisitos:** Python 3.12+, Node.js 22+ e PostgreSQL.

### 1. Banco de dados

Crie um usuário e um banco no PostgreSQL. O primeiro comando pede a senha do novo usuário:

```bash
createuser -U postgres -d -P gestao_financeira
```

```bash
createdb -U postgres -O gestao_financeira gestao_financeira
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env
```

Preencha `DJANGO_SECRET_KEY` e `DB_PASSWORD` no arquivo `.env`. Depois crie as tabelas e o primeiro administrador:

```bash
.venv/Scripts/python manage.py migrate
.venv/Scripts/python manage.py createsuperuser
.venv/Scripts/python manage.py runserver
```

No Linux ou no macOS, use `.venv/bin/python` no lugar de `.venv/Scripts/python`.

### 3. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173**. O Vite repassa as chamadas `/api` para o Django.

### 4. Usuários

O superusuário criado no passo 2 já é **Administrador**. Os demais usuários são cadastrados pelo painel do Django em **/admin** (Usuários → Adicionar) e começam como **Membro**. Para trocar o perfil, edite o usuário e altere o campo **Perfil**.

## Testes

```bash
cd backend && .venv/Scripts/python manage.py test
```

```bash
cd frontend && npm test
```

## Formato do extrato

- **OFX:** é o formato que os bancos exportam (às vezes com o nome "Money"). É o recomendado.
- **CSV:** colunas `data`, `descrição` e `valor`, separadas por `;` ou `,`. Datas em `dd/mm/aaaa` e valores como `1.234,56`. Valores negativos são pagamentos. A tela de importação oferece um modelo para baixar.

## Deploy (Render + Neon)

O sistema roda como **um único serviço**: a imagem Docker compila o React e o Django entrega a API e as telas no mesmo endereço.

1. Crie um banco PostgreSQL gratuito no [Neon](https://neon.tech) e copie a *connection string*.
2. No [Render](https://render.com), crie um **Blueprint** apontando para este repositório. Ele lê o `render.yaml`.
3. Preencha as variáveis pedidas:
   - `DATABASE_URL`: a connection string do Neon;
   - `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL` e `DJANGO_SUPERUSER_PASSWORD`: o primeiro administrador, criado na primeira inicialização.
4. O `DJANGO_SECRET_KEY` é gerado pelo próprio Render.

A cada inicialização o sistema aplica as migrações automaticamente. A rota `/api/health/` é usada pelo Render para saber se o serviço está no ar.

O `manage.py check --deploy` passa sem erros. Restam dois avisos, sobre HSTS em subdomínios e na lista de pré-carregamento dos navegadores, que ficam desligados de propósito: num endereço `*.onrender.com` os subdomínios não pertencem ao projeto.

No plano gratuito do Render o serviço "dorme" após alguns minutos sem uso, e o primeiro acesso depois disso pode levar cerca de um minuto.

## Comprovação de uso

O registro de acessos (menu **Acessos**, visível para Administradores) mostra o nome de quem entrou no sistema, a data e o horário de cada acesso.
