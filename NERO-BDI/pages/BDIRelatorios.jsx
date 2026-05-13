import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Download,
  Search,
  ClipboardList,
  Landmark,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Info,
  RefreshCcw,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { listarComposicoesBDI } from "../services/bdiService";

const LOGO_URL = "/logo.png";

function parsePercent(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function formatPercentValue(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "%";
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function safeText(value, fallback = "-") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeFileName(value) {
  return String(value || "relatorio-bdi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function groupItems(items = []) {
  return ["Despesas Indiretas", "Riscos e Garantias", "Resultado", "Tributos"].map((grupo) => ({
    grupo,
    items: items.filter((item) => item.grupo === grupo),
    total: items
      .filter((item) => item.grupo === grupo)
      .reduce((acc, item) => acc + parsePercent(item.percentual), 0),
  }));
}

function getRevisionHistory(composicao) {
  const direto = composicao?.historicoRevisoes;
  const resumo = composicao?.resumo?.historicoRevisoes;

  if (Array.isArray(direto)) return direto;
  if (Array.isArray(resumo)) return resumo;

  return [];
}

function buildCurrentRevision(dadosGerais) {
  return {
    revisao: safeText(dadosGerais.revisao, "REV 00"),
    data: safeText(dadosGerais.dataRevisao, new Date().toLocaleDateString("pt-BR")),
    responsavel: safeText(dadosGerais.responsavel, "NERO Construções"),
    observacao: safeText(dadosGerais.observacaoRevisao, "Emissão inicial do relatório executivo de BDI."),
  };
}

function getRevisionRows(composicao, dadosGerais) {
  const historico = getRevisionHistory(composicao);
  const atual = buildCurrentRevision(dadosGerais);

  const rows = historico.map((item) => [
    safeText(item.revisao, "-"),
    safeText(item.data, "-"),
    safeText(item.responsavel, "-"),
    safeText(item.observacao, "-"),
  ]);

  const alreadyHasCurrent = rows.some((row) => row[0] === atual.revisao);

  if (!alreadyHasCurrent) {
    rows.unshift([
      atual.revisao,
      atual.data,
      atual.responsavel,
      atual.observacao,
    ]);
  }

  return rows;
}


function calculateImpact(item, resumo) {
  const custo = Number(resumo?.custo || 0);
  const percent = parsePercent(item?.percentual);
  return custo * (percent / 100);
}

function calculateGroupImpact(group, resumo) {
  const custo = Number(resumo?.custo || 0);
  const percent = Number(group?.total || 0);
  return custo * (percent / 100);
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch(LOGO_URL);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Não foi possível carregar /logo.png para o PDF.", error);
    return null;
  }
}

function Kpi({ title, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-[#24344D] bg-[#111827] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-400">{title}</p>
          <strong className={`mt-3 block overflow-hidden text-ellipsis whitespace-nowrap text-3xl font-black ${tone}`}>{value}</strong>
        </div>
        <div className="rounded-2xl bg-[#1E293B] p-3"><Icon size={22} className={tone} /></div>
      </div>
    </div>
  );
}

function drawFallbackLogo(doc, x, y, scale = 1) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26 * scale);
  doc.setTextColor(0, 128, 75);
  doc.text("NERO", x, y);
  doc.setFontSize(5.8 * scale);
  doc.setCharSpace(1.2 * scale);
  doc.text("CONSTRUÇÕES", x + 8 * scale, y + 7 * scale);
  doc.setCharSpace(0);
}

function drawLogo(doc, logoDataUrl, x, y, w, h) {
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", x, y, w, h, undefined, "FAST");
    return;
  }
  drawFallbackLogo(doc, x, y + h * 0.63, w / 40);
}

