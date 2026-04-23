import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Siren,
  TrendingDown,
} from "lucide-react";

import Panel from "../components/Panel";
import KpiCard from "../components/KpiCard";
import { supabase } from "../supabaseClient";
import { money, pct, shortDate } from "../data/formatters";

const defaultConfig = {
  limite_alerta_fisico: -2,
  limite_critico_fisico: -5,
  limite_alerta_financeiro: -1000,
  limite_critico_financeiro: -5000,
};

function mergeAcompanhamento(financeira, fisica) {
  const fisMap = new Map((fisica || []).map((item) => [item.competencia, item]));

  return (financeira || []).map((fin) => {
    const fis = fisMap.get(fin.competencia) || {};

    return {
      competencia: fin.competencia,
      data_inicio: fin.data_inicio,
      data_fim: fin.data_fim,
      valor_previsto_acumulado: Number(fin.valor_previsto_acumulado || 0),
      valor_real_acumulado: Number(fin.valor_real_acumulado || 0),
      desvio_financeiro: Number(fin.desvio_acumulado || 0),
      fisico_previsto: Number(fis.fisico_previsto_acumulado_ponderado || 0),
      fisico_real: Number(fis.fisico_real_acumulado_ponderado || 0),
      desvio_fisico: Number(fis.desvio_fisico_acumulado_ponderado || 0),
    };
  });
}

function getAcompanhamentoStatus(item, config) {
  const df = Number(item.desvio_financeiro || 0);
  const dfi = Number(item.desvio_fisico || 0);

  const alertaFis = Number(config?.limite_alerta_fisico ?? -2);
  const criticoFis = Number(config?.limite_critico_fisico ?? -5);
  const alertaFin = Number(config?.limite_alerta_financeiro ?? -1000);
  const criticoFin = Number(config?.limite_critico_financeiro ?? -5000);

  if (df <= criticoFin || dfi <= criticoFis) {
    return {
      label: "Crítico",
      className: "bg-red-50 text-red-700 ring-red-200",
      icon: AlertTriangle,
    };
  }

  if (df <= alertaFin || dfi <= alertaFis) {
    return {
      label: "Atenção",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      icon: Siren,
    };
  }

  return {
    label: "OK",
    className: "bg-green-50 text-green-700 ring-green-200",
    icon: CheckCircle2,
  };
}

function diagnosticoLinha(item) {
  const df = Number(item.desvio_financeiro || 0);
  const dfi = Number(item.desvio_fisico || 0);

  if (df < 0 && dfi < 0) return "Atraso físico com reflexo financeiro.";
  if (df < 0 && dfi >= 0) return "Financeiro abaixo do previsto, com físico aderente.";
  if (df > 0 && dfi >= 0) return "Avanço com custo acima do previsto.";
  if (df > 0 && dfi < 0) return "Atraso físico com custo pressionado.";
  return "Sem desvio relevante.";
}

