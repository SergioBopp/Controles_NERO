import React, { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  ArrowRight,
  Star,
  Copy,
  Trash2,
  History,
} from "lucide-react";

import {
  isFavoritoBDI,
  toggleFavoritoBDI,
} from "../services/bdiFavoritesService";

import {
  duplicarModeloBDI,
  excluirModeloPersonalizadoBDI,
} from "../services/bdiTemplateLibraryService";

import {
  obterHistoricoRevisoesBDI,
  registrarNovaRevisaoBDI,
} from "../services/bdiRevisionService";

export default function BDITemplateCard({
  template,
  onUse,
  onRefresh,
}) {
  const [favorito, setFavorito] = useState(false);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    setFavorito(isFavoritoBDI(template?.id));
    setHistorico(obterHistoricoRevisoesBDI(template?.id));
  }, [template?.id]);

  const isPersonalizado = template?.origem === "personalizado";

  const ultimaRevisao = useMemo(() => {
    if (!historico.length) return "REV 00";

    return historico[historico.length - 1]?.revisao || "REV 00";
  }, [historico]);

  const bdi = Number(template?.resumo?.bdi || 0).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

  const precoVenda = Number(
    template?.resumo?.precoVenda || 0
  ).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function handleToggleFavorito() {
    const status = toggleFavoritoBDI(template?.id);
    setFavorito(status);
  }

  function handleDuplicar() {
    duplicarModeloBDI(template);

    if (typeof onRefresh === "function") {
      onRefresh();
    }

    alert("Modelo duplicado com sucesso.");
  }

  function handleExcluir() {
    if (!isPersonalizado) return;

    const confirmar = window.confirm(
      `Deseja excluir o modelo personalizado "${template?.nome || "Modelo"}"?`
    );

    if (!confirmar) return;

    excluirModeloPersonalizadoBDI(template?.id);

    if (typeof onRefresh === "function") {
      onRefresh();
    }
  }

  function handleNovaRevisao() {
    registrarNovaRevisaoBDI(template);

    setHistorico(obterHistoricoRevisoesBDI(template?.id));

    alert("Nova revisão registrada.");
  }

  return (
    <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            <FileSpreadsheet size={14} />
            {isPersonalizado ? "Personalizado" : template?.categoria || "Modelo"}
          </div>

          <h2 className="text-2xl font-black text-white">
            {template?.nome || "Modelo BDI"}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {template?.descricao || "Modelo técnico de composição de BDI."}
          </p>
        </div>

        <div className="rounded-2xl border border-[#314465] bg-[#0B1220] px-4 py-3 text-center">
          <span className="block text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Revisão
          </span>

          <strong className="mt-1 block text-lg font-black text-emerald-300">
            {ultimaRevisao}
          </strong>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#0B1220] p-4">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
            BDI
          </span>

          <strong className="mt-2 block text-2xl font-black text-emerald-300">
            {bdi}%
          </strong>
        </div>

        <div className="rounded-2xl bg-[#0B1220] p-4">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Venda
          </span>

          <strong className="mt-2 block text-lg font-black text-white">
            {precoVenda}
          </strong>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={handleToggleFavorito}
          className={[
            "flex h-[46px] w-full items-center justify-center gap-3 rounded-2xl border text-sm font-black transition-all",
            favorito
              ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
              : "border-[#314465] bg-[#172033] text-slate-300 hover:bg-[#1E293B]",
          ].join(" ")}
        >
          <Star size={16} fill={favorito ? "currentColor" : "none"} />

          {favorito ? "Favorito" : "Adicionar aos favoritos"}
        </button>

        <button
          type="button"
          onClick={handleNovaRevisao}
          className="flex h-[46px] w-full items-center justify-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 text-sm font-black text-violet-200 hover:bg-violet-500/20"
        >
          <History size={16} />
          Nova revisão
        </button>

        <button
          type="button"
          onClick={handleDuplicar}
          className="flex h-[46px] w-full items-center justify-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sm font-black text-sky-300 hover:bg-sky-500/20"
        >
          <Copy size={16} />
          Duplicar modelo
        </button>

        {isPersonalizado && (
          <button
            type="button"
            onClick={handleExcluir}
            className="flex h-[46px] w-full items-center justify-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 text-sm font-black text-red-200 hover:bg-red-500/20"
          >
            <Trash2 size={16} />
            Excluir personalizado
          </button>
        )}

        <button
          type="button"
          onClick={() => onUse(template)}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-[#00D889] text-sm font-black text-black hover:bg-[#00FF88]"
        >
          <ArrowRight size={16} />
          Usar modelo
        </button>
      </div>

      {historico.length > 0 && (
        <div className="mt-5 rounded-2xl border border-[#24344D] bg-[#0B1220] p-4">
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-slate-400">
            Histórico de revisões
          </h3>

          <div className="space-y-2">
            {[...historico]
              .reverse()
              .slice(0, 3)
              .map((item, index) => (
                <div
                  key={`${item.revisao}-${index}`}
                  className="rounded-xl border border-[#1E293B] bg-[#080D12] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-emerald-300">
                      {item.revisao}
                    </strong>

                    <span className="text-xs text-slate-500">
                      {item.data}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    {item.observacao}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
