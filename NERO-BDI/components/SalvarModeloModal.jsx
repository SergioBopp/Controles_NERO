import React, { useState } from "react";
import { Save, X } from "lucide-react";

export default function SalvarModeloModal({ open, onClose, onSave, nomeBase }) {
  const [nome, setNome] = useState(nomeBase ? `${nomeBase} - Modelo` : "");
  const [categoria, setCategoria] = useState("Personalizado");
  const [descricao, setDescricao] = useState(
    "Modelo personalizado criado a partir de composição aprovada no NERO."
  );

  if (!open) return null;

  function handleSubmit() {
    if (!nome.trim()) {
      alert("Informe um nome para o modelo.");
      return;
    }

    onSave({ nome, categoria, descricao });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <div className="w-full max-w-[680px] rounded-3xl border border-[#24344D] bg-[#080D12] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-5">
          <div>
            <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
              <Save size={15} />
              Biblioteca técnica
            </div>

            <h2 className="text-3xl font-black text-white">
              Salvar como modelo
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Grave esta composição como um modelo reutilizável na Biblioteca de Modelos.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl border border-[#314465] bg-[#111827] text-slate-200 hover:bg-[#172033]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">
              Nome do modelo
            </span>
            <input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              className="h-[52px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
              placeholder="Ex.: BDI Industrial padrão NERO"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">
              Categoria
            </span>
            <input
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
              className="h-[52px] w-full rounded-xl border border-[#314465] bg-[#030816] px-4 text-white outline-none focus:border-emerald-400"
              placeholder="Ex.: Industrial, Hospitalar, Fotovoltaico..."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-black uppercase tracking-[0.22em] text-slate-400">
              Descrição
            </span>
            <textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-[#314465] bg-[#030816] p-4 text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-[50px] rounded-xl border border-[#314465] bg-[#111827] px-5 text-sm font-black text-slate-200 hover:bg-[#172033]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="h-[50px] rounded-xl bg-[#00D889] px-6 text-sm font-black text-black hover:bg-[#00FF88]"
          >
            Salvar modelo
          </button>
        </div>
      </div>
    </div>
  );
}
