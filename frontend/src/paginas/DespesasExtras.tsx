import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contextos/AuthContext";

interface DespesaExtra {
  id: string;
  nome: string;
  valor: number;
  data: string;
  categoria: string;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarData(s: string) {
  const [a, m, d] = s.split("-");
  return `${d}/${m}/${a}`;
}

const CATEGORIAS = [
  "Mercado",
  "Farmácia",
  "Transporte",
  "Alimentação fora",
  "Educação",
  "Lazer",
  "Outros",
];

export default function DespesasExtras() {
  const { fetchApi } = useAuth();
  const [lista, setLista] = useState<DespesaExtra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [erro, setErro] = useState("");

  const carregar = () => {
    setCarregando(true);
    fetchApi(`/api/despesas-extras?mes=${mes}&ano=${ano}`)
      .then((r) => r.json())
      .then(setLista)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, [fetchApi, mes, ano]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const v = parseFloat(valor.replace(",", "."));
    if (isNaN(v) || v <= 0) {
      setErro("Valor inválido");
      return;
    }
    try {
      await fetchApi("/api/despesas-extras", {
        method: "POST",
        body: JSON.stringify({ nome, valor: v, data, categoria }),
      });
      setNome("");
      setValor("");
      setData(new Date().toISOString().slice(0, 10));
      setCategoria(CATEGORIAS[0]);
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  async function remover(id: string) {
    if (!confirm("Excluir esta despesa?")) return;
    try {
      await fetchApi(`/api/despesas-extras/${id}`, { method: "DELETE" });
      carregar();
    } catch {
      setErro("Erro ao remover");
    }
  }

  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Despesas extras</h2>
        <div className="inline-row" style={{ flexWrap: "wrap" }}>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          >
            {[ano, ano - 1, ano - 2].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <Link to="/escanear-nota" className="btn btn-primary">Escanear nota</Link>
          <button type="button" className="btn btn-secondary" onClick={() => setMostrarForm(!mostrarForm)}>
            {mostrarForm ? "Cancelar" : "+ Manual"}
          </button>
        </div>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "1rem" }}>
          {erro && <p className="alert alert-error">{erro}</p>}
          <div className="form-group">
            <label>Nome / estabelecimento</label>
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
            <label>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Salvar</button>
        </form>
      )}

      {carregando ? (
        <div className="card">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="card muted">
          Nenhuma despesa extra neste mês. Adicione manualmente ou <Link to="/escanear-nota">escaneie uma nota</Link>.
        </div>
      ) : (
        <ul className="list">
          {lista.map((d) => (
            <li key={d.id} className="card list-item">
              <div>
                <strong>{d.nome}</strong>
                <br />
                <span className="list-meta">{formatarData(d.data)} · {d.categoria}</span>
                <br />
                <span className="saldo-negativo">{formatarMoeda(d.valor)}</span>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => remover(d.id)}>Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