function drawCover(doc, composicao, dadosGerais, logoDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, "F");
  drawLogo(doc, logoDataUrl, 25, 18, 38, 18);
  doc.setDrawColor(0, 145, 82);
  doc.setLineWidth(0.42);
  doc.line(25, 47, pageWidth - 18, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(37, 48, 58);
  doc.text("RELATÓRIO EXECUTIVO DE BDI", 25, 61);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(90, 105, 120);
  const meta = [
    `Composição: ${safeText(composicao?.nome, "Composição de BDI")}`,
    `Obra: ${safeText(dadosGerais.obra, "Não informado")}`,
    `Cliente: ${safeText(dadosGerais.cliente, "Não informado")}`,
    `Local: ${safeText(dadosGerais.local, "Não informado")}`,
    `Revisão: ${safeText(dadosGerais.revisao, "REV 00")}`,
    `Data da revisão: ${safeText(dadosGerais.dataRevisao, new Date().toLocaleDateString("pt-BR"))}`,
    `Responsável: ${safeText(dadosGerais.responsavel, "NERO Construções")}`,
    `Emissão: ${new Date().toLocaleString("pt-BR")}`,
  ];
  doc.text(meta, 25, 73);
  doc.setDrawColor(126, 134, 142);
  doc.setLineWidth(0.32);
  doc.line(25, 108, pageWidth - 18, 108);
}

function drawPageHeader(doc, title, logoDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 25, "F");
  drawLogo(doc, logoDataUrl, 14, 8, 25, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(37, 48, 58);
  doc.text(title, pageWidth - 14, 15, { align: "right" });
  doc.setDrawColor(0, 145, 82);
  doc.setLineWidth(0.25);
  doc.line(14, 25, pageWidth - 14, 25);
}

function drawFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(150, 155, 160);
    doc.setLineWidth(0.25);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(105, 115, 125);
    doc.text("NERO Construções • Cálculo do BDI", 14, pageHeight - 8);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }
}

function drawMetricBox(doc, x, y, width, height, label, value, accent = [0, 159, 89]) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(220, 228, 236);
  doc.roundedRect(x, y, width, height, 2.2, 2.2, "FD");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(x, y, 2.3, height, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(92, 105, 122);
  doc.text(label.toUpperCase(), x + 6, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.2);
  doc.setTextColor(20, 31, 45);
  doc.text(String(value), x + 6, y + 17);
}

function drawHorizontalBars(doc, x, y, width, grouped) {
  const maxValue = Math.max(...grouped.map((group) => Number(group.total || 0)), 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(20, 31, 45);
  doc.text("Distribuição do BDI por grupo", x, y);
  let currentY = y + 10;
  grouped.forEach((group) => {
    const barWidth = (Number(group.total || 0) / maxValue) * width;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(65, 78, 94);
    doc.text(group.grupo, x, currentY);
    doc.setFillColor(235, 240, 245);
    doc.roundedRect(x, currentY + 2.2, width, 3.5, 1.2, 1.2, "F");
    doc.setFillColor(0, 159, 89);
    doc.roundedRect(x, currentY + 2.2, Math.max(barWidth, 1), 3.5, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 31, 45);
    doc.text(formatPercentValue(group.total), x + width + 5, currentY + 5);
    currentY += 13;
  });
}

function addResumoExecutivoPage(doc, composicao, dadosGerais, logoDataUrl) {
  const resumo = composicao?.resumo || {};
  const grouped = groupItems(composicao?.items || []);
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  doc.addPage();
  drawPageHeader(doc, "Resumo executivo do BDI", logoDataUrl);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 31, 45);
  doc.text("Resumo executivo do BDI", margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(75, 88, 105);
  const resumoTexto = doc.splitTextToSize(
    `A composição "${safeText(composicao?.nome, "Composição de BDI")}" apresenta BDI total de ${formatPercentValue(resumo.bdi)}, aplicado sobre custo direto de ${formatCurrency(resumo.custo)}, resultando em preço de venda estimado de ${formatCurrency(resumo.precoVenda)}. Esta página consolida os principais indicadores para leitura executiva e validação gerencial.`,
    contentWidth
  );
  doc.text(resumoTexto, margin, 49);
  const cardY = 68;
  const cardGap = 5;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  drawMetricBox(doc, margin, cardY, cardWidth, 22, "BDI total", formatPercentValue(resumo.bdi), [0, 159, 89]);
  drawMetricBox(doc, margin + (cardWidth + cardGap), cardY, cardWidth, 22, "Tributos", formatPercentValue(resumo.tributos), [14, 165, 233]);
  drawMetricBox(doc, margin + (cardWidth + cardGap) * 2, cardY, cardWidth, 22, "Valor BDI", formatCurrency(resumo.valorBdi), [190, 145, 0]);
  drawMetricBox(doc, margin + (cardWidth + cardGap) * 3, cardY, cardWidth, 22, "Preço venda", formatCurrency(resumo.precoVenda), [0, 120, 85]);
  const tableBody = grouped.map((group) => [group.grupo, formatPercentValue(group.total), formatCurrency(calculateGroupImpact(group, resumo)), `${group.items.length} item(ns)`]);
  autoTable(doc, {
    startY: cardY + 33,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.6, cellPadding: 2.5, lineColor: [220, 228, 236], lineWidth: 0.2 },
    headStyles: { fillColor: [20, 31, 45], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 31 }, 2: { halign: "right", cellWidth: 44 }, 3: { halign: "center", cellWidth: 28 } },
    head: [["Grupo", "Percentual", "Impacto financeiro", "Itens"]],
    body: tableBody,
  });
  const chartY = doc.lastAutoTable.finalY + 16;
  drawHorizontalBars(doc, margin, chartY, contentWidth - 42, grouped);
  const noteY = chartY + 68;
  doc.setFillColor(244, 252, 248);
  doc.setDrawColor(185, 230, 210);
  doc.roundedRect(margin, noteY, contentWidth, 32, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 120, 85);
  doc.text("Nota executiva", margin + 5, noteY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.1);
  doc.setTextColor(65, 78, 94);
  doc.text(doc.splitTextToSize("Os valores apresentados consolidam a leitura gerencial do BDI. A validação final deve considerar regime tributário, riscos contratuais, escopo, prazo, estratégia comercial e premissas específicas da obra.", contentWidth - 10), margin + 5, noteY + 16);
  autoTable(doc, {
    startY: noteY + 42,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.2, cellPadding: 2.4, lineColor: [220, 228, 236], lineWidth: 0.2 },
    headStyles: { fillColor: [248, 250, 252], textColor: [20, 31, 45], fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
    head: [["Campo", "Informação"]],
    body: [
      ["Obra", safeText(dadosGerais.obra, "Não informado")],
      ["Cliente", safeText(dadosGerais.cliente, "Não informado")],
      ["Local", safeText(dadosGerais.local, "Não informado")],
      ["Revisão", safeText(dadosGerais.revisao, "REV 00")],
      ["Responsável", safeText(dadosGerais.responsavel, "NERO Construções")],
    ],
  });
}

