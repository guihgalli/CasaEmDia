import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contextos/AuthContext";

interface MesRelatorio {
  mes: number;
  ano: number;
  total: number;
  porCategoria: Record<string, number>;
}

interface RespostaRelatorio {
  ano: number;
  meses: MesRelatorio[];
}

const MESES_NOME_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export default function Relatorios() {
  const { fetchApi } = useAuth();
  const [dados, setDados] = useState<RespostaRelatorio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [janelaMeses, setJanelaMeses] = useState(6);

  useEffect(() => {
    let cancel = false;
    setCarregando(true);
    setErro("");
    fetchApi(`/api/relatorios/despesas-extras-mensal?meses=${janelaMeses}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancel) setDados(data);
      })
      .catch((e) => {
        if (!cancel) setErro(e instanceof Error ? e.message : "Erro ao carregar relatórios");
      })
      .finally(() => {
        if (!cancel) setCarregando(false);
      });
    return () => {
      cancel = true;
    };
  }, [fetchApi, janelaMeses]);

  const resumo = useMemo(() => {
    if (!dados || dados.meses.length === 0) return null;
    const meses = dados.meses;
    const atual = meses[meses.length - 1];
    const anterior = meses.length > 1 ? meses[meses.length - 2] : null;

    const diferencaTotal = anterior ? atual.total - anterior.total : 0;
    const direcao = !anterior || diferencaTotal === 0 ? "igual" : diferencaTotal > 0 ? "mais" : "menos";

    let categoriasComparadas: { categoria: string; atual: number; anterior: number; delta: number }[] = [];
    if (anterior) {
      const todasCategorias = new Set([
        ...Object.keys(atual.porCategoria),
        ...Object.keys(anterior.porCategoria),
      ]);
      categoriasComparadas = Array.from(todasCategorias).map((cat) => {
        const atualValor = atual.porCategoria[cat] ?? 0;
        const anteriorValor = anterior.porCategoria[cat] ?? 0;
        return {
          categoria: cat,
          atual: atualValor,
          anterior: anteriorValor,
          delta: atualValor - anteriorValor,
        };
      });
      categoriasComparadas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      categoriasComparadas = categoriasComparadas.slice(0, 3);
    }

    return { atual, anterior, diferencaTotal, direcao, categoriasComparadas };
  }, [dados]);

  const fatiasPizza = useMemo(() => {
    if (!dados || dados.meses.length === 0) return null;
    const atual = dados.meses[dados.meses.length - 1];
    const categorias = Object.entries(atual.porCategoria);
    const total = categorias.reduce((s, [, v]) => s + v, 0);
    if (total <= 0) return null;

    // Gera fatias como [categoria, inicio, fim, cor]
    const cores = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#e11d48", "#0ea5e9", "#84cc16"];
    let acumulado = 0;
    const fatias = categorias.map(([categoria, valor], idx) => {
      const proporcao = valor / total;
      const inicio = acumulado;
      const fim = acumulado + proporcao;
      acumulado = fim;
      const cor = cores[idx % cores.length];
      return { categoria, inicio, fim, cor, valor, proporcao };
    });
    return { atual, total, fatias };
  }, [dados]);

  const barras = useMemo(() => {
    if (!dados) return null;
    const max = Math.max(...dados.meses.map((m) => m.total), 0);
    return { meses: dados.meses, max };
  }, [dados]);

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Relatórios e gráficos</h2>
        <select
          value={janelaMeses}
          onChange={(e) => setJanelaMeses(Number(e.target.value))}
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
        </select>
      </div>

      {erro && <div className="card alert alert-error">{erro}</div>}

      {carregando || !dados ? (
        <div className="card">Carregando...</div>
      ) : (
        <>
          {/* Comparação mês atual vs anteriores */}
          {resumo && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Comparação com o mês anterior
              </h3>
              <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                Mês atual:{" "}
                <strong>
                  {MESES_NOME_CURTO[resumo.atual.mes - 1]} / {resumo.atual.ano}
                </strong>{" "}
                · Total em despesas extras:{" "}
                <span className="saldo-negativo">
                  {formatarMoeda(resumo.atual.total)}
                </span>
              </p>
              {resumo.anterior ? (
                <>
                  <p className="muted" style={{ fontSize: "0.9rem" }}>
                    Mês anterior:{" "}
                    <strong>
                      {MESES_NOME_CURTO[resumo.anterior.mes - 1]} / {resumo.anterior.ano}
                    </strong>{" "}
                    · Total:{" "}
                    <span className="saldo-negativo">
                      {formatarMoeda(resumo.anterior.total)}
                    </span>
                  </p>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                    Você gastou{" "}
                    <strong>
                      {resumo.direcao === "igual"
                        ? "o mesmo que no mês anterior"
                        : `${formatarMoeda(Math.abs(resumo.diferencaTotal))} ${resumo.direcao} que no mês anterior`}
                    </strong>
                    .
                  </p>
                  {resumo.categoriasComparadas.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                        Em quê mudou mais?
                      </p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {resumo.categoriasComparadas.map((c) => (
                          <li key={c.categoria} style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                            <strong>{c.categoria}</strong>: {formatarMoeda(c.atual)} (antes{" "}
                            {formatarMoeda(c.anterior)}) ·{" "}
                            <span
                              className={c.delta >= 0 ? "saldo-negativo" : "saldo-positivo"}
                            >
                              {c.delta >= 0 ? "+" : "-"}
                              {formatarMoeda(Math.abs(c.delta))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Ainda não há dados suficientes para comparar com o mês anterior.
                </p>
              )}
            </div>
          )}

          {/* Gráfico de pizza por categoria (mês atual) */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Despesas extras por categoria (mês atual)
            </h3>
            {!fatiasPizza ? (
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Não há despesas extras no mês atual para montar o gráfico.
              </p>
            ) : (
              <div
                className="inline-row"
                style={{ alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}
              >
                <div
                  style={{
                    width: "160px",
                    height: "160px",
                    borderRadius: "50%",
                    backgroundImage: (() => {
                      // Monta conic-gradient com as fatias
                      const partes: string[] = [];
                      fatiasPizza.fatias.forEach((f) => {
                        const inicio = f.inicio * 360;
                        const fim = f.fim * 360;
                        partes.push(`${f.cor} ${inicio}deg ${fim}deg`);
                      });
                      return `conic-gradient(${partes.join(", ")})`;
                    })(),
                    boxShadow: "0 0 0 6px #f9fafb",
                  }}
                  aria-label="Gráfico de pizza de despesas por categoria"
                />
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                    Total no mês:{" "}
                    <span className="saldo-negativo">
                      {formatarMoeda(fatiasPizza.total)}
                    </span>
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {fatiasPizza.fatias.map((f) => (
                      <li
                        key={f.categoria}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.85rem",
                          marginBottom: "0.3rem",
                        }}
                      >
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "999px",
                            backgroundColor: f.cor,
                            marginRight: "0.4rem",
                          }}
                        />
                        <span style={{ flex: 1 }}>
                          {f.categoria} ({(f.proporcao * 100).toFixed(1)}%)
                        </span>
                        <span className="saldo-negativo">
                          {formatarMoeda(f.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico de barras por mês */}
          <div className="card">
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Despesas extras por mês
            </h3>
            {!barras || barras.max <= 0 ? (
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Não há valores suficientes para montar o gráfico de barras.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "0.5rem",
                    height: "160px",
                    padding: "0.5rem 0",
                  }}
                >
                  {barras.meses.map((m) => {
                    const proporcao = m.total / barras.max;
                    const altura = Math.max(6, proporcao * 140);
                    const isAtual =
                      m === barras.meses[barras.meses.length - 1];
                    return (
                      <div
                        key={`${m.ano}-${m.mes}`}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          fontSize: "0.75rem",
                        }}
                      >
                        <div
                          title={`${MESES_NOME_CURTO[m.mes - 1]} / ${m.ano} - ${formatarMoeda(
                            m.total
                          )}`}
                          style={{
                            width: "100%",
                            maxWidth: "20px",
                            borderRadius: "999px",
                            background: isAtual
                              ? "linear-gradient(180deg,#ef4444,#b91c1c)"
                              : "linear-gradient(180deg,#60a5fa,#2563eb)",
                            height,
                            transition: "height 0.3s ease",
                          }}
                        />
                        <span style={{ marginTop: "0.25rem" }}>
                          {MESES_NOME_CURTO[m.mes - 1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  Barra em vermelho indica o mês atual.
                </p>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

