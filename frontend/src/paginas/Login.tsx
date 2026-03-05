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
    <div className="container auth-wrap">
      <h1 className="auth-title">Bem-vindo de volta</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        Acesse sua conta para acompanhar receitas e despesas da casa.
      </p>
      <form onSubmit={handleSubmit} className="card">
        {erro && <div className="alert alert-error">{erro}</div>}
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
        <button type="submit" className="btn btn-primary full" style={{ marginTop: "0.5rem" }} disabled={carregando}>
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