function addMemoriaPage(doc, composicao, logoDataUrl) {
  const resumo = composicao?.resumo || {};
  const grouped = groupItems(composicao?.items || []);
  const margin = 14;
  doc.addPage();
  drawPageHeader(doc, "Memória de cálculo", logoDataUrl);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 31, 45);
  doc.text("Memória de cálculo", margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(75, 88, 105);
  doc.text("BDI = ((1 + parcelas do numerador) / (1 - tributos) - 1) × 100", margin, 50);
  autoTable(doc, {
    startY: 60,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.7, cellPadding: 2.5, lineColor: [220, 228, 236], lineWidth: 0.2 },
    headStyles: { fillColor: [20, 31, 45], textColor: [255, 255, 255], fontStyle: "bold" },
    head: [["Parâmetro", "Valor"]],
    body: [["Parcelas do numerador", formatPercentValue(resumo.numerador)], ["Tributos", formatPercentValue(resumo.tributos)], ["Valor do BDI", formatCurrency(resumo.valorBdi)], ["BDI calculado", formatPercentValue(resumo.bdi)]],
  });
  let y = doc.lastAutoTable.finalY + 12;
  grouped.forEach((group) => {
    if (!group.items.length) return;
    if (y > 226) { doc.addPage(); drawPageHeader(doc, "Composição analítica", logoDataUrl); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0, 120, 85);
    doc.text(`${group.grupo} • Total: ${formatPercentValue(group.total)}`, margin, y);
    autoTable(doc, {
      startY: y + 5,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.2, cellPadding: 2.2, lineColor: [220, 228, 236], lineWidth: 0.2 },
      headStyles: { fillColor: [7, 13, 18], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 38 }, 2: { halign: "right", cellWidth: 28 }, 3: { halign: "right" } },
      head: [["Descrição", "Tipo", "Percentual", "Impacto estimado"]],
      body: group.items.map((item) => [item.descricao, item.tipo === "numerador" ? "Numerador" : "Tributo", `${item.percentual}%`, formatCurrency(calculateImpact(item, resumo))]),
    });
    y = doc.lastAutoTable.finalY + 10;
  });
}

