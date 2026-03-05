import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export interface JwtPayload {
  usuarioId: string;
  email: string;
}

export type RequestWithAuth = Request & { usuarioId: string; casaId?: string | null };

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token não informado" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as RequestWithAuth).usuarioId = payload.usuarioId;
    next();
  } catch {
    res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

/** Carrega casaId do usuário no request. Deve ser usado após authMiddleware. */
export async function loadCasaId(req: Request, res: Response, next: NextFunction) {
  try {
    const usuarioId = (req as RequestWithAuth).usuarioId;
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { casaId: true },
    });
    (req as RequestWithAuth).casaId = usuario?.casaId ?? null;
    next();
  } catch (e) {
    next(e);
  }
}

/** Retorna 403 se o usuário não tiver casa. Usar após loadCasaId. */
export function requireCasa(req: Request, res: Response, next: NextFunction) {
  const casaId = (req as RequestWithAuth).casaId;
  if (!casaId) {
    res.status(403).json({ erro: "Crie ou entre em uma casa para acessar receitas e despesas." });
    return;
  }
  next();
}
