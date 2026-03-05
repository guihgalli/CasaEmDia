import { useState, useEffect } from "react";
import { useAuth } from "../contextos/AuthContext";

interface DespesaFixa {
  id: string;
  nome: string;
  valor: number;
  diaVencimento: number;
  recorrente: boolean;
  ativo: boolean;
  quantidadeParcelas?: number | null;
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
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("");
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
    const qtdParcelas = quantidadeParcelas ? parseInt(quantidadeParcelas, 10) : undefined;
    if (isNaN(v) || v <= 0) {
      setErro("Valor inválido");
      return;
    }
    if (isNaN(dia) || dia < 1 || dia > 31) {
      setErro("Dia de vencimento entre 1 e 31");
      return;
    }
    if (recorrente && quantidadeParcelas && (isNaN(qtdParcelas!) || qtdParcelas! <= 0)) {
      setErro("Quantidade de parcelas inválida");
      return;
    }
    try {
      await fetchApi("/api/despesas-fixas", {
        method: "POST",
        body: JSON.stringify({
          nome,
          valor: v,
          diaVencimento: dia,
          recorrente,
          quantidadeParcelas: recorrente ? qtdParcelas : undefined,
        }),
      });
      setNome("");
      setValor("");
      setDiaVencimento("10");
      setRecorrente(true);
      setQuantidadeParcelas("");
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
      <div className="section-head">
        <h2 className="section-title">Despesas fixas</h2>
        <button type="button" className="btn btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? "Cancelar" : "+ Nova despesa fixa"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "1rem" }}>
          {erro && <p className="alert alert-error">{erro}</p>}
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
            <label className="inline-row">
              <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} />
              Recorrente mensal
            </label>
          </div>
          {recorrente && (
            <div className="form-group">
              <label>Quantidade de parcelas (opcional)</label>
              <input
                type="number"
                min={1}
                max={600}
                value={quantidadeParcelas}
                onChange={(e) => setQuantidadeParcelas(e.target.value)}
                placeholder="Ex.: 12"
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary">Salvar</button>
        </form>
      )}

      {carregando ? (
        <div className="card">Carregando...</div>
      ) : ativas.length === 0 ? (
        <div className="card muted">Nenhuma despesa fixa. Adicione uma acima.</div>
      ) : (
        <ul className="list">
          {ativas.map((d) => (
            <li key={d.id} className="card list-item">
              <div>
                <strong>{d.nome}</strong>
                <br />
                <span className="list-meta">Vencimento dia {d.diaVencimento}</span>
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
