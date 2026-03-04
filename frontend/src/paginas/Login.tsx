import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contextos/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await login(email, senha);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: "360px", paddingTop: "3rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Casa em Dia</h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>Entre na sua conta</p>
      <form onSubmit={handleSubmit} className="card">
        {erro && (
          <div style={{ padding: "0.75rem", background: "#fef2f2", color: "#dc2626", borderRadius: "8px", marginBottom: "1rem" }}>
            {erro}
          </div>
        )}
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
        <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
          <Link to="/recuperar-senha">Esqueci minha senha</Link>
        </p>
      </form>
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </div>
  );
}
