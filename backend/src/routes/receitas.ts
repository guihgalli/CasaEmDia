import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

const criarSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  valor: z.number().positive("Valor deve ser positivo"),
  recorrente: z.boolean().default(true),
});

const atualizarSchema = criarSchema.partial();

// Listar receitas do usuário
router.get("/", async (req, res, next) => {
  try {
    const usuarioId = (req as unknown as { usuarioId: string }).usuarioId;
    const receitas = await prisma.receita.findMany({
      where: { usuarioId },
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
    const usuarioId = (req as unknown as { usuarioId: string }).usuarioId;
    const body = criarSchema.parse(req.body);
    const receita = await prisma.receita.create({
      data: {
        usuarioId,
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
    const usuarioId = (req as unknown as { usuarioId: string }).usuarioId;
    const id = req.params.id;
    const body = atualizarSchema.parse(req.body);
    const receita = await prisma.receita.findFirst({
      where: { id, usuarioId },
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
    const usuarioId = (req as unknown as { usuarioId: string }).usuarioId;
    const id = req.params.id;
    const receita = await prisma.receita.findFirst({
      where: { id, usuarioId },
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
