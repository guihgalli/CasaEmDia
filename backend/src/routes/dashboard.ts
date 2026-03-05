import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, loadCasaId, requireCasa, type RequestWithAuth } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(loadCasaId);
router.use(requireCasa);

// GET /api/dashboard?mes=3&ano=2025
router.get("/", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);

    // Receitas ativas (todas as cadastradas e ativas entram no total do mês)
    const receitas = await prisma.receita.aggregate({
      where: { casaId, ativo: true },
      _sum: { valor: true },
    });
    const totalReceitas = Number(receitas._sum.valor ?? 0);

    // Despesas fixas ativas e recorrentes
    const despesasFixas = await prisma.despesaFixa.aggregate({
      where: { casaId, ativo: true, recorrente: true },
      _sum: { valor: true },
    });
    const totalDespesasFixas = Number(despesasFixas._sum.valor ?? 0);

    // Despesas extras no mês
    const despesasExtras = await prisma.despesaExtra.aggregate({
      where: {
        casaId,
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
