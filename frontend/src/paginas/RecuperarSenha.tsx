import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/recuperar-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao solicitar");
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao solicitar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="container auth-wrap">
      <h1 className="auth-title">Recuperar senha</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        Informe seu e-mail para receber o link de redefinição.
      </p>
      {enviado ? (
        <div className="card">
          <p className="alert alert-success">
            Se o e-mail existir em nossa base, você receberá as instruções para redefinir a senha.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
            Voltar ao login
          </Link>
        </div>
      ) : (
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
          <button type="submit" className="btn btn-primary full" style={{ marginTop: "0.5rem" }} disabled={carregando}>
            {carregando ? "Enviando..." : "Enviar"}
          </button>
        </form>
      )}
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link to="/login">Voltar ao login</Link>
      </p>
    </div>
  );
}
