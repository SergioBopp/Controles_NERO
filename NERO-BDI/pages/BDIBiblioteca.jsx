import React, { useEffect, useMemo, useState } from "react";
import {
  Database,
  FolderOpen,
  Search,
  Trash2,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Copy,
  RefreshCcw,
} from "lucide-react";

import {
  duplicarComposicaoBDI,
  excluirComposicaoBDI,
  listarComposicoesBDI,
  prepararComposicaoParaCarregar,
} from "../services/bdiService";

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

export default function BDIBiblioteca({ onAbrirComposicao }) {
  const [composicoes, setComposicoes] = useState([]);
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function carregarLista() {
    setCarregando(true);

    try {
      const data = await listarComposicoesBDI();
      setComposicoes(data);
    } catch (error) {
      console.error(error);
      setMensagem("Não foi possível carregar as composições.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarLista();
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return composicoes;

    return composicoes.filter((item) =>
      [
        item.nome,
        item.resumo?.bdi,
        item.resumo?.precoVenda,
        item.atualizadoEm,
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    );
  }, [composicoes, busca]);

  async function excluirComposicao(composicao) {
    await excluirComposicaoBDI(composicao.id, composicao.origem);
    setMensagem(`Composição excluída: ${composicao?.nome || "Sem nome"}`);
    carregarLista();
  }

  function carregarComposicao(composicao) {
    prepararComposicaoParaCarregar(composicao);
    setMensagem(`Composição preparada para carregamento: ${composicao.nome}`);
    if (typeof onAbrirComposicao === "function") {
      onAbrirComposicao();
    }
  }

  async function duplicarComposicao(composicao) {
    const duplicada = await duplicarComposicaoBDI(composicao);
    setMensagem(`Composição duplicada: ${duplicada.nome}`);
    carregarLista();
  }

  return (
    <div className="w-full min-h-[720px] overflow-x-hidden bg-[#080D12] p-6 xl:p-8">
      <div className="mx-auto w-full max-w-[1120px]">
        <header className="mb-7">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
            <Database size={17} />
            Biblioteca
          </div>

          <h1 className="text-[clamp(34px,3vw,52px)] font-black leading-tight text-white">
            Biblioteca de Composições
          </h1>

          <p className="mt-3 max-w-[780px] text-base xl:text-lg leading-relaxed text-slate-400">
            Consulte, carregue, duplique ou exclua composições de BDI salvas no Supabase. Se o banco estiver indisponível, o módulo usa fallback local.
          </p>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="mb-3 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">
              <Search size={16} />
              Buscar composição
            </span>
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Digite nome, BDI ou data..."
              className="h-[54px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
            />
          </label>

          <div className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="block text-[12px] font-black uppercase tracking-[0.26em] text-slate-400">
              Total salvo
            </span>
            <strong className="mt-3 block text-4xl font-black text-emerald-300">
              {composicoes.length}
            </strong>
            <p className="mt-1 text-sm text-slate-400">composição(ões)</p>
          </div>

          <button
            type="button"
            onClick={carregarLista}
            className="rounded-2xl border border-[#314465] bg-[#111827] p-4 text-base font-black text-white hover:bg-[#172033]"
          >
            <span className="flex h-full items-center justify-center gap-3">
              <RefreshCcw size={18} />
              Atualizar
            </span>
          </button>
        </section>

        {mensagem && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-200">
            {mensagem}
          </div>
        )}

        {carregando ? (
          <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-8 text-center text-slate-300">
            Carregando composições...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E293B] text-emerald-300">
              <FolderOpen size={32} />
            </div>

            <h2 className="text-2xl font-black text-white">
              Nenhuma composição encontrada
            </h2>

            <p className="mt-2 text-slate-400">
              Salve uma composição na aba Composição para ela aparecer aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {filtradas.map((composicao) => (
              <article
                key={composicao.id}
                className="rounded-3xl border border-[#24344D] bg-[#111827] p-5 xl:p-6"
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="break-words text-2xl font-black text-white">
                        {composicao.nome}
                      </h2>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                        {composicao.origem === "local" ? "Local" : "Supabase"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      Atualizada em {formatDate(composicao.atualizadoEm)}
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-[#24344D] bg-[#080D12] p-4">
                        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                          <TrendingUp size={15} />
                          BDI
                        </span>
                        <strong className="mt-2 block text-2xl font-black text-emerald-300">
                          {formatPercentValue(composicao.resumo?.bdi)}
                        </strong>
                      </div>

                      <div className="rounded-2xl border border-[#24344D] bg-[#080D12] p-4">
                        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                          <Landmark size={15} />
                          Tributos
                        </span>
                        <strong className="mt-2 block text-2xl font-black text-sky-300">
                          {formatPercentValue(composicao.resumo?.tributos)}
                        </strong>
                      </div>

                      <div className="rounded-2xl border border-[#24344D] bg-[#080D12] p-4">
                        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                          <ShieldCheck size={15} />
                          Venda
                        </span>
                        <strong
                          className="mt-2 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-black text-white"
                          title={formatCurrency(composicao.resumo?.precoVenda)}
                        >
                          {formatCurrency(composicao.resumo?.precoVenda)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:w-[190px]">
                    <button
                      type="button"
                      onClick={() => carregarComposicao(composicao)}
                      className="h-[50px] rounded-xl bg-[#00D889] px-4 text-sm font-black text-black hover:bg-[#00FF88]"
                    >
                      Carregar
                    </button>

                    <button
                      type="button"
                      onClick={() => duplicarComposicao(composicao)}
                      className="h-[50px] rounded-xl border border-[#314465] bg-[#142036] px-4 text-sm font-black text-white hover:bg-[#1E293B]"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Copy size={16} />
                        Duplicar
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => excluirComposicao(composicao)}
                      className="h-[50px] rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-black text-red-200 hover:bg-red-500/20"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Trash2 size={16} />
                        Excluir
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
