# Casa em Dia

Aplicativo de organização financeira familiar: receitas, despesas e registro rápido via QR Code de nota fiscal.

**Repositório:** [github.com/guihgalli/CasaEmDia](https://github.com/guihgalli/CasaEmDia)

**Preparado para produção:** Helmet, rate limit, CORS restrito, variáveis obrigatórias, tratamento de erros sem vazamento de detalhes. Ver [docs/PRODUCAO.md](docs/PRODUCAO.md) e [docs/DEPLOY-EC2.md](docs/DEPLOY-EC2.md).

## Stack

- **Frontend:** React (Vite) + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Banco:** PostgreSQL (schema em português)
- **Deploy:** Docker Compose (Linux / EC2 AWS). **A aplicação é executada em Docker**; as migrações do Prisma rodam automaticamente na subida do container do backend.

## Execução local (desenvolvimento)

```bash
# Backend
cd backend && npm install && npm run dev

# Banco (ou use Docker apenas do Postgres)
docker run -d -p 5432:5432 -e POSTGRES_USER=casaemdia -e POSTGRES_PASSWORD=casaemdia -e POSTGRES_DB=casaemdia postgres:16-alpine

# Frontend
cd frontend && npm install && npm run dev
```

## Produção (Docker – Linux / EC2)

A aplicação roda em **Docker**. Ao subir os containers, o backend executa `prisma migrate deploy` na inicialização, então novas migrações são aplicadas automaticamente ao fazer `docker compose up -d --build` (ou equivalente).

Se uma migração falhar (ex.: P3018), marque como revertida, reverta o banco e suba de novo. Exemplo para a migração `20250304100000_add_casa_compartilhada`: `npx prisma migrate resolve --rolled-back 20250304100000_add_casa_compartilhada`, execute o SQL em `backend/prisma/migrations/20250304100000_add_casa_compartilhada/ROLLBACK_IF_FAILED.sql` no Postgres (ex.: `docker compose exec postgres psql -U casaemdia -d casaemdia` e colar os comandos), depois `docker compose up -d --build`.

Para deploy com **Nginx e HTTPS** no EC2, use o guia completo:

- **[Deploy no EC2 com Nginx e HTTPS](docs/DEPLOY-EC2.md)**

Resumo rápido (sem Nginx no host):

```bash
cp .env.example .env
# Edite .env com senhas e URLs reais
docker-compose up -d
```

Com Nginx no host (recomendado em produção):

```bash
cp .env.example .env
# Configure .env (POSTGRES_PASSWORD, JWT_SECRET, FRONTEND_URL=https://seu-dominio.com.br:8443)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# Depois configure Nginx (portas 8080/8443) e Certbot conforme docs/DEPLOY-EC2.md
```

- Sem override: API na porta 3000, **Web na 8080** (evita conflito com serviço em 80/443).  
- Com `docker-compose.prod.yml`: frontend em localhost:8080; Nginx no host usa **8080** (HTTP) e **8443** (HTTPS).

## Funcionalidades v1

- Cadastro, login e recuperação de senha
- **Casa compartilhada:** criar uma “casa” e adicionar outros usuários (mesmo login) para compartilhar receitas e despesas
- Receitas (nome, valor, recorrente)
- Despesas fixas (nome, valor, vencimento, recorrente)
- Despesas extras (manual e via QR Code de nota fiscal)
- Dashboard com totais e saldo do mês
- Navegação por mês (competência)

## Licença

Uso interno / projeto pessoal.
