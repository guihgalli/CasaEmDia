/**
 * Tenta extrair dados de nota fiscal a partir do conteúdo decodificado do QR Code.
 * No Brasil, NFC-e/NF-e podem vir em formato URL (portal da SEFAZ) ou string com chave/dados.
 * MVP: extrair valor total, data e nome do estabelecimento quando o padrão for reconhecido.
 */

export interface DadosNotaFiscal {
  nomeEstabelecimento: string;
  valorTotal: number | null;
  dataCompra: string | null; // AAAA-MM-DD
}

/**
 * Tenta extrair valor em reais de uma string (ex: "R$ 123,45" ou "123.45" ou "123,45").
 */
function extrairValor(texto: string): number | null {
  // R$ 1.234,56 ou 1234,56 ou 1234.56
  const match = texto.match(/R\$\s*([\d.,]+)|(\d{1,3}(?:\.\d{3})*,\d{2})|(\d+[,.]\d{2})/);
  if (!match) return null;
  const num = (match[1] || match[2] || match[3] || "").replace(/\./g, "").replace(",", ".");
  const v = parseFloat(num);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Tenta extrair data em formato DD/MM/AAAA ou AAAA-MM-DD.
 */
function extrairData(texto: string): string | null {
  const ddmmaaaa = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmmaaaa) {
    const [, d, m, a] = ddmmaaaa;
    return `${a}-${m}-${d}`;
  }
  const iso = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return null;
}

/**
 * Parseia o conteúdo bruto do QR Code e retorna os campos que conseguir preencher.
 * Se o formato for desconhecido, retorna campos vazios para o usuário preencher.
 */
export function parsearConteudoQR(conteudo: string): DadosNotaFiscal {
  const resultado: DadosNotaFiscal = {
    nomeEstabelecimento: "",
    valorTotal: null,
    dataCompra: null,
  };

  if (!conteudo || typeof conteudo !== "string") return resultado;

  const linhas = conteudo.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
  const textoUnico = conteudo.replace(/\s+/g, " ");

  // Valor total:
  // 1) Priorizar linhas com a palavra "total" (evitando "subtotal"), de baixo para cima.
  for (const linha of [...linhas].reverse()) {
    const lower = linha.toLowerCase();
    if (/\btotal\b/.test(lower) && !lower.includes("subtotal")) {
      const v = extrairValor(linha);
      if (v != null) {
        resultado.valorTotal = v;
        break;
      }
    }
  }

  // 2) Se ainda não encontrou, procurar linhas com "valor" ou "R$"
  if (resultado.valorTotal == null) {
    for (const linha of linhas) {
      const lower = linha.toLowerCase();
      if (lower.includes("valor") || lower.includes("r$")) {
        const v = extrairValor(linha);
        if (v != null) {
          resultado.valorTotal = v;
          break;
        }
      }
    }
  }

  if (resultado.valorTotal == null) {
    const v = extrairValor(textoUnico);
    if (v != null) resultado.valorTotal = v;
  }

  // Data
  resultado.dataCompra = extrairData(textoUnico) || extrairData(conteudo);

  // Nome do estabelecimento: muitas notas têm "Razão Social" ou primeira linha com nome
  const razaoMatch = conteudo.match(/Raz[ãa]o\s*Social[:\s]*([^\n\r]+)/i)
    || conteudo.match(/Nome[:\s]*([^\n\r]+)/i)
    || conteudo.match(/Estabelecimento[:\s]*([^\n\r]+)/i);
  if (razaoMatch) {
    resultado.nomeEstabelecimento = razaoMatch[1].trim().slice(0, 200);
  }

  // Fallback: usar primeira linha não numérica como nome (com cuidado)
  if (!resultado.nomeEstabelecimento && linhas.length > 0) {
    const primeira = linhas.find((l) => l.length > 3 && !/^[\d.,\sR$]+$/.test(l));
    if (primeira) resultado.nomeEstabelecimento = primeira.slice(0, 200);
  }

  return resultado;
}

/**
 * Parseia texto OCR de cupom/nota para tentar preencher os mesmos campos.
 * Reaproveita a lógica principal do parser de QR.
 */
export function parsearTextoCupom(conteudoOCR: string): DadosNotaFiscal {
  return parsearConteudoQR(conteudoOCR);
}
