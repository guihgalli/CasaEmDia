import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contextos/AuthContext";

export default function Cadastro() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const { cadastro } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await cadastro(email, senha, nome || undefined);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: "360px", paddingTop: "3rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Casa em Dia</h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>Crie sua conta</p>
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
          <label htmlFor="nome">Nome (opcional)</label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="senha">Senha (mín. 6 caracteres)</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={carregando}>
          {carregando ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}
