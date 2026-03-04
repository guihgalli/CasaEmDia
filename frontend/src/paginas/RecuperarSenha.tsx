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
    <div className="container" style={{ maxWidth: "360px", paddingTop: "3rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Recuperar senha</h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        Informe seu e-mail para receber o link de redefinição.
      </p>
      {enviado ? (
        <div className="card">
          <p style={{ color: "#059669" }}>
            Se o e-mail existir em nossa base, você receberá as instruções para redefinir a senha.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
            Voltar ao login
          </Link>
        </div>
      ) : (
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
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={carregando}>
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
