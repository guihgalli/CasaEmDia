import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contextos/AuthContext";

export default function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="container" style={{ paddingBottom: "5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Casa em Dia</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{usuario?.email}</span>
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
      </nav>

      <Outlet />
    </div>
  );
}
