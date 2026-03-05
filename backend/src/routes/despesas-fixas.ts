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
  diaVencimento: z.number().int().min(1).max(31),
  recorrente: z.boolean().default(true),
});

const atualizarSchema = criarSchema.partial();

// Listar despesas fixas da casa
router.get("/", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const list = await prisma.despesaFixa.findMany({
      where: { casaId },
      orderBy: { diaVencimento: "asc" },
    });
    res.json(list.map((d) => ({ ...d, valor: Number(d.valor) })));
  } catch (e) {
    next(e);
  }
});

// Criar despesa fixa
router.post("/", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const body = criarSchema.parse(req.body);
    const despesa = await prisma.despesaFixa.create({
      data: {
        casaId,
        nome: body.nome,
        valor: body.valor,
        diaVencimento: body.diaVencimento,
        recorrente: body.recorrente,
      },
    });
    res.status(201).json({ ...despesa, valor: Number(despesa.valor) });
  } catch (e) {
    next(e);
  }
});

// Atualizar despesa fixa
router.patch("/:id", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const id = req.params.id;
    const body = atualizarSchema.parse(req.body);
    const existente = await prisma.despesaFixa.findFirst({
      where: { id, casaId },
    });
    if (!existente) return res.status(404).json({ erro: "Despesa fixa não encontrada" });
    const atualizada = await prisma.despesaFixa.update({
      where: { id },
      data: body,
    });
    res.json({ ...atualizada, valor: Number(atualizada.valor) });
  } catch (e) {
    next(e);
  }
});

// Remover (soft: desativar)
router.delete("/:id", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const id = req.params.id;
    const existente = await prisma.despesaFixa.findFirst({
      where: { id, casaId },
    });
    if (!existente) return res.status(404).json({ erro: "Despesa fixa não encontrada" });
    await prisma.despesaFixa.update({
      where: { id },
      data: { ativo: false },
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export const despesasFixasRouter = router;
