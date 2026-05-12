import React, { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Landmark,
  Save,
  FolderOpen,
} from "lucide-react";

import {
  consumirComposicaoParaCarregar,
  salvarComposicaoBDI,
} from "../services/bdiService";

const DEFAULT_ITEMS = [
  { id: "di-1", grupo: "Despesas Indiretas", descricao: "Administração Central", tipo: "numerador", percentual: "5,00" },
  { id: "di-2", grupo: "Despesas Indiretas", descricao: "Administração Local", tipo: "numerador", percentual: "3,00" },
  { id: "di-3", grupo: "Despesas Indiretas", descricao: "Mobilização / Desmobilização", tipo: "numerador", percentual: "1,20" },
  { id: "di-4", grupo: "Despesas Indiretas", descricao: "Engenharia / Gestão Técnica", tipo: "numerador", percentual: "1,50" },
  { id: "rg-1", grupo: "Riscos e Garantias", descricao: "Seguro", tipo: "numerador", percentual: "0,80" },
  { id: "rg-2", grupo: "Riscos e Garantias", descricao: "Garantias", tipo: "numerador", percentual: "0,70" },
  { id: "rg-3", grupo: "Riscos e Garantias", descricao: "Risco / Contingência", tipo: "numerador", percentual: "2,50" },
  { id: "lu-1", grupo: "Resultado", descricao: "Lucro", tipo: "numerador", percentual: "8,00" },
  { id: "tr-1", grupo: "Tributos", descricao: "PIS", tipo: "denominador", percentual: "0,65" },
  { id: "tr-2", grupo: "Tributos", descricao: "COFINS", tipo: "denominador", percentual: "3,00" },
  { id: "tr-3", grupo: "Tributos", descricao: "ISS", tipo: "denominador", percentual: "5,00" },
  { id: "tr-4", grupo: "Tributos", descricao: "CPRB / INSS", tipo: "denominador", percentual: "4,50" },
];

const GROUP_STYLES = {
  "Despesas Indiretas": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Riscos e Garantias": "border-orange-500/30 bg-orange-500/10 text-orange-300",
  Resultado: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  Tributos: "border-sky-500/30 bg-sky-500/10 text-sky-300",
};

function parsePercent(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function formatPercentInput(value) {
  const number = parsePercent(value);
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentValue(value) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "%";
}

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizePercentTyping(value) {
  let cleaned = String(value).replace(/[^\d,.]/g, "");
  const firstComma = cleaned.search(/[,.]/);
  if (firstComma >= 0) {
    const before = cleaned.slice(0, firstComma);
    const after = cleaned.slice(firstComma + 1).replace(/[,.]/g, "");
    cleaned = `${before},${after.slice(0, 2)}`;
  }
  return cleaned;
}

function KpiCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#24344D] bg-[#111827] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-black uppercase tracking-[0.28em] text-slate-400">
            {title}
          </p>
          <div
            className={[
              "mt-3 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(24px,2.1vw,36px)] font-black leading-none",
              tone,
            ].join(" ")}
            title={String(value)}
          >
            {value}
          </div>
          <p className="mt-3 text-sm text-slate-400 leading-snug">{subtitle}</p>
        </div>

        <div className="shrink-0 rounded-2xl bg-[#1E293B] p-3">
          <Icon size={23} className={tone} />
        </div>
      </div>
    </div>
  );
}

