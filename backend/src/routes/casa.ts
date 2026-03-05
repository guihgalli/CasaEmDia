import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, loadCasaId, requireCasa, type RequestWithAuth } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(loadCasaId);

const criarCasaSchema = z.object({
  nome: z.string().optional(),
});

const adicionarMembroSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  nome: z.string().optional(),
});

// GET /api/casa - dados da casa do usuário e lista de membros
router.get("/", async (req, res, next) => {
  try {
    const { casaId } = req as unknown as RequestWithAuth;
    if (!casaId) {
      return res.json({ casa: null, membros: [] });
    }
    const casa = await prisma.casa.findUnique({
      where: { id: casaId },
      select: { id: true, nome: true, criadoEm: true },
    });
    if (!casa) {
      return res.json({ casa: null, membros: [] });
    }
    const membros = await prisma.usuario.findMany({
      where: { casaId },
      select: { id: true, email: true, nome: true },
    });
    res.json({
      casa: { ...casa, criadoEm: casa.criadoEm.toISOString() },
      membros,
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/casa - criar casa (se o usuário ainda não tiver)
router.post("/", async (req, res, next) => {
  try {
    const { usuarioId, casaId } = req as unknown as RequestWithAuth;
    if (casaId) {
      return res.status(400).json({ erro: "Você já pertence a uma casa." });
    }
    const body = criarCasaSchema.parse(req.body);
    const casa = await prisma.casa.create({
      data: { nome: body.nome ?? "Minha Casa" },
    });
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { casaId: casa.id },
    });
    res.status(201).json({
      casa: { id: casa.id, nome: casa.nome, criadoEm: casa.criadoEm.toISOString() },
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/casa/membros - adicionar novo usuário à mesma casa (criar conta com acesso compartilhado)
router.post("/membros", requireCasa, async (req, res, next) => {
  try {
    const { casaId } = req as unknown as RequestWithAuth;
    const body = adicionarMembroSchema.parse(req.body);

    const existe = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (existe) {
      return res.status(400).json({ erro: "Já existe um usuário com este e-mail." });
    }

    const senhaHash = await bcrypt.hash(body.senha, 10);
    const usuario = await prisma.usuario.create({
      data: {
        email: body.email,
        senhaHash,
        nome: body.nome ?? null,
        casaId: casaId!,
      },
    });

    res.status(201).json({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      mensagem: "Usuário criado e adicionado à casa. Ele já pode fazer login e ver as mesmas receitas e despesas.",
    });
  } catch (e) {
    next(e);
  }
});

export const casaRouter = router;
