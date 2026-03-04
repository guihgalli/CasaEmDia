import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../contextos/AuthContext";
import { parsearConteudoQR } from "../utils/qrNotaFiscal";

const CATEGORIAS = [
  "Mercado",
  "Farmácia",
  "Transporte",
  "Alimentação fora",
  "Educação",
  "Lazer",
  "Outros",
];

export default function EscanearNota() {
  const { fetchApi } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "scanning" | "form" | "saving" | "erro">("idle");
  const [erro, setErro] = useState("");
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divLeitorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning()) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function iniciarCamera() {
    setErro("");
    setStatus("scanning");
    try {
      const scanner = new Html5Qrcode("leitor-qr");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 5, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => {
            scannerRef.current = null;
            const dados = parsearConteudoQR(decodedText);
            setNome(dados.nomeEstabelecimento || "Nota fiscal");
            setValor(dados.valorTotal != null ? dados.valorTotal.toFixed(2).replace(".", ",") : "");
            setData(dados.dataCompra || new Date().toISOString().slice(0, 10));
            setStatus("form");
          }).catch(() => setStatus("idle"));
        },
        () => {}
      );
    } catch (e) {
      setErro("Não foi possível acessar a câmera. Verifique as permissões ou use o cadastro manual.");
      setStatus("idle");
    }
  }

  function cancelarScan() {
    if (scannerRef.current?.isScanning()) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setStatus("idle");
      }).catch(() => setStatus("idle"));
    } else setStatus("idle");
  }

  async function salvar() {
    setErro("");
    const v = parseFloat(valor.replace(",", "."));
    if (isNaN(v) || v <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    setStatus("saving");
    try {
      await fetchApi("/api/despesas-extras", {
        method: "POST",
        body: JSON.stringify({ nome: nome || "Nota fiscal", valor: v, data, categoria }),
      });
      navigate("/despesas-extras", { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
      setStatus("form");
    }
  }

  return (
    <>
      <h2 style={{ marginBottom: "1rem" }}>Escanear nota fiscal</h2>

      {status === "idle" && (
        <div className="card">
          <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
            Aponte a câmera para o QR Code da nota fiscal. Se o valor não for identificado, preencha manualmente após o scan.
          </p>
          <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={iniciarCamera}>
            Abrir câmera e escanear
          </button>
        </div>
      )}

      {status === "scanning" && (
        <div className="card">
          <div id="leitor-qr" ref={divLeitorRef} style={{ width: "100%", maxWidth: "400px", margin: "0 auto 1rem" }} />
          {erro && <p style={{ color: "#dc2626", marginBottom: "0.5rem" }}>{erro}</p>}
          <button type="button" className="btn btn-secondary" style={{ width: "100%" }} onClick={cancelarScan}>
            Cancelar
          </button>
        </div>
      )}

      {(status === "form" || status === "saving") && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          {erro && <p style={{ color: "#dc2626", marginBottom: "0.5rem" }}>{erro}</p>}
          <div className="form-group">
            <label>Nome do estabelecimento</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Valor total (R$)</label>
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
            <label>Data da compra</label>
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStatus("idle")}>
              Descartar
            </button>
            <button type="submit" className="btn btn-primary" disabled={status === "saving"}>
              {status === "saving" ? "Salvando..." : "Salvar despesa"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
