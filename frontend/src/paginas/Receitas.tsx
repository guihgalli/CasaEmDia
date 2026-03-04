import { useState, useEffect } from "react";
import { useAuth } from "../contextos/AuthContext";

interface Receita {
  id: string;
  nome: string;
  valor: number;
  recorrente: boolean;
  ativo: boolean;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export default function Receitas() {
  const { fetchApi } = useAuth();
  const [lista, setLista] = useState<Receita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [recorrente, setRecorrente] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = () => {
    fetchApi("/api/receitas")
      .then((r) => r.json())
      .then(setLista)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, [fetchApi]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const v = parseFloat(valor.replace(",", "."));
    if (isNaN(v) || v <= 0) {
      setErro("Valor inválido");
      return;
    }
    try {
      await fetchApi("/api/receitas", {
        method: "POST",
        body: JSON.stringify({ nome, valor: v, recorrente }),
      });
      setNome("");
      setValor("");
      setRecorrente(true);
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  async function remover(id: string) {
    if (!confirm("Desativar esta receita?")) return;
    try {
      await fetchApi(`/api/receitas/${id}`, { method: "DELETE" });
      carregar();
    } catch {
      setErro("Erro ao remover");
    }
  }

  const ativas = lista.filter((r) => r.ativo);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem" }}>Receitas</h2>
        <button type="button" className="btn btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? "Cancelar" : "+ Nova receita"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "1rem" }}>
          {erro && <p style={{ color: "#dc2626", marginBottom: "0.5rem" }}>{erro}</p>}
          <div className="form-group">
            <label>Nome (ex: Salário João)</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Valor (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} />
              Recorrente mensal
            </label>
          </div>
          <button type="submit" className="btn btn-primary">Salvar</button>
        </form>
      )}

      {carregando ? (
        <div className="card">Carregando...</div>
      ) : ativas.length === 0 ? (
        <div className="card" style={{ color: "#6b7280" }}>Nenhuma receita cadastrada. Adicione uma acima.</div>
      ) : (
        <ul style={{ listStyle: "none" }}>
          {ativas.map((r) => (
            <li key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{r.nome}</strong>
                {r.recorrente && <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: "0.5rem" }}>recorrente</span>}
                <br />
                <span className="saldo-positivo">{formatarMoeda(r.valor)}</span>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => remover(r.id)} title="Desativar">
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
