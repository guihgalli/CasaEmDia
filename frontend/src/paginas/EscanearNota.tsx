import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../contextos/AuthContext";
import { parsearConteudoQR, parsearTextoCupom } from "../utils/qrNotaFiscal";

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
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  function preencherFormularioPorDados(dados: { nomeEstabelecimento: string; valorTotal: number | null; dataCompra: string | null }) {
    setNome(dados.nomeEstabelecimento || "Nota fiscal");
    setValor(dados.valorTotal != null ? dados.valorTotal.toFixed(2).replace(".", ",") : "");
    setData(dados.dataCompra || new Date().toISOString().slice(0, 10));
    setStatus("form");
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "scanning") return;

    let ativo = true;

    async function iniciarScanner() {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) {
          throw new Error("Nenhuma câmera encontrada neste dispositivo.");
        }
        const cameraId = cameras.find((c) => /back|rear|traseira/i.test(c.label))?.id ?? cameras[0].id;

        const scanner = new Html5Qrcode("leitor-qr");
        scannerRef.current = scanner;
        await scanner.start(
          cameraId,
          { fps: 5, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (!ativo) return;
            scanner.stop().then(() => {
              scannerRef.current = null;
              const dados = parsearConteudoQR(decodedText);
              preencherFormularioPorDados(dados);
            }).catch(() => setStatus("idle"));
          },
          () => {}
        );
      } catch (e) {
        if (!ativo) return;
        const mensagem = e instanceof Error ? e.message : "Falha ao iniciar câmera.";
        setErro(
          `Não foi possível acessar a câmera (${mensagem}). Verifique permissões do navegador e se o site está em HTTPS/localhost.`
        );
        setStatus("idle");
      }
    }

    iniciarScanner();

    return () => {
      ativo = false;
    };
  }, [status]);

  function iniciarCamera() {
    setErro("");
    setStatus("scanning");
  }

  function abrirSeletorArquivo() {
    setErro("");
    arquivoInputRef.current?.click();
  }

  async function lerQrDeArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErro("");
    setStatus("scanning");
    const leitorArquivo = new Html5Qrcode("leitor-qr-arquivo");

    try {
      const decodedText = await leitorArquivo.scanFile(arquivo, false);
      const dados = parsearConteudoQR(decodedText);
      preencherFormularioPorDados(dados);
    } catch (err) {
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("por");
        const { data: ocr } = await worker.recognize(arquivo);
        await worker.terminate();

        const dadosOCR = parsearTextoCupom(ocr.text || "");
        const encontrouAlgo =
          Boolean(dadosOCR.nomeEstabelecimento) ||
          dadosOCR.valorTotal != null ||
          Boolean(dadosOCR.dataCompra);

        if (!encontrouAlgo) {
          throw new Error("OCR não encontrou campos úteis na imagem.");
        }

        preencherFormularioPorDados(dadosOCR);
        setErro("QR não identificado, mas extraí dados pelo texto da imagem. Revise antes de salvar.");
      } catch (ocrErr) {
        const mensagem = ocrErr instanceof Error ? ocrErr.message : "Não foi possível ler o QR ou extrair texto da imagem.";
        setErro(`Falha ao ler imagem: ${mensagem}`);
        setStatus("idle");
      }
    } finally {
      try {
        leitorArquivo.clear();
      } catch {
        // Ignora erro de limpeza do leitor temporário.
      }
      if (arquivoInputRef.current) {
        arquivoInputRef.current.value = "";
      }
    }
  }

  function cancelarScan() {
    if (scannerRef.current?.isScanning) {
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
      <h2 className="section-title" style={{ marginBottom: "1rem" }}>Escanear nota fiscal</h2>

      {status === "idle" && (
        <div className="card">
          {erro && <p className="alert alert-error">{erro}</p>}
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Aponte a câmera para o QR Code da nota fiscal. Se o valor não for identificado, preencha manualmente após o scan.
          </p>
          <button type="button" className="btn btn-primary full" onClick={iniciarCamera}>
            Abrir câmera e escanear
          </button>
          <button type="button" className="btn btn-secondary full" onClick={abrirSeletorArquivo} style={{ marginTop: "0.5rem" }}>
            Selecionar foto do QR
          </button>
          <input
            ref={arquivoInputRef}
            type="file"
            accept="image/*"
            onChange={lerQrDeArquivo}
            style={{ display: "none" }}
          />
          <p className="muted" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
            Em HTTP, use a opção de foto. Câmera ao vivo exige HTTPS (ou localhost).
          </p>
        </div>
      )}

      {status === "scanning" && (
        <div className="card">
          <div id="leitor-qr" style={{ width: "100%", maxWidth: "400px", margin: "0 auto 1rem" }} />
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            Processando leitura...
          </p>
          {erro && <p className="alert alert-error">{erro}</p>}
          <button type="button" className="btn btn-secondary full" onClick={cancelarScan}>
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
          {erro && <p className="alert alert-error">{erro}</p>}
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
          <div className="inline-row">
            <button type="button" className="btn btn-secondary" onClick={() => setStatus("idle")}>
              Descartar
            </button>
            <button type="submit" className="btn btn-primary" disabled={status === "saving"}>
              {status === "saving" ? "Salvando..." : "Salvar despesa"}
            </button>
          </div>
        </form>
      )}
      <div id="leitor-qr-arquivo" style={{ display: "none" }} />
    </>
  );
}
