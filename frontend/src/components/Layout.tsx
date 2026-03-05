import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contextos/AuthContext";

interface CasaResposta {
  casa: { id: string; nome: string | null } | null;
  membros?: unknown[];
}

export default function Layout() {
  const { usuario, logout, fetchApi } = useAuth();
  const [casa, setCasa] = useState<{ id: string; nome: string | null } | null | "loading">("loading");
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    fetchApi("/api/casa")
      .then((r) => r.json())
      .then((data: CasaResposta) => setCasa(data.casa))
      .catch(() => setCasa(null));
  }, [fetchApi]);

  async function handleCriarCasa(e: React.FormEvent) {
    e.preventDefault();
    setCriando(true);
    try {
      await fetchApi("/api/casa", { method: "POST", body: JSON.stringify({}) });
      const res = await fetchApi("/api/casa");
      const data: CasaResposta = await res.json();
      setCasa(data.casa);
    } finally {
      setCriando(false);
    }
  }

  if (casa === "loading") {
    return (
      <div className="container" style={{ paddingTop: "2rem", textAlign: "center" }}>
        Carregando...
      </div>
    );
  }

  if (!casa) {
    return (
      <div className="container" style={{ paddingBottom: "5rem" }}>
        <header className="hero">
          <div>
            <h1 className="hero-title">Casa em Dia</h1>
            <p className="hero-subtitle">Finanças organizadas, família mais tranquila.</p>
          </div>
          <div className="inline-row">
            <span style={{ fontSize: "0.875rem", opacity: 0.92 }}>{usuario?.email}</span>
            <button type="button" className="btn btn-secondary" onClick={logout}>
              Sair
            </button>
          </div>
        </header>
        <div className="card" style={{ maxWidth: "28rem", margin: "2rem auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Crie sua casa</h2>
          <p className="muted" style={{ marginBottom: "1.5rem" }}>
            Para usar receitas e despesas, crie uma casa. Depois você pode adicionar outros usuários para compartilhar os mesmos dados.
          </p>
          <form onSubmit={handleCriarCasa}>
            <button type="submit" className="btn btn-primary full" disabled={criando}>
              {criando ? "Criando..." : "Criar minha casa"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: "5rem" }}>
      <header className="hero">
        <div>
          <h1 className="hero-title">Casa em Dia</h1>
          <p className="hero-subtitle">Finanças organizadas, família mais tranquila.</p>
        </div>
        <div className="inline-row">
          <span style={{ fontSize: "0.875rem", opacity: 0.92 }}>{usuario?.email}</span>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "ativo" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/receitas" className={({ isActive }) => (isActive ? "ativo" : "")}>
          Receitas
        </NavLink>
        <NavLink to="/despesas-fixas" className={({ isActive }) => (isActive ? "ativo" : "")}>
          Despesas fixas
        </NavLink>
        <NavLink to="/despesas-extras" className={({ isActive }) => (isActive ? "ativo" : "")}>
          Extras
        </NavLink>
        <NavLink to="/escanear-nota" className={({ isActive }) => (isActive ? "ativo" : "")}>
          Escanear nota
        </NavLink>
        <NavLink to="/casa" className={({ isActive }) => (isActive ? "ativo" : "")}>
          Minha casa
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
