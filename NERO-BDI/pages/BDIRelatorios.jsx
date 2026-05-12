import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Download,
  Search,
  ClipboardList,
  Landmark,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STORAGE_KEY = "nero_bdi_composicoes_v1";

function readSavedCompositions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parsePercent(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
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

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
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

function Kpi({ title, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-[#24344D] bg-[#111827] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-400">
            {title}
          </p>
          <strong
            className={`mt-3 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-3xl font-black ${tone}`}
            title={String(value)}
          >
            {value}
          </strong>
        </div>
        <div className="shrink-0 rounded-2xl bg-[#1E293B] p-3">
          <Icon size={22} className={tone} />
        </div>
      </div>
    </div>
  );
}

function buildPdf(composicao, observacoes) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const resumo = composicao?.resumo || {};
  const items = composicao?.items || [];
  const grouped = groupItems(items);

  function footer() {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(0, 120, 85);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(95, 105, 125);
      doc.text("NERO Construções • Cálculo do BDI", margin, pageHeight - 8);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  }

  doc.setFillColor(0, 91, 67);
  doc.rect(0, 0, pageWidth, 34, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Relatório Executivo", margin, 16);
  doc.setFontSize(13);
  doc.text("Composição do BDI", margin, 25);

  doc.setTextColor(10, 20, 40);
  doc.setFontSize(18);
  doc.text(composicao?.nome || "Composição sem nome", margin, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 120);
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, margin, 55);
  doc.text(`Registro atualizado em: ${formatDate(composicao?.atualizadoEm)}`, margin, 61);

  autoTable(doc, {
    startY: 72,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 3,
      lineColor: [210, 218, 230],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [0, 91, 67],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    head: [["Indicador", "Valor"]],
    body: [
      ["BDI Total", formatPercentValue(resumo.bdi)],
      ["Parcelas do numerador", formatPercentValue(resumo.numerador)],
      ["Tributos", formatPercentValue(resumo.tributos)],
      ["Custo direto", formatCurrency(resumo.custo)],
      ["Valor do BDI", formatCurrency(resumo.valorBdi)],
      ["Preço de venda", formatCurrency(resumo.precoVenda)],
    ],
  });

  let y = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(10, 20, 40);
  doc.text("Memória de cálculo", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 90, 110);
  doc.text(
    "BDI = ((1 + parcelas do numerador) / (1 - tributos) - 1) × 100",
    margin,
    y + 7
  );

  y += 15;

  grouped.forEach((group) => {
    if (!group.items.length) return;

    if (y > 235) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 91, 67);
    doc.text(`${group.grupo} • Total: ${formatPercentValue(group.total)}`, margin, y);

    autoTable(doc, {
      startY: y + 4,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 2.6,
        lineColor: [218, 225, 235],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      head: [["Descrição", "Tipo", "Percentual"]],
      body: group.items.map((item) => [
        item.descricao,
        item.tipo === "numerador" ? "Numerador" : "Tributo / denominador",
        `${item.percentual}%`,
      ]),
    });

    y = doc.lastAutoTable.finalY + 9;
  });

  doc.addPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(10, 20, 40);
  doc.text("Observações técnicas", margin, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 90, 110);

  const textoObs = observacoes?.trim()
    ? observacoes.trim()
    : "Sem observações técnicas adicionais registradas.";

  const split = doc.splitTextToSize(textoObs, pageWidth - margin * 2);
  doc.text(split, margin, 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 91, 67);
  doc.text("Notas", margin, 95);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 110);
  doc.text(
    doc.splitTextToSize(
      "Este relatório foi gerado automaticamente pelo módulo Cálculo do BDI do sistema NERO Construções. Os percentuais apresentados dependem dos parâmetros inseridos pelo usuário e devem ser validados conforme o regime tributário, contrato, escopo e premissas comerciais da obra.",
      pageWidth - margin * 2
    ),
    margin,
    103
  );

  footer();

  const safeName = (composicao?.nome || "composicao-bdi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  doc.save(`relatorio-bdi-${safeName}.pdf`);
}

