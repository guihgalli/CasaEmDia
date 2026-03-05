import { useState, useEffect } from "react";
import { useAuth } from "../contextos/AuthContext";

interface DashboardData {
  mes: number;
  ano: number;
  totalReceitas: number;
  totalDespesasFixas: number;
  totalDespesasExtras: number;
  totalDespesas: number;
  saldo: number;
  positivo: boolean;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export default function Dashboard() {
  const { fetchApi } = useAuth();
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancel = false;
    setCarregando(true);
    fetchApi(`/api/dashboard?mes=${mes}&ano=${ano}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancel) setDados(data);
      })
      .finally(() => { if (!cancel) setCarregando(false); });
    return () => { cancel = true; };
  }, [fetchApi, mes, ano]);

  function anterior() {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else setMes((m) => m - 1);
  }

  function proximo() {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else setMes((m) => m + 1);
  }

  if (carregando || !dados) {
    return <div className="card">Carregando...</div>;
  }

  return (
    <>
      <div className="section-head">
        <button type="button" className="btn btn-secondary" onClick={anterior} aria-label="Mês anterior">
          ‹
        </button>
        <h2 className="section-title" style={{ fontSize: "1.125rem" }}>
          {MESES[dados.mes - 1]} {dados.ano}
        </h2>
        <button type="button" className="btn btn-secondary" onClick={proximo} aria-label="Próximo mês">
          ›
        </button>
      </div>

      <div className="card" style={{ textAlign: "center", marginBottom: "1rem" }}>
        <p className="muted" style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>Saldo do mês</p>
        <p className={dados.positivo ? "saldo-positivo" : "saldo-negativo"} style={{ fontSize: "1.75rem", fontWeight: 700 }}>
          {formatarMoeda(dados.saldo)}
        </p>
      </div>

      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "0.75rem 0", color: "#6b7280" }}>Receitas</td>
              <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: 500 }} className="saldo-positivo">
                {formatarMoeda(dados.totalReceitas)}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "0.75rem 0", color: "#6b7280" }}>Despesas fixas</td>
              <td style={{ padding: "0.75rem 0", textAlign: "right" }}>{formatarMoeda(dados.totalDespesasFixas)}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "0.75rem 0", color: "#6b7280" }}>Despesas extras</td>
              <td style={{ padding: "0.75rem 0", textAlign: "right" }}>{formatarMoeda(dados.totalDespesasExtras)}</td>
            </tr>
            <tr>
              <td style={{ padding: "0.75rem 0", fontWeight: 600 }}>Total de despesas</td>
              <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: 600 }} className="saldo-negativo">
                {formatarMoeda(dados.totalDespesas)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
