import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { receitasRouter } from "./routes/receitas.js";
import { despesasFixasRouter } from "./routes/despesas-fixas.js";
import { despesasExtrasRouter } from "./routes/despesas-extras.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { casaRouter } from "./routes/casa.js";
import { objetivosRouter } from "./routes/objetivos.js";
import { relatoriosRouter } from "./routes/relatorios.js";
import { erroHandler } from "./middlewares/erro.js";

const app = express();
const PORT = process.env.PORT ?? 3000;
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const required = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET", "FRONTEND_URL"];
  const secretKeys = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
  const missing = required.filter((k) => !process.env[k]);
  const weakSecrets = secretKeys.filter((k) => (process.env[k]?.length ?? 0) < 16);
  if (missing.length || weakSecrets.length) {
    const msg = [
      missing.length && "defina: " + missing.join(", "),
      weakSecrets.length && "secrets com mínimo 16 caracteres: " + weakSecrets.join(", "),
    ].filter(Boolean).join("; ");
    console.error("[FATAL] Em produção: " + msg);
    process.exit(1);
  }
}

// Trust proxy quando atrás de Nginx/load balancer (EC2)
if (isProd) {
  app.set("trust proxy", 1);
}

// Segurança: headers HTTP
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: em produção só aceita FRONTEND_URL; em dev aceita qualquer origem
const corsOrigin = process.env.FRONTEND_URL || (isProd ? undefined : "*");
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limit global (evitar abuso)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: isProd ? 200 : 1000,
    message: { erro: "Muitas requisições. Tente novamente em alguns minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: "256kb" }));

// Health check (sem rate limit agressivo)
app.get("/health", (_req, res) => res.json({ ok: true }));

// Rate limit mais restritivo para auth (login/cadastro/recuperação)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 50,
  message: { erro: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// Rotas da API
app.use("/api/auth", authRouter);
app.use("/api/receitas", receitasRouter);
app.use("/api/despesas-fixas", despesasFixasRouter);
app.use("/api/despesas-extras", despesasExtrasRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/casa", casaRouter);
app.use("/api/objetivos", objetivosRouter);
app.use("/api/relatorios", relatoriosRouter);

app.use(erroHandler);

app.listen(PORT, () => {
  if (!isProd) {
    console.log(`Casa em Dia API em http://localhost:${PORT}`);
  }
});
