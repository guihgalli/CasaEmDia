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
  recorrente: z.boolean().default(true),
});

const atualizarSchema = criarSchema.partial();

// Listar receitas da casa
router.get("/", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const receitas = await prisma.receita.findMany({
      where: { casaId },
      orderBy: { nome: "asc" },
    });
    res.json(receitas.map((r) => ({ ...r, valor: Number(r.valor) })));
  } catch (e) {
    next(e);
  }
});

// Criar receita
router.post("/", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const body = criarSchema.parse(req.body);
    const receita = await prisma.receita.create({
      data: {
        casaId,
        nome: body.nome,
        valor: body.valor,
        recorrente: body.recorrente,
      },
    });
    res.status(201).json({ ...receita, valor: Number(receita.valor) });
  } catch (e) {
    next(e);
  }
});

// Atualizar receita
router.patch("/:id", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const id = req.params.id;
    const body = atualizarSchema.parse(req.body);
    const receita = await prisma.receita.findFirst({
      where: { id, casaId },
    });
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada" });
    const atualizada = await prisma.receita.update({
      where: { id },
      data: body,
    });
    res.json({ ...atualizada, valor: Number(atualizada.valor) });
  } catch (e) {
    next(e);
  }
});

// Remover receita (soft: desativar)
router.delete("/:id", async (req, res, next) => {
  try {
    const casaId = (req as RequestWithAuth).casaId!;
    const id = req.params.id;
    const receita = await prisma.receita.findFirst({
      where: { id, casaId },
    });
    if (!receita) return res.status(404).json({ erro: "Receita não encontrada" });
    await prisma.receita.update({
      where: { id },
      data: { ativo: false },
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export const receitasRouter = router;
