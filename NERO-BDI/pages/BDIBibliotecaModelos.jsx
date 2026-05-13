import React, {
  useMemo,
  useState,
} from "react";

import {
  Layers3,
  Search,
  Filter,
} from "lucide-react";

import { bdiTemplates } from "../data/bdiTemplates";
import BDITemplateCard from "../components/BDITemplateCard";

import { aplicarTemplateBDI } from "../services/bdiTemplateService";

import { listarFavoritosBDI } from "../services/bdiFavoritesService";

import { listarModelosPersonalizadosBDI } from "../services/bdiTemplateLibraryService";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function BDIBibliotecaModelos({
  onAbrirComposicao,
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [reloadKey, setReloadKey] = useState(0);

  const todosModelos = useMemo(() => {
    return [
      ...listarModelosPersonalizadosBDI(),
      ...bdiTemplates,
    ];
  }, [reloadKey]);

  const categorias = useMemo(() => {
    const unique = new Set(
      todosModelos
        .map((template) => template.categoria)
        .filter(Boolean)
    );

    return [
      "Todas",
      ...Array.from(unique).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    ];
  }, [todosModelos]);

  const modelosFiltrados = useMemo(() => {
    const favoritos = listarFavoritosBDI();
    const termo = normalizeText(busca);

    return [...todosModelos]
      .filter((template) => {
        const categoriaOk =
          categoria === "Todas" ||
          template.categoria === categoria;

        const textoBusca = normalizeText(
          [
            template.nome,
            template.categoria,
            template.descricao,
          ].join(" ")
        );

        const buscaOk =
          !termo || textoBusca.includes(termo);

        return categoriaOk && buscaOk;
      })
      .sort((a, b) => {
        const aFav = favoritos.includes(a.id);
        const bFav = favoritos.includes(b.id);

        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;

        if (a.origem === "personalizado" && b.origem !== "personalizado") return -1;
        if (a.origem !== "personalizado" && b.origem === "personalizado") return 1;

        return String(a.nome || "").localeCompare(
          String(b.nome || ""),
          "pt-BR"
        );
      });
  }, [todosModelos, busca, categoria]);

  function handleUseTemplate(template) {
    const composicao =
      aplicarTemplateBDI(template);

    localStorage.setItem(
      "nero_bdi_composicao_para_carregar_v1",
      JSON.stringify(composicao)
    );

    if (
      typeof onAbrirComposicao === "function"
    ) {
      onAbrirComposicao();
      return;
    }

    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-[#080D12] p-6 xl:p-8">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-8">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
            <Layers3 size={17} />
            Biblioteca Técnica
          </div>

          <h1 className="text-[clamp(34px,3vw,52px)] font-black text-white">
            Modelos de BDI
          </h1>

          <p className="mt-3 max-w-[900px] text-lg leading-relaxed text-slate-400">
            Biblioteca corporativa de modelos técnicos para composição de BDI.
            Modelos personalizados podem ser duplicados, favoritados e excluídos.
          </p>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px_160px]">
          <label className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="mb-3 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">
              <Search size={16} />
              Buscar modelo
            </span>

            <input
              value={busca}
              onChange={(event) =>
                setBusca(event.target.value)
              }
              placeholder="Digite nome ou categoria..."
              className="h-[52px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
            />
          </label>

          <label className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="mb-3 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">
              <Filter size={16} />
              Categoria
            </span>

            <select
              value={categoria}
              onChange={(event) =>
                setCategoria(event.target.value)
              }
              className="h-[52px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
            >
              {categorias.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-[#24344D] bg-[#111827] p-4">
            <span className="block text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">
              Encontrados
            </span>

            <strong className="mt-3 block text-4xl font-black text-emerald-300">
              {modelosFiltrados.length}
            </strong>

            <p className="mt-1 text-sm text-slate-400">
              modelo(s)
            </p>
          </div>
        </section>

        {modelosFiltrados.length === 0 ? (
          <div className="rounded-3xl border border-[#24344D] bg-[#111827] p-8 text-center">
            <h2 className="text-2xl font-black text-white">
              Nenhum modelo encontrado
            </h2>

            <p className="mt-2 text-slate-400">
              Ajuste a busca ou selecione outra categoria.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {modelosFiltrados.map((template) => (
              <BDITemplateCard
                key={template.id}
                template={template}
                onUse={handleUseTemplate}
                onRefresh={() =>
                  setReloadKey((prev) => prev + 1)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
