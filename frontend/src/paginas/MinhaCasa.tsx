import { useState, useEffect } from "react";
import { useAuth } from "../contextos/AuthContext";

interface Casa {
  id: string;
  nome: string | null;
  criadoEm: string;
}

interface Membro {
  id: string;
  email: string;
  nome: string | null;
}

export default function MinhaCasa() {
  const { fetchApi } = useAuth();
  const [casa, setCasa] = useState<Casa | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    fetchApi("/api/casa")
      .then((r) => r.json())
      .then((data: { casa: Casa | null; membros: Membro[] }) => {
        setCasa(data.casa);
        setMembros(data.membros || []);
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, [fetchApi]);

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const res = await fetchApi("/api/casa/membros", {
        method: "POST",
        body: JSON.stringify({ email, nome: nome || undefined, senha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Erro ao adicionar usuário");
      setEmail("");
      setNome("");
      setSenha("");
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return <div className="card">Carregando...</div>;
  }

  if (!casa) {
    return (
      <div className="card">
        <p className="muted">Você ainda não criou uma casa. Crie uma casa no início para compartilhar receitas e despesas.</p>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Minha casa</h2>
        <p className="muted" style={{ fontSize: "0.875rem" }}>
          {casa.nome || "Minha Casa"}
        </p>
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
          Todos os membros veem e editam as mesmas receitas e despesas.
        </p>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.125rem" }}>Membros</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { setMostrarForm(!mostrarForm); setErro(""); }}
          >
            {mostrarForm ? "Cancelar" : "+ Adicionar usuário"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleAdicionar} className="card" style={{ marginBottom: "1rem", backgroundColor: "#f9fafb" }}>
            {erro && <div className="alert alert-error" style={{ marginBottom: "0.75rem" }}>{erro}</div>}
            <p className="muted" style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
              Crie uma conta para outra pessoa usar as mesmas receitas e despesas desta casa.
            </p>
            <div className="form-group">
              <label htmlFor="email-membro">E-mail</label>
              <input
                id="email-membro"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="exemplo@email.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="nome-membro">Nome (opcional)</label>
              <input
                id="nome-membro"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da pessoa"
              />
            </div>
            <div className="form-group">
              <label htmlFor="senha-membro">Senha (mín. 6 caracteres)</label>
              <input
                id="senha-membro"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                placeholder="Senha para login"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? "Criando..." : "Criar usuário e adicionar à casa"}
            </button>
          </form>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {membros.length === 0 ? (
            <li className="muted" style={{ padding: "0.5rem 0" }}>Nenhum membro além de você.</li>
          ) : (
            membros.map((m) => (
              <li
                key={m.id}
                style={{
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{m.nome || m.email}</span>
                  {m.nome && <span className="muted" style={{ fontSize: "0.875rem", marginLeft: "0.5rem" }}>({m.email})</span>}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}
