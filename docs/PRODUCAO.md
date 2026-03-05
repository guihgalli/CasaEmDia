# Checklist de produção – Casa em Dia

Use este checklist antes de colocar o app no ar.

## Variáveis de ambiente (.env)

- [ ] `NODE_ENV=production`
- [ ] `POSTGRES_PASSWORD`: senha forte (mín. 16 caracteres)
- [ ] `JWT_SECRET`: string aleatória longa (mín. 16 caracteres)
- [ ] `JWT_REFRESH_SECRET`: outra string aleatória longa (mín. 16 caracteres)
- [ ] `FRONTEND_URL`: URL pública do frontend (ex.: `https://app.seudominio.com.br:8443` ou `http://app.seudominio.com.br:8080`), sem barra no final

Em produção o backend **não sobe** se `DATABASE_URL`, `JWT_SECRET` ou `JWT_REFRESH_SECRET` estiverem vazios ou com menos de 16 caracteres.

## Segurança

- [ ] **Security Group (EC2):** apenas portas 22 (SSH), 8080 (HTTP) e 8443 (HTTPS). Não exponha 3000 nem 5432. O app usa 8080/8443 para não conflitar com serviço em 80/443.
- [ ] **HTTPS:** use Nginx + Certbot (Let's Encrypt). Ver [DEPLOY-EC2.md](DEPLOY-EC2.md).
- [ ] **CORS:** `FRONTEND_URL` deve ser exatamente a origem do frontend (esquema + domínio + porta se não for 443).
- [ ] Arquivo `.env` **nunca** commitado (já está no `.gitignore`).

## Deploy com Nginx (recomendado)

- [ ] Use `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` (ou `--build` após alterações).
- [ ] As migrações do Prisma rodam **automaticamente** na subida do container do backend; não é preciso executar `prisma migrate` manualmente.
- [ ] Frontend acessível só em `127.0.0.1:8080`; Nginx no host escuta em 80/443 e faz proxy.
- [ ] Backend e PostgreSQL não expostos para a internet.

## Após o deploy

- [ ] Testar login e cadastro.
- [ ] Testar fluxo de escanear nota (QR) e salvar despesa.
- [ ] Conferir renovação do certificado: `sudo certbot renew --dry-run`.
- [ ] Definir backup do volume do PostgreSQL (snapshot EBS ou `pg_dump` agendado).

## Comportamento em produção

| Recurso            | Comportamento |
|--------------------|----------------|
| Erro 500           | Mensagem genérica "Erro interno do servidor"; detalhes só em log. |
| Rate limit global  | 200 requisições por IP a cada 15 min. |
| Rate limit auth    | 10 requisições por IP a cada 15 min em `/api/auth`. |
| Body JSON          | Limite de 256 KB. |
| Headers de segurança | Helmet ativo (CSP desabilitado para compatibilidade). |
