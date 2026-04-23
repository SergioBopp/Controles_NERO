import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import Panel from "../../components/Panel";
import KpiCard from "../../components/KpiCard";
import { supabase } from "../../supabase";
import { money, pct } from "../../data/formatters";

function getStatusLinha(item) {
  const desvioFinanceiro = Number(item.desvio_financeiro || 0);
  const desvioFisico = Number(item.desvio_fisico || 0);

  if (desvioFisico <= -5 || desvioFinanceiro <= -1000) {
    return {
      label: "Crítico",
      className: "bg-red-50 text-red-700 ring-red-200",
      icon: AlertTriangle,
    };
  }

  if (desvioFisico < 0 || desvioFinanceiro < 0) {
    return {
      label: "Atenção",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      icon: ShieldAlert,
    };
  }

  return {
    label: "OK",
    className: "bg-green-50 text-green-700 ring-green-200",
    icon: CheckCircle2,
  };
}

function formatEapLabel(item) {
  if (!item) return "—";
  const codigo = item?.codigo ? `${item.codigo} - ` : "";
  return `${codigo}${item?.nome || "—"}`;
}

export default function PlanejamentoAcompanhamento({ obraId, obraNome }) {
  const [periodos, setPeriodos] = useState([]);
  const [medicoes, setMedicoes] = useState([]);
  const [eapItems, setEapItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function garantirPlanObraId() {
    if (!obraId) {
      throw new Error("Selecione uma obra antes de usar acompanhamento.");
    }

    const { data: existente, error: erroBusca } = await supabase
      .from("plan_obras")
      .select("id")
      .eq("obra_principal_id", obraId)
      .maybeSingle();

    if (erroBusca) throw erroBusca;
    if (existente?.id) return existente.id;

    const { data: obraPrincipal, error: erroObra } = await supabase
      .from("obras")
      .select("id, nome")
      .eq("id", obraId)
      .single();

    if (erroObra) throw erroObra;

    const payload = {
      obra_principal_id: obraPrincipal.id,
      nome: obraPrincipal.nome || obraNome || "Nova obra de planejamento",
      tipo_obra: "reforma",
    };

    const { data: criada, error: erroCriacao } = await supabase
      .from("plan_obras")
      .insert(payload)
      .select("id")
      .single();

    if (erroCriacao) {
      if ((erroCriacao.message || "").includes("duplicate key")) {
        const { data: existente2, error: erroBusca2 } = await supabase
          .from("plan_obras")
          .select("id")
          .eq("obra_principal_id", obraId)
          .single();

        if (erroBusca2) throw erroBusca2;
        return existente2.id;
      }

      throw erroCriacao;
    }

    return criada.id;
  }

  useEffect(() => {
    if (obraId) {
      loadData(false);
    } else {
      setPeriodos([]);
      setMedicoes([]);
      setEapItems([]);
      setLoading(false);
    }
  }, [obraId]);

  async function loadData(silent = true) {
    if (!obraId) return;

    setError("");
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const planObraId = await garantirPlanObraId();

      const [periodosRes, medicoesRes, eapRes] = await Promise.all([
        supabase
          .from("plan_periodos_medicao")
          .select("*")
          .eq("obra_id", planObraId)
          .order("data_inicio", { ascending: true }),

        supabase
          .from("plan_medicoes_itens")
          .select("*")
          .eq("obra_id", planObraId),

        supabase
          .from("plan_eap_itens")
          .select("id, codigo, nome, nivel, parent_id")
          .eq("obra_id", planObraId)
          .order("nivel", { ascending: true })
          .order("codigo", { ascending: true, nullsFirst: false })
          .order("nome", { ascending: true }),
      ]);

      if (periodosRes.error) throw periodosRes.error;
      if (medicoesRes.error) throw medicoesRes.error;
      if (eapRes.error) throw eapRes.error;

      setPeriodos(periodosRes.data || []);
      setMedicoes(medicoesRes.data || []);
      setEapItems(eapRes.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Erro ao carregar acompanhamento.");
      setPeriodos([]);
      setMedicoes([]);
      setEapItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const acompanhamentoRows = useMemo(() => {
    const mapa = new Map();

    for (const item of eapItems) {
      mapa.set(item.id, {
        id: item.id,
        nome: item.nome,
        codigo: item.codigo,
        nivel: item.nivel,
        parent_id: item.parent_id,
        valor_previsto: 0,
        valor_real: 0,
        percentual_previsto: 0,
        percentual_real: 0,
      });
    }

    for (const med of medicoes) {
      const row = mapa.get(med.eap_item_id);
      if (!row) continue;

      row.valor_previsto += Number(med.valor_previsto || 0);
      row.valor_real += Number(med.valor_real || 0);
      row.percentual_previsto += Number(med.percentual_previsto || 0);
      row.percentual_real += Number(med.percentual_real || 0);
    }

    return Array.from(mapa.values()).map((row) => {
      const desvioFinanceiro = row.valor_real - row.valor_previsto;
      const desvioFisico = row.percentual_real - row.percentual_previsto;
      return {
        ...row,
        desvio_financeiro: desvioFinanceiro,
        desvio_fisico: desvioFisico,
      };
    });
  }, [eapItems, medicoes]);

  const resumo = useMemo(() => {
    const totalItens = acompanhamentoRows.length;
    const itensComMedicao = acompanhamentoRows.filter(
      (item) =>
        Number(item.valor_previsto || 0) !== 0 ||
        Number(item.valor_real || 0) !== 0 ||
        Number(item.percentual_previsto || 0) !== 0 ||
        Number(item.percentual_real || 0) !== 0
    ).length;

    const criticos = acompanhamentoRows.filter(
      (item) => getStatusLinha(item).label === "Crítico"
    ).length;

    const totalDesvio = acompanhamentoRows.reduce(
      (acc, item) => acc + Number(item.desvio_financeiro || 0),
      0
    );

    return {
      totalItens,
      itensComMedicao,
      criticos,
      totalDesvio,
    };
  }, [acompanhamentoRows]);

  if (loading) {
    return <Panel title="Acompanhamento">Carregando...</Panel>;
  }

  return (
    <>
      <Panel
        title="Acompanhamento"
        right={
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-green-200 px-3 py-2 text-sm text-slate-700">
              {obraNome || "Nenhuma obra selecionada"}
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={!obraId}
              className="rounded-xl bg-green-600 px-3 py-2 text-white disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Acompanhamento consolidado por item da EAP, com previsto, real, percentual e status.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Itens da EAP"
          value={String(resumo.totalItens)}
          subtitle="Quantidade total de itens cadastrados."
          icon={ClipboardList}
          accent="green"
        />
        <KpiCard
          title="Itens com medição"
          value={String(resumo.itensComMedicao)}
          subtitle="Itens que já possuem lançamento."
          icon={CheckCircle2}
          accent="blue"
        />
        <KpiCard
          title="Itens críticos"
          value={String(resumo.criticos)}
          subtitle="Itens com desvio fora da faixa aceitável."
          icon={AlertTriangle}
          accent="red"
        />
        <KpiCard
          title="Desvio consolidado"
          value={money(resumo.totalDesvio)}
          subtitle="Soma dos desvios financeiros por item."
          icon={ShieldAlert}
          accent="amber"
        />
      </div>

      <Panel title="Consolidação por item da EAP">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <th className="px-3 py-2">Item EAP</th>
                <th className="px-3 py-2">Nível</th>
                <th className="px-3 py-2">Previsto</th>
                <th className="px-3 py-2">Real</th>
                <th className="px-3 py-2">% Previsto</th>
                <th className="px-3 py-2">% Real</th>
                <th className="px-3 py-2">Desvio</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {acompanhamentoRows.map((item) => {
                const status = getStatusLinha(item);
                const StatusIcon = status.icon;

                return (
                  <tr
                    key={item.id}
                    className="bg-slate-50 text-sm shadow-sm ring-1 ring-green-100"
                  >
                    <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900">
                      <div style={{ marginLeft: `${Math.max((item.nivel || 1) - 1, 0) * 18}px` }}>
                        {formatEapLabel(item)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">N{item.nivel || 1}</td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(item.valor_previsto)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(item.valor_real)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {pct(item.percentual_previsto)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {pct(item.percentual_real)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(item.desvio_financeiro)}
                    </td>
                    <td className="rounded-r-2xl px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {acompanhamentoRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-green-100"
                  >
                    Nenhum item encontrado para acompanhamento.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
