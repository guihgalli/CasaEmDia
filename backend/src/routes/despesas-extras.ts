import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, loadCasaId, requireCasa, type RequestWithAuth } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(loadCasaId);
router.use(requireCasa);

const criarSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
});

const atualizarSchema = criarSchema.partial();

// Listar despesas extras (com filtro opcional de mês/ano)
router.get("/", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const mes = req.query.mes ? Number(req.query.mes) : null;
    const ano = req.query.ano ? Number(req.query.ano) : null;

    const where: { casaId: string; data?: { gte: Date; lt: Date } } = { casaId };
    if (mes != null && ano != null) {
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 1);
      where.data = { gte: inicio, lt: fim };
    }

    const list = await prisma.despesaExtra.findMany({
      where,
      orderBy: { data: "desc" },
    });
    res.json(list.map((d) => ({ ...d, valor: Number(d.valor), data: d.data.toISOString().slice(0, 10) })));
  } catch (e) {
    next(e);
  }
});

// Criar despesa extra (manual ou a partir do QR Code)
router.post("/", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const body = criarSchema.parse(req.body);
    const data = new Date(body.data + "T12:00:00.000Z");
    const despesa = await prisma.despesaExtra.create({
      data: {
        casaId,
        nome: body.nome,
        valor: body.valor,
        data,
        categoria: body.categoria,
      },
    });
    res.status(201).json({
      ...despesa,
      valor: Number(despesa.valor),
      data: despesa.data.toISOString().slice(0, 10),
    });
  } catch (e) {
    next(e);
  }
});

// Atualizar despesa extra
router.patch("/:id", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const id = req.params.id;
    const body = atualizarSchema.parse(req.body);
    const existente = await prisma.despesaExtra.findFirst({
      where: { id, casaId },
    });
    if (!existente) return res.status(404).json({ erro: "Despesa extra não encontrada" });
    const data = body.data ? new Date(body.data + "T12:00:00.000Z") : undefined;
    const atualizada = await prisma.despesaExtra.update({
      where: { id },
      data: { ...body, data },
    });
    res.json({
      ...atualizada,
      valor: Number(atualizada.valor),
      data: atualizada.data.toISOString().slice(0, 10),
    });
  } catch (e) {
    next(e);
  }
});

// Remover despesa extra
router.delete("/:id", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const id = req.params.id;
    const existente = await prisma.despesaExtra.findFirst({
      where: { id, casaId },
    });
    if (!existente) return res.status(404).json({ erro: "Despesa extra não encontrada" });
    await prisma.despesaExtra.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export const despesasExtrasRouter = router;
