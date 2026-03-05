import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, loadCasaId, requireCasa, type RequestWithAuth } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(loadCasaId);
router.use(requireCasa);

const relatorioExtrasSchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
  meses: z.coerce.number().int().min(1).max(24).optional(),
});

// GET /api/relatorios/despesas-extras-mensal?ano=2025&meses=6
// Retorna totais por mês (e por categoria dentro de cada mês) para montar gráficos
router.get("/despesas-extras-mensal", async (req, res, next) => {
  try {
    const casaId = (req as unknown as RequestWithAuth).casaId!;
    const params = relatorioExtrasSchema.parse(req.query);

    const agora = new Date();
    const anoBase = params.ano ?? agora.getFullYear();
    const mesesJanela = params.meses ?? 6;

    // Mês "atual" considerado no relatório (para rotulagem)
    const mesAtualIndex = agora.getMonth(); // 0-11
    const mesAtual = new Date(anoBase, mesAtualIndex, 1);

    // Período de busca no banco: do primeiro mês da janela até o primeiro dia
    // do mês seguinte ao mês atual (intervalo semiaberto [início, fim))
    const inicio = new Date(mesAtual);
    inicio.setMonth(mesAtual.getMonth() - (mesesJanela - 1));
    const fim = new Date(anoBase, mesAtualIndex + 1, 1);

    const despesas = await prisma.despesaExtra.findMany({
      where: {
        casaId,
        data: { gte: inicio, lt: fim },
      },
      orderBy: { data: "asc" },
    });

    // Monta estrutura de meses vazia
    const meses: {
      mes: number;
      ano: number;
      total: number;
      porCategoria: Record<string, number>;
    }[] = [];

    for (let i = 0; i < mesesJanela; i++) {
      const d = new Date(inicio);
      d.setMonth(inicio.getMonth() + i);
      meses.push({
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
        total: 0,
        porCategoria: {},
      });
    }

    for (const d of despesas) {
      const m = d.data.getMonth() + 1;
      const a = d.data.getFullYear();
      const idx = meses.findIndex((x) => x.mes === m && x.ano === a);
      if (idx === -1) continue;
      const valor = Number(d.valor);
      meses[idx].total += valor;
      meses[idx].porCategoria[d.categoria] = (meses[idx].porCategoria[d.categoria] ?? 0) + valor;
    }

    res.json({
      ano: anoBase,
      meses,
    });
  } catch (e) {
    next(e);
  }
});

export const relatoriosRouter = router;

