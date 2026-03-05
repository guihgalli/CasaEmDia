import { useState, useEffect } from "react";
import { useAuth } from "../contextos/AuthContext";

interface Objetivo {
  id: string;
  nome: string;
  valorMeta: number;
  concluido: boolean;
  totalAportado: number;
  faltante: number;
  percentual: number;
  previsao: string | null;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarData(s: string | null) {
  if (!s) return "—";
  const [a, m, d] = s.split("-");
  return `${d}/${m}/${a}`;
}

export default function Objetivos() {
  const { fetchApi } = useAuth();
  const [lista, setLista] = useState<Objetivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valorMeta, setValorMeta] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [aporteValor, setAporteValor] = useState<Record<string, string>>({});
  const [aporteErro, setAporteErro] = useState<Record<string, string>>({});
  const [aporteCarregando, setAporteCarregando] = useState<Record<string, boolean>>({});

  const carregar = () => {
    setCarregando(true);
    fetchApi("/api/objetivos")
      .then((r) => r.json())
      .then(setLista)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, [fetchApi]);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const v = parseFloat(valorMeta.replace(",", "."));
    if (isNaN(v) || v <= 0) {
      setErro("Valor da meta inválido");
      return;
    }
    setSalvando(true);
    try {
      await fetchApi("/api/objetivos", {
        method: "POST",
        body: JSON.stringify({ nome, valorMeta: v }),
      });
      setNome("");
      setValorMeta("");
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar objetivo");
    } finally {
      setSalvando(false);
    }
  }

  async function handleAporte(id: string) {
    const valorStr = aporteValor[id] ?? "";
    setAporteErro((prev) => ({ ...prev, [id]: "" }));
    const v = parseFloat(valorStr.replace(",", "."));
    if (isNaN(v) || v <= 0) {
      setAporteErro((prev) => ({ ...prev, [id]: "Valor de aporte inválido" }));
      return;
    }
    setAporteCarregando((prev) => ({ ...prev, [id]: true }));
    try {
      await fetchApi(`/api/objetivos/${id}/aportes`, {
        method: "POST",
        body: JSON.stringify({ valor: v }),
      });
      setAporteValor((prev) => ({ ...prev, [id]: "" }));
      carregar();
    } catch (err) {
      setAporteErro((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Erro ao registrar aporte",
      }));
    } finally {
      setAporteCarregando((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleRemover(id: string) {
    if (!confirm("Excluir este objetivo e todos os aportes?")) return;
    try {
      await fetchApi(`/api/objetivos/${id}`, { method: "DELETE" });
      carregar();
    } catch {
      // Silencia erro simples
    }
  }

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Metas de poupança / objetivos</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { setMostrarForm(!mostrarForm); setErro(""); }}
        >
          {mostrarForm ? "Cancelar" : "+ Nova meta"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleCriar} className="card" style={{ marginBottom: "1rem" }}>
          {erro && <p className="alert alert-error">{erro}</p>}
          <div className="form-group">
            <label>Nome do objetivo</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder='Ex.: "Reserva de emergência 5.000", "Viagem"'
              required
            />
          </div>
          <div className="form-group">
            <label>Valor da meta (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={valorMeta}
              onChange={(e) => setValorMeta(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? "Salvando..." : "Criar meta"}
          </button>
        </form>
      )}

      {carregando ? (
        <div className="card">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="card muted">
          Nenhuma meta cadastrada. Crie uma meta acima e depois registre aportes para acompanhar o progresso.
        </div>
      ) : (
        <ul className="list">
          {lista.map((o) => {
            const percentual = Math.min(100, Math.max(0, o.percentual));
            const progressoTexto = `${percentual.toFixed(1)}%`;
            const falta = o.faltante <= 0 ? 0 : o.faltante;
            return (
              <li key={o.id} className="card list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div className="inline-row" style={{ justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div>
                    <strong>{o.nome}</strong>
                    {o.concluido && (
                      <span className="list-meta" style={{ marginLeft: "0.5rem", color: "#16a34a" }}>
                        concluído
                      </span>
                    )}
                    <br />
                    <span className="muted" style={{ fontSize: "0.85rem" }}>
                      Meta: {formatarMoeda(o.valorMeta)} · Já poupado:{" "}
                      <span className="saldo-positivo">{formatarMoeda(o.totalAportado)}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleRemover(o.id)}
                  >
                    Excluir
                  </button>
                </div>

                <div style={{ marginBottom: "0.5rem" }}>
                  <div
                    aria-label={`Progresso ${progressoTexto}`}
                    style={{
                      position: "relative",
                      height: "0.6rem",
                      borderRadius: "999px",
                      backgroundColor: "#e5e7eb",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentual}%`,
                        height: "100%",
                        background: "linear-gradient(90deg,#22c55e,#16a34a)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div className="inline-row" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
                    <span className="muted">{progressoTexto}</span>
                    <span className="muted" style={{ marginLeft: "auto" }}>
                      Falta: <strong>{formatarMoeda(falta)}</strong>
                    </span>
                  </div>
                </div>

                <div className="inline-row" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                  <span className="muted">
                    Previsão para atingir a meta:{" "}
                    <strong>{formatarData(o.previsao)}</strong>
                  </span>
                </div>

                <div
                  className="inline-row"
                  style={{ gap: "0.5rem", alignItems: "flex-end", marginTop: "0.5rem" }}
                >
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label style={{ fontSize: "0.8rem" }}>Novo aporte (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={aporteValor[o.id] ?? ""}
                      onChange={(e) =>
                        setAporteValor((prev) => ({ ...prev, [o.id]: e.target.value }))
                      }
                      placeholder="0,00"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ whiteSpace: "nowrap" }}
                    onClick={() => handleAporte(o.id)}
                    disabled={aporteCarregando[o.id]}
                  >
                    {aporteCarregando[o.id] ? "Salvando..." : "Registrar aporte"}
                  </button>
                </div>
                {aporteErro[o.id] && (
                  <p className="alert alert-error" style={{ marginTop: "0.5rem" }}>
                    {aporteErro[o.id]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