function addObservacoesPage(doc, observacoes, dadosGerais, logoDataUrl) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  doc.addPage();
  drawPageHeader(doc, "Premissas e observações", logoDataUrl);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 31, 45);
  doc.text("Observações técnicas", margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 88, 105);
  const obs = safeText(observacoes, "Sem observações técnicas adicionais.");
  doc.text(doc.splitTextToSize(obs, contentWidth), margin, 51);
  const noteY = 142;
  doc.setFillColor(244, 252, 248);
  doc.setDrawColor(185, 230, 210);
  doc.roundedRect(margin, noteY, contentWidth, 43, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 120, 85);
  doc.text("Nota de validação", margin + 5, noteY + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  doc.setTextColor(65, 78, 94);
  doc.text(doc.splitTextToSize("Este relatório foi gerado automaticamente pelo módulo Cálculo do BDI do sistema NERO. Os percentuais apresentados dependem dos parâmetros inseridos pelo usuário e devem ser validados conforme regime tributário, contrato, escopo, riscos, prazo e premissas comerciais da obra.", contentWidth - 10), margin + 5, noteY + 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 88, 105);
  doc.text(`Responsável: ${safeText(dadosGerais.responsavel, "NERO Construções")}`, margin, 210);
  doc.text(`Revisão: ${safeText(dadosGerais.revisao, "REV 00")}`, margin, 217);
  doc.text(`Data da revisão: ${safeText(dadosGerais.dataRevisao, new Date().toLocaleDateString("pt-BR"))}`, margin, 224);
  doc.text(`Observação da revisão: ${safeText(dadosGerais.observacaoRevisao, "-")}`, margin, 231);
}

async function buildPdf(composicao, observacoes, dadosGerais) {
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawCover(doc, composicao, dadosGerais, logoDataUrl);
  addResumoExecutivoPage(doc, composicao, dadosGerais, logoDataUrl);
  addMemoriaPage(doc, composicao, logoDataUrl);
  addObservacoesPage(doc, observacoes, dadosGerais, logoDataUrl);
  drawFooter(doc);
  doc.save(`nero-relatorio-bdi-${normalizeFileName(composicao?.nome)}.pdf`);
}