export default function AcompanhamentoPage() {
  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [serieFinanceira, setSerieFinanceira] = useState([]);
  const [serieFisica, setSerieFisica] = useState([]);
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadObras();
  }, []);

  useEffect(() => {
    if (obraId) {
      loadAcompanhamento(obraId, false);
    }
  }, [obraId]);

  async function loadObras() {
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("plan_obras")
        .select("id, nome, tipo_obra, status")
        .order("nome");

      if (error) throw error;

      setObras(data || []);
      if (data?.length) setObraId(data[0].id);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar as obras.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAcompanhamento(selectedObraId, silent = true) {
    setError("");
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [dashRes, finRes, fisRes, cfgRes] = await Promise.all([
        supabase
          .from("plan_vw_dashboard_executivo_v1")
          .select("*")
          .eq("obra_id", selectedObraId)
          .single(),

        supabase
          .from("plan_vw_curva_s_financeira_v1")
          .select("*")
          .eq("obra_id", selectedObraId)
          .order("data_inicio", { ascending: true }),

        supabase
          .from("plan_vw_curva_s_fisica_ponderada_v1")
          .select("*")
          .eq("obra_id", selectedObraId)
          .order("data_inicio", { ascending: true }),

        supabase
          .from("plan_configuracoes")
          .select("*")
          .eq("obra_id", selectedObraId)
          .maybeSingle(),
      ]);

      if (dashRes.error) throw dashRes.error;
      if (finRes.error) throw finRes.error;
      if (fisRes.error) throw fisRes.error;
      if (cfgRes.error) throw cfgRes.error;

      setDashboard(dashRes.data || null);
      setSerieFinanceira(finRes.data || []);
      setSerieFisica(fisRes.data || []);
      setConfig(cfgRes.data || defaultConfig);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o acompanhamento.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const obraAtual = useMemo(
    () => obras.find((item) => item.id === obraId) || null,
    [obras, obraId]
  );

  const rows = useMemo(
    () => mergeAcompanhamento(serieFinanceira, serieFisica),
    [serieFinanceira, serieFisica]
  );

  const resumo = useMemo(() => {
    const criticos = rows.filter(
      (item) => getAcompanhamentoStatus(item, config).label === "Crítico"
    ).length;

    const atencao = rows.filter(
      (item) => getAcompanhamentoStatus(item, config).label === "Atenção"
    ).length;

    const ok = rows.filter(
      (item) => getAcompanhamentoStatus(item, config).label === "OK"
    ).length;

    return { criticos, atencao, ok };
  }, [rows, config]);

  const topDesvios = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        const scoreA =
          Math.abs(Number(a.desvio_financeiro || 0)) +
          Math.abs(Number(a.desvio_fisico || 0)) * 1000;
        const scoreB =
          Math.abs(Number(b.desvio_financeiro || 0)) +
          Math.abs(Number(b.desvio_fisico || 0)) * 1000;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [rows]);

  if (loading) {
    return (
      <Panel title="Acompanhamento">
        <div className="text-sm text-slate-500">Carregando acompanhamento...</div>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title="Acompanhamento da Obra"
        right={
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="rounded-xl border border-green-200 px-3 py-2 text-sm"
            >
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadAcompanhamento(obraId, true)}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Atualizando" : "Atualizar"}
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Monitoramento de desvios, leitura executiva por competência e alertas configuráveis por obra.
          </p>

          {obraAtual ? (
            <div className="rounded-2xl bg-green-50 p-4 ring-1 ring-green-100">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-green-700">
                    Obra
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {obraAtual.nome}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-green-700">
                    Tipo
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {obraAtual.tipo_obra || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-green-700">
                    Status cadastral
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {obraAtual.status || "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Competências críticas"
          value={String(resumo.criticos)}
          subtitle="Períodos em faixa crítica segundo configuração da obra."
          icon={AlertTriangle}
          accent="red"
        />
        <KpiCard
          title="Competências em atenção"
          value={String(resumo.atencao)}
          subtitle="Períodos em faixa de alerta segundo configuração."
          icon={Siren}
          accent="amber"
        />
        <KpiCard
          title="Períodos aderentes"
          value={String(resumo.ok)}
          subtitle="Competências dentro das faixas aceitáveis."
          icon={CheckCircle2}
          accent="green"
        />
        <KpiCard
          title="Desvio financeiro atual"
          value={money(dashboard?.desvio_financeiro)}
          subtitle="Diferença acumulada na última leitura consolidada."
          icon={BarChart3}
          accent="dark"
        />
      </div>

      <Panel title="Regras aplicadas no acompanhamento">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-green-100">
            <p className="text-sm text-slate-500">Alerta físico</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {pct(config.limite_alerta_fisico)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-green-100">
            <p className="text-sm text-slate-500">Crítico físico</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {pct(config.limite_critico_fisico)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-green-100">
            <p className="text-sm text-slate-500">Alerta financeiro</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {money(config.limite_alerta_financeiro)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-green-100">
            <p className="text-sm text-slate-500">Crítico financeiro</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {money(config.limite_critico_financeiro)}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Leitura automática da obra">
          {dashboard ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-green-100">
                <p className="text-sm text-slate-500">Status físico</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {dashboard.status_fisico}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-green-100">
                <p className="text-sm text-slate-500">Status financeiro</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {dashboard.status_financeiro}
                </p>
              </div>

              <div className="rounded-2xl bg-green-50 p-4 ring-1 ring-green-100">
                <p className="text-sm text-slate-600">
                  Última referência:{" "}
                  <span className="font-semibold text-slate-900">
                    {shortDate(dashboard.data_referencia)}
                  </span>
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  A leitura desta obra agora respeita os limites definidos em Configurações para físico e financeiro.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Sem leitura executiva disponível.
            </div>
          )}
        </Panel>

        <Panel title="Piores desvios identificados">
          <div className="space-y-3">
            {topDesvios.map((item) => {
              const status = getAcompanhamentoStatus(item, config);
              const Icon = status.icon;

              return (
                <div
                  key={item.competencia}
                  className="rounded-2xl border border-green-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.competencia}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {shortDate(item.data_inicio)} a {shortDate(item.data_fim)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Desvio financeiro</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {money(item.desvio_financeiro)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Desvio físico</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {pct(item.desvio_fisico)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {diagnosticoLinha(item)}
                  </p>
                </div>
              );
            })}

            {topDesvios.length === 0 ? (
              <div className="rounded-2xl border border-green-100 bg-slate-50 p-6 text-sm text-slate-500">
                Sem desvios suficientes para análise.
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel title="Histórico de acompanhamento por competência">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <th className="px-3 py-2">Competência</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Prev. financeiro</th>
                <th className="px-3 py-2">Real financeiro</th>
                <th className="px-3 py-2">Desvio financeiro</th>
                <th className="px-3 py-2">Prev. físico</th>
                <th className="px-3 py-2">Real físico</th>
                <th className="px-3 py-2">Desvio físico</th>
                <th className="px-3 py-2">Leitura</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const status = getAcompanhamentoStatus(item, config);

                return (
                  <tr
                    key={item.competencia}
                    className="bg-slate-50 text-sm shadow-sm ring-1 ring-green-100"
                  >
                    <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900">
                      {item.competencia}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {shortDate(item.data_inicio)} a {shortDate(item.data_fim)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(item.valor_previsto_acumulado)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(item.valor_real_acumulado)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(item.desvio_financeiro)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {pct(item.fisico_previsto)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {pct(item.fisico_real)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {pct(item.desvio_fisico)}
                    </td>
                    <td className="rounded-r-2xl px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-green-100"
                  >
                    Nenhuma competência encontrada para acompanhamento.
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