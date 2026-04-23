import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../supabase";

export default function ResetObraButton({
  obraId,
  obraNome,
  onSuccess,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const disabled = useMemo(() => !obraId || loading, [obraId, loading]);
  const canConfirm = useMemo(
    () => confirmText.trim().toUpperCase() === "REINICIAR",
    [confirmText]
  );

  function handleOpen() {
    if (!obraId) return;
    setError("");
    setConfirmText("");
    setOpen(true);
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
    setError("");
    setConfirmText("");
  }

  async function handleReset() {
    if (!obraId) {
      setError("Selecione uma obra antes de reiniciar.");
      return;
    }

    if (!canConfirm) {
      setError('Digite REINICIAR para confirmar.');
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: medicoesError } = await supabase
        .from("plan_medicoes_itens")
        .delete()
        .eq("obra_id", obraId);
      if (medicoesError) throw medicoesError;

      const { error: cronogramaError } = await supabase
        .from("plan_cronograma_itens")
        .delete()
        .eq("obra_id", obraId);

      if (
        cronogramaError &&
        !String(cronogramaError.message || "")
          .toLowerCase()
          .includes("does not exist")
      ) {
        throw cronogramaError;
      }

      const { error: periodosError } = await supabase
        .from("plan_periodos_medicao")
        .delete()
        .eq("obra_id", obraId);
      if (periodosError) throw periodosError;

      const { error: eapError } = await supabase
        .from("plan_eap_itens")
        .delete()
        .eq("obra_id", obraId);
      if (eapError) throw eapError;

      handleClose();

      if (typeof onSuccess === "function") {
        await onSuccess();
      }
    } catch (err) {
      console.error("Erro ao reiniciar obra:", err);
      setError(err?.message || "Erro ao reiniciar a obra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <RotateCcw className="h-4 w-4" />
        Reiniciar obra
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-200">
                    <ShieldAlert className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      Ação crítica do sistema
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      Reiniciar obra
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Esta ação zera os dados operacionais da obra selecionada
                      para um novo início de planejamento e medição.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Obra selecionada
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {obraNome || "Obra não identificada"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    O cadastro da obra será preservado. Serão removidos apenas os
                    dados vinculados ao planejamento e ao acompanhamento.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                        Impacto da ação
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
                        <li>• Remove itens da EAP</li>
                        <li>• Remove períodos cadastrados</li>
                        <li>• Remove medições lançadas</li>
                        <li>• Remove cronograma vinculado</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Confirmação de segurança
                </label>
                <p className="mb-3 text-sm text-slate-600">
                  Digite <span className="font-bold">REINICIAR</span> para autorizar
                  a limpeza dos dados desta obra.
                </p>

                <div className="relative">
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="REINICIAR"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  O botão será liberado após digitar exatamente <strong>REINICIAR</strong>.
                </p>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Trash2 className="h-4 w-4" />
                Operação irreversível para os dados operacionais.
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!canConfirm || loading}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                    !canConfirm || loading
                      ? "cursor-not-allowed bg-red-300 opacity-70"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  {loading
                    ? "Reiniciando..."
                    : canConfirm
                    ? "Confirmar reinício"
                    : "Digite REINICIAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