export default function BDIRelatorios() {
  const [composicoes, setComposicoes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [dadosGerais, setDadosGerais] = useState({ obra: "", cliente: "", local: "", revisao: "REV 00", responsavel: "NERO Construções", regime: "" });
  const [observacoes, setObservacoes] = useState("Composição preliminar para análise executiva. Validar alíquotas tributárias, regime fiscal, premissas comerciais e condições contratuais antes da emissão final.");

  async function carregarComposicoes() {
    setCarregando(true);
    try {
      const data = await listarComposicoesBDI();
      setComposicoes(data || []);
      if (data?.[0]?.id) setSelectedId(data[0].id);
    } catch (error) { console.error(error); }
    finally { setCarregando(false); }
  }

  async function gerarPdf() {
    if (!selecionada) return;
    setGerandoPdf(true);
    try { await buildPdf(selecionada, observacoes, dadosGerais); }
    catch (error) { console.error(error); alert("Não foi possível gerar o PDF. Verifique a logo /logo.png e tente novamente."); }
    finally { setGerandoPdf(false); }
  }

  useEffect(() => { carregarComposicoes(); }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return composicoes;
    return composicoes.filter((item) => String(item.nome || "").toLowerCase().includes(termo));
  }, [busca, composicoes]);

  const selecionada = useMemo(() => composicoes.find((item) => item.id === selectedId) || filtradas[0] || null, [composicoes, filtradas, selectedId]);

  function updateDados(field, value) { setDadosGerais((current) => ({ ...current, [field]: value })); }

  return (
    <div className="w-full min-h-[720px] overflow-x-hidden bg-[#080D12] p-6 xl:p-8">
      <div className="mx-auto w-full max-w-[1120px]">
        <header className="mb-7">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-black uppercase tracking-[0.28em] text-emerald-300"><FileText size={17} />Relatórios</div>
          <h1 className="text-[clamp(34px,3vw,52px)] font-black leading-tight text-white">Relatório Executivo de BDI</h1>
          <p className="mt-3 max-w-[820px] text-base xl:text-lg leading-relaxed text-slate-400">Gere relatórios executivos integrados ao Supabase com capa NERO, página 2 executiva, revisão, gráficos, memória de cálculo e observações técnicas.</p>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="mb-3 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.26em] text-slate-400"><Search size={16} />Buscar composição</span>
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Digite o nome da composição..." className="h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400" />
          </label>
          <div className="rounded-2xl border border-[#24344D] bg-[#111827] p-4"><span className="block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">Disponíveis</span><strong className="mt-3 block text-4xl font-black text-emerald-300">{composicoes.length}</strong><p className="mt-1 text-sm text-slate-400">composição(ões)</p></div>
          <button type="button" onClick={carregarComposicoes} className="rounded-2xl border border-[#24344D] bg-[#111827] p-4 text-white hover:bg-[#172033]"><span className="flex h-full items-center justify-center gap-3 font-black"><RefreshCcw size={18} />Atualizar</span></button>
        </section>

        {carregando ? (
          <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-8 text-center text-slate-300">Carregando composições...</div>
        ) : !selecionada ? (
          <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-8 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E293B] text-emerald-300"><ClipboardList size={32} /></div><h2 className="text-2xl font-black text-white">Nenhuma composição salva</h2><p className="mt-2 text-slate-400">Salve uma composição antes de gerar relatórios.</p></div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-6">
              <label className="block"><span className="mb-3 block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">Selecionar composição</span><select value={selecionada.id} onChange={(event) => setSelectedId(event.target.value)} className="h-[56px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400">{filtradas.map((item) => (<option key={item.id} value={item.id}>{item.nome}</option>))}</select></label>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Kpi title="BDI Total" value={formatPercentValue(selecionada.resumo?.bdi)} icon={TrendingUp} tone="text-emerald-300" />
                <Kpi title="Tributos" value={formatPercentValue(selecionada.resumo?.tributos)} icon={Landmark} tone="text-sky-300" />
                <Kpi title="Custo Direto" value={formatCurrency(selecionada.resumo?.custo)} icon={ClipboardList} tone="text-white" />
                <Kpi title="Preço Venda" value={formatCurrency(selecionada.resumo?.precoVenda)} icon={ShieldCheck} tone="text-yellow-300" />
              </div>
              <div className="mt-6 rounded-2xl border border-[#24344D] bg-[#080D12] p-5"><h2 className="flex items-center gap-3 text-xl font-black text-white"><BarChart3 size={22} className="text-emerald-300" />Prévia da composição</h2><div className="mt-5 space-y-4">{groupItems(selecionada.items).map((group) => (<div key={group.grupo} className="rounded-2xl border border-[#24344D] bg-[#111827] p-4"><div className="flex justify-between"><strong className="text-white">{group.grupo}</strong><span className="font-black text-emerald-300">{formatPercentValue(group.total)}</span></div><p className="mt-1 text-sm text-slate-400">{group.items.length} item(ns)</p></div>))}</div></div>
            </div>

            <aside className="rounded-3xl border border-[#24344D] bg-[#111827] p-6">
              <h2 className="text-2xl font-black text-white">Emissão do PDF</h2>
              <div className="mt-5 space-y-4">{[["obra", "Obra"], ["cliente", "Cliente"], ["local", "Local"], ["regime", "Regime / premissa"], ["revisao", "Revisão"], ["responsavel", "Responsável"]].map(([field, label]) => (<label key={field} className="block"><span className="mb-2 block text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</span><input value={dadosGerais[field]} onChange={(event) => updateDados(field, event.target.value)} className="h-[48px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400" /></label>))}</div>
              <label className="mt-5 block"><span className="mb-3 block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">Observações técnicas</span><textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} rows={8} className="w-full resize-none rounded-2xl border border-[#314465] bg-[#030816] p-4 text-sm leading-relaxed text-white outline-none focus:border-emerald-400" /></label>
              <button type="button" onClick={gerarPdf} disabled={gerandoPdf} className="mt-5 h-[58px] w-full rounded-xl bg-[#00D889] text-base font-black text-black hover:bg-[#00FF88] disabled:opacity-60"><span className="flex items-center justify-center gap-3"><Download size={20} />{gerandoPdf ? "Gerando PDF..." : "Gerar PDF executivo"}</span></button>
              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-100"><div className="flex gap-3"><Info size={18} className="mt-1 shrink-0" /><p>O PDF inclui capa com logo real do NERO, página 2 executiva, gráfico por grupo, memória de cálculo, tabelas e observações técnicas.</p></div></div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
