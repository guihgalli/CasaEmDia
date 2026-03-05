import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, loadCasaId, requireCasa, type RequestWithAuth } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);
router.use(loadCasaId);
router.use(requireCasa);

const criarObjetivoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  valorMeta: z.number().positive("Valor da meta deve ser positivo"),
});

const criarAporteSchema = z.object({
  valor: z.number().positive("Valor do aporte deve ser positivo"),
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD")
    .optional(),
});

// Utilitário para diferença em meses (aproximado) entre duas datas
function diffMeses(inicio: Date, fim: Date) {
  const anos = fim.getFullYear() - inicio.getFullYear();
  const meses = fim.getMonth() - inicio.getMonth();
  const total = anos * 12 + meses;
  return total < 0 ? 0 : total;
}

// GET /api/objetivos - lista objetivos com totais e previsão
router.get("/", async (req, res, next) => {
  try {
    const casaId = (req as unknown as RequestWithAuth).casaId!;
    const objetivos = await prisma.objetivo.findMany({
      where: { casaId },
      orderBy: { criadoEm: "asc" },
      include: { aportes: true },
    });

    const agora = new Date();

    const resposta = objetivos.map((o) => {
      const totalAportado = o.aportes.reduce((soma, a) => soma + Number(a.valor), 0);
      const faltante = Math.max(0, Number(o.valorMeta) - totalAportado);
      const percentual = Number(o.valorMeta) > 0 ? (totalAportado / Number(o.valorMeta)) * 100 : 0;

      let previsao: string | null = null;
      if (faltante > 0 && o.aportes.length > 0) {
        const primeiraData = o.aportes.reduce(
          (min, a) => (a.data < min ? a.data : min),
          o.aportes[0].data
        );
        const mesesDecorridos = Math.max(1, diffMeses(primeiraData, agora) || 1);
        const aporteMedioMensal = totalAportado / mesesDecorridos;

        if (aporteMedioMensal > 0) {
          const mesesRestantes = faltante / aporteMedioMensal;
          const diasRestantes = Math.round(mesesRestantes * 30);
          const estimada = new Date(agora.getTime() + diasRestantes * 24 * 60 * 60 * 1000);
          previsao = estimada.toISOString().slice(0, 10);
        }
      }

      return {
        id: o.id,
        nome: o.nome,
        valorMeta: Number(o.valorMeta),
        concluido: o.concluido || faltante <= 0,
        totalAportado,
        faltante,
        percentual,
        previsao,
      };
    });

    res.json(resposta);
  } catch (e) {
    next(e);
  }
});

// POST /api/objetivos - criar novo objetivo
router.post("/", async (req, res, next) => {
  try {
    const casaId = (req as unknown as RequestWithAuth).casaId!;
    const body = criarObjetivoSchema.parse(req.body);

    const objetivo = await prisma.objetivo.create({
      data: {
        casaId,
        nome: body.nome,
        valorMeta: body.valorMeta,
      },
    });

    res.status(201).json({
      id: objetivo.id,
      nome: objetivo.nome,
      valorMeta: Number(objetivo.valorMeta),
      concluido: objetivo.concluido,
      totalAportado: 0,
      faltante: Number(objetivo.valorMeta),
      percentual: 0,
      previsao: null,
    });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/objetivos/:id - atualizar nome, valorMeta ou concluido
router.patch("/:id", async (req, res, next) => {
  try {
    const casaId = (req as unknown as RequestWithAuth).casaId!;
    const id = req.params.id;

    const schema = criarObjetivoSchema
      .extend({
        concluido: z.boolean().optional(),
      })
      .partial();

    const body = schema.parse(req.body);

    const existente = await prisma.objetivo.findFirst({
      where: { id, casaId },
    });
    if (!existente) {
      return res.status(404).json({ erro: "Objetivo não encontrado" });
    }

    const atualizado = await prisma.objetivo.update({
      where: { id },
      data: body,
    });

    res.json({
      id: atualizado.id,
      nome: atualizado.nome,
      valorMeta: Number(atualizado.valorMeta),
      concluido: atualizado.concluido,
    });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/objetivos/:id - remover objetivo (e aportes ligados)
router.delete("/:id", async (req, res, next) => {
  try {
    const casaId = (req as unknown as RequestWithAuth).casaId!;
    const id = req.params.id;

    const existente = await prisma.objetivo.findFirst({
      where: { id, casaId },
    });
    if (!existente) {
      return res.status(404).json({ erro: "Objetivo não encontrado" });
    }

    await prisma.aporteObjetivo.deleteMany({ where: { objetivoId: id } });
    await prisma.objetivo.delete({ where: { id } });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// POST /api/objetivos/:id/aportes - registrar aporte em um objetivo
router.post("/:id/aportes", async (req, res, next) => {
  try {
    const casaId = (req as unknown as RequestWithAuth).casaId!;
    const id = req.params.id;
    const body = criarAporteSchema.parse(req.body);

    const objetivo = await prisma.objetivo.findFirst({
      where: { id, casaId },
    });
    if (!objetivo) {
      return res.status(404).json({ erro: "Objetivo não encontrado" });
    }

    const data = body.data ? new Date(body.data + "T12:00:00.000Z") : new Date();

    const aporte = await prisma.aporteObjetivo.create({
      data: {
        objetivoId: id,
        valor: body.valor,
        data,
      },
    });

    res.status(201).json({
      id: aporte.id,
      objetivoId: aporte.objetivoId,
      valor: Number(aporte.valor),
      data: aporte.data.toISOString().slice(0, 10),
    });
  } catch (e) {
    next(e);
  }
});

export const objetivosRouter = router;

