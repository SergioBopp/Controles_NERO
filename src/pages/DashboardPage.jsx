import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Wallet,
  TrendingDown,
  HardHat,
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "../supabaseClient";
import Panel from "../components/Panel";
import KpiCard from "../components/KpiCard";
import ResetObraButton from "../components/ResetObraButton";
import { money, pct, shortDate } from "../data/formatters";

const defaultConfig = {
  limite_alerta_fisico: -2,
  limite_critico_fisico: -5,
  limite_alerta_financeiro: -1000,
  limite_critico_financeiro: -5000,
};

function getStatusFromConfig(resumo, config) {
  if (!resumo) {
    return {
      label: "—",
      className: "bg-slate-50 text-slate-700 ring-slate-200",
      icon: ShieldAlert,
      descricao: "Sem leitura disponível.",
    };
  }

  const df = Number(resumo.desvio_financeiro || 0);
  const dfi = Number(resumo.desvio_fisico_acumulado_ponderado || 0);

  const alertaFis = Number(config?.limite_alerta_fisico ?? -2);
  const criticoFis = Number(config?.limite_critico_fisico ?? -5);
  const alertaFin = Number(config?.limite_alerta_financeiro ?? -1000);
  const criticoFin = Number(config?.limite_critico_financeiro ?? -5000);

  if (df <= criticoFin || dfi <= criticoFis) {
    return {
      label: "Crítico",
      className: "bg-red-50 text-red-700 ring-red-200",
      icon: AlertTriangle,
      descricao: "A obra está fora da faixa crítica definida nas configurações.",
    };
  }

  if (df <= alertaFin || dfi <= alertaFis) {
    return {
      label: "Atenção",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      icon: ShieldAlert,
      descricao: "A obra entrou na faixa de alerta configurada.",
    };
  }

  return {
    label: "OK",
    className: "bg-green-50 text-green-700 ring-green-200",
    icon: CheckCircle2,
    descricao: "A obra está dentro das faixas aceitáveis configuradas.",
  };
}

export default function DashboardPage() {
  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState("");
  const [resumo, setResumo] = useState(null);
  const [serie, setSerie] = useState([]);
  const [config, setConfig] = useState(defaultConfig);
  const [error, setError] = useState("");

  useEffect(() => {
    loadObras();
  }, []);

  useEffect(() => {
    if (obraId) loadDados();
  }, [obraId]);

  async function loadObras(forceObraId = "") {
    const { data, error } = await supabase
      .from("plan_vw_dashboard_executivo_v1")
      .select("obra_id, nome")
      .order("nome");

    if (error) {
      setError("Erro ao carregar obras.");
      return;
    }

    const obrasData = data || [];
    setObras(obrasData);

    if (forceObraId && obrasData.some((o) => o.obra_id === forceObraId)) {
      setObraId(forceObraId);
      return;
    }

    if (obrasData.some((o) => o.obra_id === obraId)) {
      return;
    }

    if (obrasData.length) {
      setObraId(obrasData[0].obra_id);
    } else {
      setObraId("");
      setResumo(null);
      setSerie([]);
    }
  }

  async function loadDados(targetObraId = obraId) {
    if (!targetObraId) return;

    setError("");

    const { data: resumoData, error: resumoError } = await supabase
      .from("plan_vw_dashboard_executivo_v1")
      .select("*")
      .eq("obra_id", targetObraId)
      .single();

    const { data: serieFin, error: finError } = await supabase
      .from("plan_vw_curva_s_financeira_v1")
      .select("*")
      .eq("obra_id", targetObraId)
      .order("data_inicio");

    const { data: serieFis, error: fisError } = await supabase
      .from("plan_vw_curva_s_fisica_ponderada_v1")
      .select("*")
      .eq("obra_id", targetObraId)
      .order("data_inicio");

    const { data: cfgData } = await supabase
      .from("plan_configuracoes")
      .select("*")
      .eq("obra_id", targetObraId)
      .maybeSingle();

    if (resumoError || finError || fisError) {
      setError("Erro ao carregar dados do dashboard.");
      return;
    }

    setResumo(resumoData);

    if (cfgData) {
      setConfig(cfgData);
    } else {
      setConfig(defaultConfig);
    }

    const fisMap = new Map(
      (serieFis || []).map((item) => [item.competencia, item])
    );

    const merged = (serieFin || []).map((f) => {
      const p = fisMap.get(f.competencia) || {};
      return {
        ...f,
        fisPrev: p.fisico_previsto_acumulado_ponderado || 0,
        fisReal: p.fisico_real_acumulado_ponderado || 0,
      };
    });

    setSerie(merged);
  }

  const status = useMemo(
    () => getStatusFromConfig(resumo, config),
    [resumo, config]
  );

  const obraSelecionada = useMemo(
    () => obras.find((o) => o.obra_id === obraId) || null,
    [obras, obraId]
  );

  const StatusIcon = status.icon;

  return (
    <>
      <Panel
        title="Dashboard Executivo de Obras"
        right={
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="rounded-xl border border-green-200 px-3 py-2 text-sm"
            >
              {obras.map((o) => (
                <option key={o.obra_id} value={o.obra_id}>
                  {o.nome}
                </option>
              ))}
            </select>

            <ResetObraButton
              obraId={obraId}
              obraNome={obraSelecionada?.nome}
              onSuccess={async () => {
                await loadObras(obraId);
                await loadDados(obraId);
              }}
            />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-500">
            Curva S financeira, física e leitura executiva da obra.
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

      {resumo && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Previsto acumulado"
            value={money(resumo.valor_previsto_acumulado)}
            subtitle="Planejado até a última leitura"
            icon={Wallet}
          />
          <KpiCard
            title="Real acumulado"
            value={money(resumo.valor_real_acumulado)}
            subtitle="Executado até a última leitura"
            icon={BarChart3}
            accent="blue"
          />
          <KpiCard
            title="Desvio financeiro"
            value={money(resumo.desvio_financeiro)}
            subtitle="Diferença acumulada"
            icon={TrendingDown}
            accent="red"
          />
          <KpiCard
            title="Físico real"
            value={pct(resumo.fisico_real_acumulado_ponderado)}
            subtitle={`Previsto: ${pct(
              resumo.fisico_previsto_acumulado_ponderado
            )}`}
            icon={HardHat}
            accent="amber"
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Curva S Financeira">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="valor_previsto_acumulado"
                  name="Previsto"
                  stroke="#16a34a"
                  fill="#bbf7d0"
                />
                <Area
                  type="monotone"
                  dataKey="valor_real_acumulado"
                  name="Real"
                  stroke="#14532d"
                  fill="#86efac"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Curva S Física">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="fisPrev"
                  name="Previsto"
                  stroke="#f97316"
                />
                <Line
                  type="monotone"
                  dataKey="fisReal"
                  name="Real"
                  stroke="#16a34a"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {resumo && (
        <Panel title="Leitura Executiva">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-sm text-slate-500">Status atual</p>
              <p className="text-xl font-semibold text-green-900">
                {status.label}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Data de referência</p>
              <p className="text-xl font-semibold text-slate-900">
                {shortDate(resumo.data_referencia)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Tipo da obra</p>
              <p className="text-xl font-semibold text-slate-900">
                {resumo.tipo_obra}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Regra aplicada</p>
              <p className="text-sm font-semibold text-slate-900">
                {status.descricao}
              </p>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}
