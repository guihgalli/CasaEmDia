import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type JwtPayload } from "../middlewares/auth.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-refresh";
const JWT_EXP = "7d";
const REFRESH_EXP = "30d";

const cadastroSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  nome: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string(),
});

const recuperarSchema = z.object({
  email: z.string().email(),
});

const redefinirSchema = z.object({
  token: z.string(),
  novaSenha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

function gerarTokens(payload: JwtPayload) {
  const access = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXP });
  const refresh = jwt.sign(
    { ...payload, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXP }
  );
  return { access, refresh };
}

// Cadastro
router.post("/cadastro", async (req, res, next) => {
  try {
    const body = cadastroSchema.parse(req.body);
    const existe = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (existe) {
      return res.status(400).json({ erro: "E-mail já cadastrado" });
    }
    const senhaHash = await bcrypt.hash(body.senha, 10);
    const usuario = await prisma.usuario.create({
      data: {
        email: body.email,
        senhaHash,
        nome: body.nome ?? null,
      },
    });
    const payload: JwtPayload = { usuarioId: usuario.id, email: usuario.email };
    const tokens = gerarTokens(payload);
    res.status(201).json({
      usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome },
      ...tokens,
    });
  } catch (e) {
    next(e);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({ where: { email: body.email } });
    if (!usuario || !(await bcrypt.compare(body.senha, usuario.senhaHash))) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos" });
    }
    const payload: JwtPayload = { usuarioId: usuario.id, email: usuario.email };
    const tokens = gerarTokens(payload);
    res.json({
      usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome },
      ...tokens,
    });
  } catch (e) {
    next(e);
  }
});

// Refresh token
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ erro: "Refresh token não informado" });
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload & { type?: string };
    if (decoded.type !== "refresh") {
      return res.status(401).json({ erro: "Token inválido" });
    }
    const payload: JwtPayload = { usuarioId: decoded.usuarioId, email: decoded.email };
    const tokens = gerarTokens(payload);
    res.json(tokens);
  } catch {
    res.status(401).json({ erro: "Refresh token inválido ou expirado" });
  }
});

// Recuperação de senha - solicitar (MVP: apenas simula envio)
router.post("/recuperar-senha", async (req, res, next) => {
  try {
    const { email } = recuperarSchema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (usuario) {
      const token = jwt.sign(
        { usuarioId: usuario.id, email: usuario.email },
        JWT_SECRET,
        { expiresIn: "1h" }
      );
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          tokenRecuperacao: token,
          tokenRecuperacaoExpira: new Date(Date.now() + 3600 * 1000),
        },
      });
      // TODO: enviar e-mail com link contendo token (fora do escopo MVP)
    }
    res.json({ mensagem: "Se o e-mail existir, você receberá instruções para redefinir a senha." });
  } catch (e) {
    next(e);
  }
});

// Redefinir senha com token
router.post("/redefinir-senha", async (req, res, next) => {
  try {
    const body = redefinirSchema.parse(req.body);
    const decoded = jwt.verify(body.token, JWT_SECRET) as { usuarioId: string };
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: decoded.usuarioId,
        tokenRecuperacao: body.token,
        tokenRecuperacaoExpira: { gt: new Date() },
      },
    });
    if (!usuario) {
      return res.status(400).json({ erro: "Link inválido ou expirado" });
    }
    const senhaHash = await bcrypt.hash(body.novaSenha, 10);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash,
        tokenRecuperacao: null,
        tokenRecuperacaoExpira: null,
      },
    });
    res.json({ mensagem: "Senha alterada com sucesso" });
  } catch (e) {
    next(e);
  }
});

// Perfil (protegido)
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const usuarioId = (req as unknown as { usuarioId: string }).usuarioId;
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, email: true, nome: true },
    });
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado" });
    res.json(usuario);
  } catch (e) {
    next(e);
  }
});

export const authRouter = router;