export default function BDIComposicao() {
  const [registroId, setRegistroId] = useState(null);
  const [origem, setOrigem] = useState(null);
  const [nomeComposicao, setNomeComposicao] = useState("Composição padrão");
  const [custoDireto, setCustoDireto] = useState("1000000");
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novoItem, setNovoItem] = useState({
    descricao: "",
    grupo: "Despesas Indiretas",
    tipo: "numerador",
    percentual: "0,00",
  });

  useEffect(() => {
    const composicao = consumirComposicaoParaCarregar();

    if (composicao?.items?.length) {
      setRegistroId(composicao.id || null);
      setOrigem(composicao.origem || null);
      setNomeComposicao(composicao.nome || "Composição carregada");
      setCustoDireto(String(composicao.custoDireto || composicao.resumo?.custo || "1000000"));
      setItems(composicao.items);
      setMensagem(`Composição carregada: ${composicao.nome || "Sem nome"}`);
    }
  }, []);

  const calculo = useMemo(() => {
    const numerador = items
      .filter((item) => item.tipo === "numerador")
      .reduce((acc, item) => acc + parsePercent(item.percentual), 0);

    const tributos = items
      .filter((item) => item.tipo === "denominador")
      .reduce((acc, item) => acc + parsePercent(item.percentual), 0);

    const denominador = Math.max(0.0001, 1 - tributos / 100);
    const bdi = ((1 + numerador / 100) / denominador - 1) * 100;
    const custo = Math.max(0, Number(String(custoDireto).replace(/[^\d]/g, "")) || 0);
    const valorBdi = custo * (bdi / 100);
    const precoVenda = custo + valorBdi;

    return { numerador, tributos, bdi, custo, valorBdi, precoVenda };
  }, [items, custoDireto]);

  const groupedItems = useMemo(() => {
    return ["Despesas Indiretas", "Riscos e Garantias", "Resultado", "Tributos"].map((grupo) => ({
      grupo,
      total: items
        .filter((item) => item.grupo === grupo)
        .reduce((acc, item) => acc + parsePercent(item.percentual), 0),
      items: items.filter((item) => item.grupo === grupo),
    }));
  }, [items]);

  function updateItem(id, value) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, percentual: normalizePercentTyping(value) }
          : item
      )
    );
  }

  function blurItem(id) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, percentual: formatPercentInput(item.percentual) }
          : item
      )
    );
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function addItem() {
    if (!novoItem.descricao.trim()) {
      setMensagem("Informe a descrição do novo item.");
      return;
    }

    setItems((current) => [
      ...current,
      {
        id: `item-${Date.now()}`,
        descricao: novoItem.descricao.trim(),
        grupo: novoItem.grupo,
        tipo: novoItem.tipo,
        percentual: formatPercentInput(novoItem.percentual),
      },
    ]);

    setNovoItem({
      descricao: "",
      grupo: "Despesas Indiretas",
      tipo: "numerador",
      percentual: "0,00",
    });
    setMensagem("Item adicionado à composição.");
  }

  async function salvarComposicao() {
    const nome = nomeComposicao.trim();
    if (!nome) {
      setMensagem("Informe um nome para salvar a composição.");
      return;
    }

    setSalvando(true);

    try {
      const salvo = await salvarComposicaoBDI({
        id: registroId,
        origem,
        nome,
        custoDireto,
        items,
        resumo: {
          numerador: calculo.numerador,
          tributos: calculo.tributos,
          bdi: calculo.bdi,
          custo: calculo.custo,
          valorBdi: calculo.valorBdi,
          precoVenda: calculo.precoVenda,
        },
      });

      setRegistroId(salvo?.id || null);
      setOrigem(salvo?.origem || "supabase");
      setMensagem(`Composição salva: ${salvo?.nome || nome} (${salvo?.origem === "local" ? "local" : "Supabase"})`);
    } catch (error) {
      console.error(error);
      setMensagem("Não foi possível salvar a composição. Verifique o Supabase.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="w-full min-h-[720px] overflow-x-hidden bg-[#080D12] p-6 xl:p-8">
      <div className="mx-auto w-full max-w-[1120px]">
        <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
              <Calculator size={17} />
              Cálculo do BDI
            </div>

            <h1 className="text-[clamp(34px,3vw,52px)] font-black leading-tight text-white">
              Composição do BDI
            </h1>

            <p className="mt-3 max-w-[760px] text-base xl:text-lg leading-relaxed text-slate-400">
              Monte a composição analítica com despesas indiretas, riscos,
              garantias, lucro e tributos. O BDI e o preço de venda são
              recalculados automaticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setRegistroId(null);
              setOrigem(null);
              setItems(DEFAULT_ITEMS);
              setCustoDireto("1000000");
              setNomeComposicao("Composição padrão");
              setMensagem("Modelo padrão restaurado.");
            }}
            className="h-[62px] shrink-0 rounded-2xl border border-[#314465] bg-[#111827] px-6 text-base font-black text-white hover:bg-[#172033]"
          >
            <span className="flex items-center justify-center gap-3">
              <RotateCcw size={18} />
              Restaurar modelo
            </span>
          </button>
        </header>

        <section className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">
              Nome da composição
            </span>
            <input
              value={nomeComposicao}
              onChange={(event) => setNomeComposicao(event.target.value)}
              className="mt-3 h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-lg font-black text-white outline-none focus:border-emerald-400"
              placeholder="Ex.: BDI Industrial - CREMEB"
            />
          </label>

          <button
            type="button"
            onClick={salvarComposicao}
            disabled={salvando}
            className="h-full min-h-[96px] rounded-2xl bg-[#00D889] px-5 text-base font-black text-black hover:bg-[#00FF88] disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-3">
              <Save size={20} />
              {salvando ? "Salvando..." : "Salvar composição"}
            </span>
          </button>
        </section>

        {mensagem && (
          <div className="mb-7 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-200">
            {mensagem}
          </div>
        )}

        <section className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <KpiCard
            title="BDI Total"
            value={formatPercentValue(calculo.bdi)}
            subtitle="Resultado pela fórmula composta"
            icon={TrendingUp}
            tone="text-emerald-300"
          />
          <KpiCard
            title="Tributos"
            value={formatPercentValue(calculo.tributos)}
            subtitle="Somatório no denominador"
            icon={Landmark}
            tone="text-sky-300"
          />
          <KpiCard
            title="Valor do BDI"
            value={formatCurrency(calculo.valorBdi)}
            subtitle="Diferença sobre o custo direto"
            icon={TrendingUp}
            tone="text-yellow-300"
          />
          <KpiCard
            title="Preço de venda"
            value={formatCurrency(calculo.precoVenda)}
            subtitle="Custo direto + BDI"
            icon={ShieldCheck}
            tone="text-white"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.9fr)]">
          <div className="min-w-0 rounded-3xl border border-[#24344D] bg-[#111827] p-5 xl:p-6">
            <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <h2 className="text-3xl font-black text-white">Memória de cálculo</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Fórmula: BDI = ((1 + parcelas do numerador) / (1 - tributos) - 1) × 100
                </p>
              </div>

              <label className="rounded-2xl border border-[#24344D] bg-[#080D12] p-4">
                <span className="block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">
                  Custo direto
                </span>
                <input
                  value={custoDireto}
                  onChange={(event) =>
                    setCustoDireto(event.target.value.replace(/[^\d]/g, ""))
                  }
                  className="mt-3 h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-right text-xl font-black text-white outline-none focus:border-emerald-400"
                  inputMode="numeric"
                />
              </label>
            </div>

            <div className="space-y-4">
              {groupedItems.map((group) => (
                <div
                  key={group.grupo}
                  className="overflow-hidden rounded-2xl border border-[#24344D] bg-[#080D12]"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[#24344D] px-5 py-4">
                    <span
                      className={[
                        "rounded-full border px-4 py-1 text-[11px] font-black uppercase tracking-[0.24em]",
                        GROUP_STYLES[group.grupo],
                      ].join(" ")}
                    >
                      {group.grupo}
                    </span>
                    <span className="shrink-0 text-sm font-black text-white">
                      Total: {formatPercentValue(group.total)}
                    </span>
                  </div>

                  <div>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[minmax(0,1fr)_150px_48px] items-center gap-4 border-b border-[#1F2937] px-5 py-4 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-white">
                            {item.descricao}
                          </p>
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                            {item.tipo === "numerador"
                              ? "Parcela do numerador"
                              : "Tributo / denominador"}
                          </p>
                        </div>

                        <div className="flex h-[50px] min-w-0 items-center rounded-xl border border-[#314465] bg-[#030816] px-3 focus-within:border-emerald-400">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.percentual}
                            onChange={(event) => updateItem(item.id, event.target.value)}
                            onBlur={() => blurItem(item.id)}
                            className="min-w-0 flex-1 bg-transparent text-right text-lg font-black text-white outline-none"
                          />
                          <span className="ml-2 shrink-0 text-slate-500">%</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-[#24344D] bg-[#142036] text-slate-400 hover:text-red-300"
                          aria-label={`Remover ${item.descricao}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="min-w-0 space-y-5">
            <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-5 xl:p-6">
              <h2 className="mb-5 flex items-center gap-3 text-2xl font-black text-white">
                <Plus size={24} className="text-emerald-300" />
                Novo item
              </h2>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Descrição
                  </span>
                  <input
                    value={novoItem.descricao}
                    onChange={(event) =>
                      setNovoItem((current) => ({
                        ...current,
                        descricao: event.target.value,
                      }))
                    }
                    placeholder="Ex.: Licenças / taxas"
                    className="h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Grupo
                  </span>
                  <select
                    value={novoItem.grupo}
                    onChange={(event) =>
                      setNovoItem((current) => ({
                        ...current,
                        grupo: event.target.value,
                      }))
                    }
                    className="h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
                  >
                    <option>Despesas Indiretas</option>
                    <option>Riscos e Garantias</option>
                    <option>Resultado</option>
                    <option>Tributos</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Tipo de cálculo
                  </span>
                  <select
                    value={novoItem.tipo}
                    onChange={(event) =>
                      setNovoItem((current) => ({
                        ...current,
                        tipo: event.target.value,
                      }))
                    }
                    className="h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="numerador">Parcela do numerador</option>
                    <option value="denominador">Tributo / denominador</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Percentual
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={novoItem.percentual}
                    onChange={(event) =>
                      setNovoItem((current) => ({
                        ...current,
                        percentual: normalizePercentTyping(event.target.value),
                      }))
                    }
                    onBlur={() =>
                      setNovoItem((current) => ({
                        ...current,
                        percentual: formatPercentInput(current.percentual),
                      }))
                    }
                    className="h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-right text-lg font-black text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <button
                  type="button"
                  onClick={addItem}
                  className="h-[56px] w-full rounded-xl bg-[#00D889] text-base font-black text-black hover:bg-[#00FF88]"
                >
                  + Adicionar item
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 xl:p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-black">
                <ShieldCheck size={24} />
              </div>

              <h2 className="text-xl font-black text-emerald-100">
                Resumo técnico
              </h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-300">Parcelas do numerador</span>
                  <strong className="text-white">{formatPercentValue(calculo.numerador)}</strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-300">Tributos</span>
                  <strong className="text-white">{formatPercentValue(calculo.tributos)}</strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-300">Custo direto</span>
                  <strong className="text-white">{formatCurrency(calculo.custo)}</strong>
                </div>

                <div className="flex justify-between gap-4 border-t border-emerald-400/20 pt-3">
                  <span className="text-emerald-100">BDI calculado</span>
                  <strong className="text-emerald-200">{formatPercentValue(calculo.bdi)}</strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-300">Preço de venda</span>
                  <strong className="text-white">{formatCurrency(calculo.precoVenda)}</strong>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#24344D] bg-[#080D12] p-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <FolderOpen size={18} className="mt-1 shrink-0 text-emerald-300" />
                  <p>
                    As composições salvas ficam disponíveis na aba Biblioteca. Quando o Supabase estiver ativo, os dados ficam no banco; caso contrário, o módulo usa fallback local.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
