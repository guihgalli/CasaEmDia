import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

const isProd = process.env.NODE_ENV === "production";

export function erroHandler(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    const msg = err.errors.map((e) => e.message).join("; ") || "Dados inválidos";
    res.status(400).json({ erro: msg });
    return;
  }
  const status = err.statusCode ?? 500;
  const message = isProd && status === 500
    ? "Erro interno do servidor"
    : (err.message || "Erro interno do servidor");
  if (!isProd || status !== 500) {
    console.error(err);
  } else {
    console.error("[500]", err.message);
  }
  res.status(status).json({ erro: message });
}
