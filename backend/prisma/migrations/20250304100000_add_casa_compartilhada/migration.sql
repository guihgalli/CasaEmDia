-- CreateTable: casas (uma "casa" agrupa usuários que compartilham receitas/despesas)
CREATE TABLE "casas" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casas_pkey" PRIMARY KEY ("id")
);

-- Add casa_id to usuarios (nullable: usuário pode ainda não ter criado/entrado em uma casa)
ALTER TABLE "usuarios" ADD COLUMN "casa_id" TEXT;

-- Add casa_id to receitas, despesas_fixas, despesas_extras (nullable for backfill)
ALTER TABLE "receitas" ADD COLUMN "casa_id" TEXT;
ALTER TABLE "despesas_fixas" ADD COLUMN "casa_id" TEXT;
ALTER TABLE "despesas_extras" ADD COLUMN "casa_id" TEXT;

-- Backfill: para cada usuário que tem receitas ou despesas, criar uma Casa e associar
DO $$
DECLARE
  r RECORD;
  nova_casa_id TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT u.id AS usuario_id
    FROM usuarios u
    WHERE EXISTS (SELECT 1 FROM receitas r WHERE r.usuario_id = u.id)
       OR EXISTS (SELECT 1 FROM despesas_fixas d WHERE d.usuario_id = u.id)
       OR EXISTS (SELECT 1 FROM despesas_extras e WHERE e.usuario_id = u.id)
  LOOP
    INSERT INTO casas (id, nome, criado_em) VALUES (gen_random_uuid(), 'Minha Casa', NOW()) RETURNING id INTO nova_casa_id;
    UPDATE usuarios SET casa_id = nova_casa_id WHERE id = r.usuario_id;
    UPDATE receitas SET casa_id = nova_casa_id WHERE usuario_id = r.usuario_id;
    UPDATE despesas_fixas SET casa_id = nova_casa_id WHERE usuario_id = r.usuario_id;
    UPDATE despesas_extras SET casa_id = nova_casa_id WHERE usuario_id = r.usuario_id;
  END LOOP;
END $$;

-- Receitas: remover FK e coluna usuario_id, tornar casa_id NOT NULL e adicionar FK
ALTER TABLE "receitas" DROP CONSTRAINT IF EXISTS "receitas_usuario_id_fkey";
ALTER TABLE "receitas" DROP COLUMN "usuario_id";
ALTER TABLE "receitas" ALTER COLUMN "casa_id" SET NOT NULL;
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Despesas fixas: idem
ALTER TABLE "despesas_fixas" DROP CONSTRAINT IF EXISTS "despesas_fixas_usuario_id_fkey";
ALTER TABLE "despesas_fixas" DROP COLUMN "usuario_id";
ALTER TABLE "despesas_fixas" ALTER COLUMN "casa_id" SET NOT NULL;
ALTER TABLE "despesas_fixas" ADD CONSTRAINT "despesas_fixas_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Despesas extras: idem
ALTER TABLE "despesas_extras" DROP CONSTRAINT IF EXISTS "despesas_extras_usuario_id_fkey";
ALTER TABLE "despesas_extras" DROP COLUMN "usuario_id";
ALTER TABLE "despesas_extras" ALTER COLUMN "casa_id" SET NOT NULL;
ALTER TABLE "despesas_extras" ADD CONSTRAINT "despesas_extras_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK usuarios.casa_id -> casas
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_casa_id_fkey" FOREIGN KEY ("casa_id") REFERENCES "casas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