export default function BDIRelatorios() {
  const [composicoes, setComposicoes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [busca, setBusca] = useState("");
  const [observacoes, setObservacoes] = useState(
    "Composição preliminar de BDI para análise executiva. Validar alíquotas tributárias, premissas comerciais e condições contratuais antes da emissão final."
  );

  useEffect(() => {
    const saved = readSavedCompositions();
    setComposicoes(saved);
    if (saved[0]?.id) setSelectedId(saved[0].id);
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return composicoes;

    return composicoes.filter((item) =>
      [item.nome, item.atualizadoEm].join(" ").toLowerCase().includes(termo)
    );
  }, [composicoes, busca]);

  const selecionada = useMemo(() => {
    return composicoes.find((item) => item.id === selectedId) || filtradas[0] || null;
  }, [composicoes, selectedId, filtradas]);

  return (
    <div className="w-full min-h-[720px] overflow-x-hidden bg-[#080D12] p-6 xl:p-8">
      <div className="mx-auto w-full max-w-[1120px]">
        <header className="mb-7">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
            <FileText size={17} />
            Relatórios
          </div>

          <h1 className="text-[clamp(34px,3vw,52px)] font-black leading-tight text-white">
            Relatório Executivo de BDI
          </h1>

          <p className="mt-3 max-w-[820px] text-base xl:text-lg leading-relaxed text-slate-400">
            Gere uma memória de cálculo em PDF com resumo executivo, composição
            analítica, totais por grupo e observações técnicas.
          </p>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <label className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="mb-3 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">
              <Search size={16} />
              Buscar composição
            </span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Digite o nome da composição..."
              className="h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
            />
          </label>

          <div className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">
              Disponíveis
            </span>
            <strong className="mt-3 block text-4xl font-black text-emerald-300">
              {composicoes.length}
            </strong>
            <p className="mt-1 text-sm text-slate-400">composição(ões)</p>
          </div>
        </section>

        {!selecionada ? (
          <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E293B] text-emerald-300">
              <ClipboardList size={32} />
            </div>

            <h2 className="text-2xl font-black text-white">
              Nenhuma composição salva
            </h2>

            <p className="mt-2 text-slate-400">
              Salve uma composição antes de gerar o relatório executivo.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-5 xl:p-6">
              <label className="block">
                <span className="mb-3 block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">
                  Selecionar composição
                </span>
                <select
                  value={selecionada.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="h-[56px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
                >
                  {filtradas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Kpi
                  title="BDI Total"
                  value={formatPercentValue(selecionada.resumo?.bdi)}
                  icon={TrendingUp}
                  tone="text-emerald-300"
                />
                <Kpi
                  title="Tributos"
                  value={formatPercentValue(selecionada.resumo?.tributos)}
                  icon={Landmark}
                  tone="text-sky-300"
                />
                <Kpi
                  title="Custo direto"
                  value={formatCurrency(selecionada.resumo?.custo)}
                  icon={ClipboardList}
                  tone="text-white"
                />
                <Kpi
                  title="Preço de venda"
                  value={formatCurrency(selecionada.resumo?.precoVenda)}
                  icon={ShieldCheck}
                  tone="text-yellow-300"
                />
              </div>

              <div className="mt-6 rounded-2xl border border-[#24344D] bg-[#080D12] p-5">
                <h2 className="text-xl font-black text-white">
                  Prévia da composição
                </h2>

                <div className="mt-5 space-y-4">
                  {groupItems(selecionada.items).map((group) => (
                    <div
                      key={group.grupo}
                      className="rounded-2xl border border-[#24344D] bg-[#111827] p-4"
                    >
                      <div className="flex justify-between gap-4">
                        <strong className="text-white">{group.grupo}</strong>
                        <span className="font-black text-emerald-300">
                          {formatPercentValue(group.total)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {group.items.length} item(ns)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-[#24344D] bg-[#111827] p-5 xl:p-6">
              <h2 className="text-2xl font-black text-white">
                Emissão do PDF
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Inclua observações técnicas antes de emitir a memória de cálculo.
              </p>

              <label className="mt-5 block">
                <span className="mb-3 block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">
                  Observações técnicas
                </span>
                <textarea
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                  rows={9}
                  className="w-full resize-none rounded-2xl border border-[#314465] bg-[#030816] p-4 text-sm leading-relaxed text-white outline-none focus:border-emerald-400"
                />
              </label>

              <button
                type="button"
                onClick={() => buildPdf(selecionada, observacoes)}
                className="mt-5 h-[58px] w-full rounded-xl bg-[#00D889] text-base font-black text-black hover:bg-[#00FF88]"
              >
                <span className="flex items-center justify-center gap-3">
                  <Download size={20} />
                  Gerar PDF executivo
                </span>
              </button>

              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-100">
                O PDF contém resumo, fórmula, grupos de composição, memória de
                cálculo e observações técnicas.
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
