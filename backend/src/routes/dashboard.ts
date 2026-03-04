import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

// GET /api/dashboard?mes=3&ano=2025
router.get("/", async (req, res, next) => {
  try {
    const usuarioId = (req as unknown as { usuarioId: string }).usuarioId;
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);

    // Receitas ativas e recorrentes (contam no mês)
    const receitas = await prisma.receita.aggregate({
      where: { usuarioId, ativo: true, recorrente: true },
      _sum: { valor: true },
    });
    const totalReceitas = Number(receitas._sum.valor ?? 0);

    // Despesas fixas ativas e recorrentes
    const despesasFixas = await prisma.despesaFixa.aggregate({
      where: { usuarioId, ativo: true, recorrente: true },
      _sum: { valor: true },
    });
    const totalDespesasFixas = Number(despesasFixas._sum.valor ?? 0);

    // Despesas extras no mês
    const despesasExtras = await prisma.despesaExtra.aggregate({
      where: {
        usuarioId,
        data: { gte: inicio, lt: fim },
      },
      _sum: { valor: true },
    });
    const totalDespesasExtras = Number(despesasExtras._sum.valor ?? 0);

    const totalDespesas = totalDespesasFixas + totalDespesasExtras;
    const saldo = totalReceitas - totalDespesas;

    res.json({
      mes,
      ano,
      totalReceitas,
      totalDespesasFixas,
      totalDespesasExtras,
      totalDespesas,
      saldo,
      positivo: saldo >= 0,
    });
  } catch (e) {
    next(e);
  }
});

export const dashboardRouter = router;
