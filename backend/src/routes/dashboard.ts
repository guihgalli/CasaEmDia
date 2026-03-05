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
    const casaId = (req as unknown as RequestWithAuth).casaId!;
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);

    // Receitas:
    // - recorrentes: entram em todos os meses
    // - não recorrentes: entram apenas no mês de criação (competência)
    const receitasRecorrentes = await prisma.receita.aggregate({
      where: { casaId, ativo: true, recorrente: true },
      _sum: { valor: true },
    });
    const receitasNaoRecorrentes = await prisma.receita.aggregate({
      where: {
        casaId,
        ativo: true,
        recorrente: false,
        criadoEm: { gte: inicio, lt: fim },
      },
      _sum: { valor: true },
    });
    const totalReceitas =
      Number(receitasRecorrentes._sum.valor ?? 0) +
      Number(receitasNaoRecorrentes._sum.valor ?? 0);

    // Despesas fixas:
    // - recorrentes sem quantidadeParcelas: aparecem em todos os meses
    // - recorrentes com quantidadeParcelas: aparecem apenas nos primeiros N meses a partir de criadoEm
    const despesasFixasAtivas = await prisma.despesaFixa.findMany({
      where: { casaId, ativo: true, recorrente: true },
    });

    const totalDespesasFixas = despesasFixasAtivas.reduce((total, despesa) => {
      const criadoEm = despesa.criadoEm;
      const inicioAno = inicio.getFullYear();
      const inicioMes = inicio.getMonth(); // 0-11

      const criadoAno = criadoEm.getFullYear();
      const criadoMes = criadoEm.getMonth(); // 0-11

      const diffMeses = (inicioAno - criadoAno) * 12 + (inicioMes - criadoMes);

      const limiteParcelas = despesa.quantidadeParcelas ?? Infinity;

      if (diffMeses >= 0 && diffMeses < limiteParcelas) {
        return total + Number(despesa.valor);
      }

      return total;
    }, 0);

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
