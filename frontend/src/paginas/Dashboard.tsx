import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
    <div className="dashboard-app">
      <section className="dashboard-balance-card">
        <div className="dashboard-balance-head">
          <button type="button" className="dashboard-month-btn" onClick={anterior} aria-label="Mês anterior">
            ‹
          </button>
          <p className="dashboard-month-label">
            {MESES[dados.mes - 1]} {dados.ano}
          </p>
          <button type="button" className="dashboard-month-btn" onClick={proximo} aria-label="Próximo mês">
            ›
          </button>
        </div>
        <p className="dashboard-balance-title">Saldo do mês</p>
        <p className={`dashboard-balance-value ${dados.positivo ? "saldo-positivo" : "saldo-negativo"}`}>
          {formatarMoeda(dados.saldo)}
        </p>
      </section>

      <section className="dashboard-stats-grid">
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-label">Receitas</p>
          <p className="dashboard-stat-value saldo-positivo">{formatarMoeda(dados.totalReceitas)}</p>
        </article>
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-label">Despesas fixas</p>
          <p className="dashboard-stat-value">{formatarMoeda(dados.totalDespesasFixas)}</p>
        </article>
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-label">Despesas extras</p>
          <p className="dashboard-stat-value">{formatarMoeda(dados.totalDespesasExtras)}</p>
        </article>
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-label">Total de despesas</p>
          <p className="dashboard-stat-value saldo-negativo">{formatarMoeda(dados.totalDespesas)}</p>
        </article>
      </section>

      <section className="card">
        <div className="dashboard-row">
          <span className="dashboard-row-label">Receitas</span>
          <span className="dashboard-row-value saldo-positivo">{formatarMoeda(dados.totalReceitas)}</span>
        </div>
        <div className="dashboard-row">
          <span className="dashboard-row-label">Despesas fixas</span>
          <span className="dashboard-row-value">{formatarMoeda(dados.totalDespesasFixas)}</span>
        </div>
        <div className="dashboard-row">
          <span className="dashboard-row-label">Despesas extras</span>
          <span className="dashboard-row-value">{formatarMoeda(dados.totalDespesasExtras)}</span>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h3 className="section-title" style={{ fontSize: "1rem" }}>Ações rápidas</h3>
        </div>
        <div className="dashboard-quick-actions">
          <Link to="/receitas" className="dashboard-action-link">Receitas</Link>
          <Link to="/despesas-fixas" className="dashboard-action-link">Fixas</Link>
          <Link to="/despesas-extras" className="dashboard-action-link">Extras</Link>
          <Link to="/relatorios" className="dashboard-action-link">Relatórios</Link>
        </div>
      </section>
    </div>
  );
}
