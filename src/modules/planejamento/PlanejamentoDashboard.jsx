import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  HardHat,
  ShieldAlert,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Panel from "../../components/Panel";
import KpiCard from "../../components/KpiCard";
import ResetObraButton from "../../components/ResetObraButton";
import { supabase } from "../../supabase";
import { money, pct, shortDate } from "../../data/formatters";

const defaultConfig = {
  limite_alerta_fisico: -2,
  limite_critico_fisico: -5,
  limite_alerta_financeiro: -1000,
  limite_critico_financeiro: -5000,
};

function getStatusFromConfig(resumo, config) {
  if (!resumo) {
    return {
      label: "Sem leitura",
      className: "bg-slate-50 text-slate-700 ring-slate-200",
      icon: ShieldAlert,
      descricao: "Ainda não há medições suficientes para leitura executiva.",
    };
  }

  const df = Number(resumo.desvio_financeiro || 0);
  const dfi = Number(resumo.desvio_fisico_acumulado || 0);

  const alertaFis = Number(config?.limite_alerta_fisico ?? -2);
  const criticoFis = Number(config?.limite_critico_fisico ?? -5);
  const alertaFin = Number(config?.limite_alerta_financeiro ?? -1000);
  const criticoFin = Number(config?.limite_critico_financeiro ?? -5000);

  if (df <= criticoFin || dfi <= criticoFis) {
    return {
      label: "Crítico",
      className: "bg-red-50 text-red-700 ring-red-200",
      icon: AlertTriangle,
      descricao:
        "A obra está fora da faixa crítica. Há necessidade de ação imediata sobre prazo, custo ou ambos.",
    };
  }

  if (df <= alertaFin || dfi <= alertaFis) {
    return {
      label: "Atenção",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      icon: ShieldAlert,
      descricao:
        "A obra entrou na faixa de alerta. Vale revisar produtividade, sequenciamento e desvios financeiros.",
    };
  }

  return {
    label: "Controlado",
    className: "bg-green-50 text-green-700 ring-green-200",
    icon: CheckCircle2,
    descricao:
      "A obra está dentro das faixas aceitáveis e apresenta comportamento aderente ao planejamento.",
    };
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm text-slate-700">
          {entry.name}: <span className="font-semibold">{money(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function PercentTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm text-slate-700">
          {entry.name}: <span className="font-semibold">{pct(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function agruparMedicoesPorPeriodo(periodos, medicoes) {
  const grouped = {};

  for (const med of medicoes || []) {
    if (!grouped[med.periodo_id]) {
      grouped[med.periodo_id] = {
        valor_previsto: 0,
        valor_real: 0,
        percentual_previsto: 0,
        percentual_real: 0,
      };
    }

    grouped[med.periodo_id].valor_previsto += Number(med.valor_previsto || 0);
    grouped[med.periodo_id].valor_real += Number(med.valor_real || 0);
    grouped[med.periodo_id].percentual_previsto += Number(med.percentual_previsto || 0);
    grouped[med.periodo_id].percentual_real += Number(med.percentual_real || 0);
  }

  let acumuladoPrevisto = 0;
  let acumuladoReal = 0;
  let acumuladoFisicoPrevisto = 0;
  let acumuladoFisicoReal = 0;

  return (periodos || []).map((periodo) => {
    const resumo = grouped[periodo.id] || {
      valor_previsto: 0,
      valor_real: 0,
      percentual_previsto: 0,
      percentual_real: 0,
    };

    acumuladoPrevisto += resumo.valor_previsto;
    acumuladoReal += resumo.valor_real;
    acumuladoFisicoPrevisto += resumo.percentual_previsto;
    acumuladoFisicoReal += resumo.percentual_real;

    return {
      ...periodo,
      valor_previsto: resumo.valor_previsto,
      valor_real: resumo.valor_real,
      percentual_previsto: resumo.percentual_previsto,
      percentual_real: resumo.percentual_real,
      valor_previsto_acumulado: acumuladoPrevisto,
      valor_real_acumulado: acumuladoReal,
      fisico_previsto_acumulado: acumuladoFisicoPrevisto,
      fisico_real_acumulado: acumuladoFisicoReal,
      desvio_financeiro_periodo: resumo.valor_real - resumo.valor_previsto,
      desvio_financeiro: acumuladoReal - acumuladoPrevisto,
      desvio_fisico_periodo: resumo.percentual_real - resumo.percentual_previsto,
      desvio_fisico_acumulado: acumuladoFisicoReal - acumuladoFisicoPrevisto,
    };
  });
}

export default function PlanejamentoDashboard({ obraId, obraNome }) {
  const [periodos, setPeriodos] = useState([]);
  const [medicoes, setMedicoes] = useState([]);
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function garantirPlanObraId() {
    if (!obraId) {
      throw new Error("Selecione uma obra antes de usar o dashboard.");
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
      loadDados(false);
    } else {
      setPeriodos([]);
      setMedicoes([]);
      setConfig(defaultConfig);
      setLoading(false);
    }
  }, [obraId]);

  async function loadDados(silent = true) {
    if (!obraId) return;

    setError("");
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const planObraId = await garantirPlanObraId();

      const [periodosRes, medicoesRes, cfgRes] = await Promise.all([
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
          .from("plan_configuracoes")
          .select("*")
          .eq("obra_id", planObraId)
          .maybeSingle(),
      ]);

      if (periodosRes.error) throw periodosRes.error;
      if (medicoesRes.error) throw medicoesRes.error;
      if (cfgRes.error) throw cfgRes.error;

      setPeriodos(periodosRes.data || []);
      setMedicoes(medicoesRes.data || []);
      setConfig(cfgRes.data || defaultConfig);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Erro ao carregar dashboard do planejamento.");
      setPeriodos([]);
      setMedicoes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const serie = useMemo(
    () => agruparMedicoesPorPeriodo(periodos, medicoes),
    [periodos, medicoes]
  );

  const resumo = useMemo(() => {
    if (!serie.length) return null;
    return serie[serie.length - 1];
  }, [serie]);

  const status = useMemo(
    () => getStatusFromConfig(resumo, config),
    [resumo, config]
  );

  const StatusIcon = status.icon;

  const totalPrevisto = Number(resumo?.valor_previsto_acumulado || 0);
  const totalReal = Number(resumo?.valor_real_acumulado || 0);
  const desvioFinanceiro = Number(resumo?.desvio_financeiro || 0);
  const fisicoReal = Number(resumo?.fisico_real_acumulado || 0);
  const fisicoPrevisto = Number(resumo?.fisico_previsto_acumulado || 0);

  if (loading) {
    return <Panel title="Dashboard Executivo de Obras">Carregando...</Panel>;
  }

  return (
    <>
      <Panel
        title="Dashboard Executivo de Obras"
        right={
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-green-200 px-3 py-2 text-sm text-slate-700">
              {obraNome || "Nenhuma obra selecionada"}
            </div>

            <button
              onClick={() => loadDados(true)}
              disabled={!obraId}
              className="rounded-xl bg-green-600 px-3 py-2 text-white disabled:opacity-50"
            >
              <BarChart3 className={`h-4 w-4 ${refreshing ? "animate-pulse" : ""}`} />
            </button>

            <ResetObraButton
              obraId={obraId}
              obraNome={obraNome}
              onSuccess={async () => {
                await loadDados(true);
              }}
            />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-500">
            Curva S financeira, curva física e leitura executiva da obra.
          </p>

          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${status.className}`}
          >
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </span>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Previsto acumulado"
          value={money(totalPrevisto)}
          subtitle="Planejado até a última leitura."
          icon={Wallet}
          accent="green"
        />
        <KpiCard
          title="Real acumulado"
          value={money(totalReal)}
          subtitle="Executado até a última leitura."
          icon={BarChart3}
          accent="blue"
        />
        <KpiCard
          title="Desvio financeiro"
          value={money(desvioFinanceiro)}
          subtitle="Diferença acumulada entre real e previsto."
          icon={TrendingDown}
          accent="red"
        />
        <KpiCard
          title="Físico real"
          value={pct(fisicoReal)}
          subtitle={`Previsto: ${pct(fisicoPrevisto)}`}
          icon={HardHat}
          accent="amber"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Curva S Financeira">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="valor_previsto_acumulado"
                  name="Previsto acumulado"
                  stroke="#16a34a"
                  fill="#bbf7d0"
                />
                <Area
                  type="monotone"
                  dataKey="valor_real_acumulado"
                  name="Real acumulado"
                  stroke="#0f172a"
                  fill="#cbd5e1"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Curva S Física">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip content={<PercentTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="fisico_previsto_acumulado"
                  name="Físico previsto"
                  stroke="#f59e0b"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="fisico_real_acumulado"
                  name="Físico real"
                  stroke="#16a34a"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Leitura Executiva">
          <div className="space-y-4">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${status.className}`}
            >
              <StatusIcon className="h-4 w-4" />
              {status.label}
            </div>

            <p className="text-sm leading-6 text-slate-700">
              {status.descricao}
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Última competência
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {resumo?.competencia || "—"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {resumo
                    ? `${shortDate(resumo.data_inicio)} → ${shortDate(resumo.data_fim)}`
                    : "Sem período consolidado"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Desvio físico acumulado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {pct(resumo?.desvio_fisico_acumulado || 0)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Diferença entre avanço real e previsto.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Desvio financeiro acumulado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {money(resumo?.desvio_financeiro || 0)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Variação consolidada até a leitura atual.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Situação executiva
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {status.label === "Crítico"
                    ? "Exige ação corretiva imediata."
                    : status.label === "Atenção"
                    ? "Revisar prazo, custo e produtividade."
                    : "Execução dentro da faixa esperada."}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Desvio Financeiro por Período">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip content={<MoneyTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar
                  dataKey="desvio_financeiro_periodo"
                  name="Desvio no período"
                  fill="#f59e0b"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}
