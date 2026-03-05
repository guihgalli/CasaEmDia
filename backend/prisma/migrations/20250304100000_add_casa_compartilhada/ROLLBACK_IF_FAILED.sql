-- Use este script SOMENTE se a migração 20250304100000_add_casa_compartilhada
-- falhou (ex.: erro "record r is not assigned") e você precisa voltar o banco
-- ao estado anterior para rodar a migração corrigida de novo.
--
-- Passos (na raiz do projeto, com Docker):
--
-- 1. Marcar a migração como revertida (usa o backend para falar com o banco):
--    docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend npx prisma migrate resolve --rolled-back 20250304100000_add_casa_compartilhada
--
-- 2. Reverter o banco: executar os comandos SQL abaixo no Postgres.
--    Ex.: docker compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U casaemdia -d casaemdia
--    (Se postgres não estiver com porta exposta, use: docker compose run --rm backend sh -c "npx prisma db execute --stdin" < ROLLBACK_IF_FAILED.sql
--    ou copie e cole apenas os 5 comandos ALTER/DROP no psql.)
--
-- 3. Subir de novo: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

-- Reverter estado parcial da migração (ordem: colunas que referenciam casas primeiro)
ALTER TABLE "receitas" DROP COLUMN IF EXISTS "casa_id";
ALTER TABLE "despesas_fixas" DROP COLUMN IF EXISTS "casa_id";
ALTER TABLE "despesas_extras" DROP COLUMN IF EXISTS "casa_id";
ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "casa_id";
DROP TABLE IF EXISTS "casas";
