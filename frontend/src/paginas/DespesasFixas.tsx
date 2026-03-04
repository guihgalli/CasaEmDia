import { useState, useEffect } from "react";
import { useAuth } from "../contextos/AuthContext";

interface DespesaFixa {
  id: string;
  nome: string;
  valor: number;
  diaVencimento: number;
  recorrente: boolean;
  ativo: boolean;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export default function DespesasFixas() {
  const { fetchApi } = useAuth();
  const [lista, setLista] = useState<DespesaFixa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [recorrente, setRecorrente] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = () => {
    fetchApi("/api/despesas-fixas")
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
    const dia = parseInt(diaVencimento, 10);
    if (isNaN(v) || v <= 0) {
      setErro("Valor inválido");
      return;
    }
    if (isNaN(dia) || dia < 1 || dia > 31) {
      setErro("Dia de vencimento entre 1 e 31");
      return;
    }
    try {
      await fetchApi("/api/despesas-fixas", {
        method: "POST",
        body: JSON.stringify({ nome, valor: v, diaVencimento: dia, recorrente }),
      });
      setNome("");
      setValor("");
      setDiaVencimento("10");
      setRecorrente(true);
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  async function remover(id: string) {
    if (!confirm("Desativar esta despesa fixa?")) return;
    try {
      await fetchApi(`/api/despesas-fixas/${id}`, { method: "DELETE" });
      carregar();
    } catch {
      setErro("Erro ao remover");
    }
  }

  const ativas = lista.filter((d) => d.ativo);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem" }}>Despesas fixas</h2>
        <button type="button" className="btn btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? "Cancelar" : "+ Nova despesa fixa"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "1rem" }}>
          {erro && <p style={{ color: "#dc2626", marginBottom: "0.5rem" }}>{erro}</p>}
          <div className="form-group">
            <label>Nome</label>
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
            <label>Dia do vencimento (1-31)</label>
            <input
              type="number"
              min={1}
              max={31}
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
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
        <div className="card" style={{ color: "#6b7280" }}>Nenhuma despesa fixa. Adicione uma acima.</div>
      ) : (
        <ul style={{ listStyle: "none" }}>
          {ativas.map((d) => (
            <li key={d.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{d.nome}</strong>
                <br />
                <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Vencimento dia {d.diaVencimento}</span>
                <br />
                <span className="saldo-negativo">{formatarMoeda(d.valor)}</span>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => remover(d.id)}>Remover</button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
