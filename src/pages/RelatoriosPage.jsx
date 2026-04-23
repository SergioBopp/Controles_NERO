import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  Printer,
  RefreshCw,
} from "lucide-react";

import Panel from "../components/Panel";
import KpiCard from "../components/KpiCard";
import { supabase } from "../supabaseClient";
import { money, pct, shortDate } from "../data/formatters";

function downloadCsv(filename, rows) {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          const escaped = value.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage() {
  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [financeira, setFinanceira] = useState([]);
  const [fisica, setFisica] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const printRef = useRef(null);

  useEffect(() => {
    loadObras();
  }, []);

  useEffect(() => {
    if (obraId) {
      loadRelatorio(obraId, false);
    }
  }, [obraId]);

  async function loadObras() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("plan_obras")
        .select("id, nome")
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

  async function loadRelatorio(selectedObraId, silent = true) {
    setError("");
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [dashRes, finRes, fisRes] = await Promise.all([
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
      ]);

      if (dashRes.error) throw dashRes.error;
      if (finRes.error) throw finRes.error;
      if (fisRes.error) throw fisRes.error;

      setDashboard(dashRes.data || null);
      setFinanceira(finRes.data || []);
      setFisica(fisRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o relatório.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const merged = useMemo(() => {
    const fisMap = new Map(
      (fisica || []).map((item) => [item.competencia, item])
    );

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
  }, [financeira, fisica]);

  function handleExportCsv() {
    if (!dashboard) return;

    const rows = [
      [
        "Competência",
        "Data início",
        "Data fim",
        "Previsto acumulado",
        "Real acumulado",
        "Desvio financeiro",
        "Físico previsto",
        "Físico real",
        "Desvio físico",
      ],
      ...merged.map((item) => [
        item.competencia,
        shortDate(item.data_inicio),
        shortDate(item.data_fim),
        item.valor_previsto_acumulado,
        item.valor_real_acumulado,
        item.desvio_financeiro,
        item.fisico_previsto,
        item.fisico_real,
        item.desvio_fisico,
      ]),
    ];

    const obraNome = obras.find((o) => o.id === obraId)?.nome || "obra";
    downloadCsv(`relatorio_${obraNome}.csv`, rows);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return <Panel title="Relatórios">Carregando relatórios...</Panel>;
  }

  return (
    <>
      <Panel
        title="Relatórios do Módulo"
        right={
          <div className="flex flex-wrap gap-2">
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
              onClick={() => loadRelatorio(obraId, true)}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Atualizando" : "Atualizar"}
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Emissão de relatório executivo da obra, com exportação em CSV e impressão em PDF pelo navegador.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </Panel>

      {dashboard ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Previsto acumulado"
              value={money(dashboard.valor_previsto_acumulado)}
              subtitle="Planejado até a última leitura."
              icon={FileText}
              accent="green"
            />
            <KpiCard
              title="Real acumulado"
              value={money(dashboard.valor_real_acumulado)}
              subtitle="Executado até a última leitura."
              icon={FileText}
              accent="blue"
            />
            <KpiCard
              title="Desvio financeiro"
              value={money(dashboard.desvio_financeiro)}
              subtitle="Diferença acumulada."
              icon={FileText}
              accent="red"
            />
            <KpiCard
              title="Físico real"
              value={pct(dashboard.fisico_real_acumulado_ponderado)}
              subtitle={`Previsto: ${pct(
                dashboard.fisico_previsto_acumulado_ponderado
              )}`}
              icon={FileText}
              accent="amber"
            />
          </div>

          <Panel title="Relatório Executivo" className="print:shadow-none" >
            <div ref={printRef} className="space-y-6">
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <h3 className="text-xl font-semibold text-slate-900">
                  {obras.find((o) => o.id === obraId)?.nome || "Obra"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Data de referência: {shortDate(dashboard.data_referencia)}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-green-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Tipo da obra</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {dashboard.tipo_obra}
                  </p>
                </div>

                <div className="rounded-2xl border border-green-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Status físico</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {dashboard.status_fisico}
                  </p>
                </div>

                <div className="rounded-2xl border border-green-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Status financeiro</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {dashboard.status_financeiro}
                  </p>
                </div>

                <div className="rounded-2xl border border-green-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Desvio financeiro</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {money(dashboard.desvio_financeiro)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                      <th className="px-3 py-2">Competência</th>
                      <th className="px-3 py-2">Período</th>
                      <th className="px-3 py-2">Previsto acumulado</th>
                      <th className="px-3 py-2">Real acumulado</th>
                      <th className="px-3 py-2">Desvio financeiro</th>
                      <th className="px-3 py-2">Físico previsto</th>
                      <th className="px-3 py-2">Físico real</th>
                      <th className="px-3 py-2">Desvio físico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merged.map((item) => (
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
                        <td className="rounded-r-2xl px-3 py-3 text-slate-900">
                          {pct(item.desvio_fisico)}
                        </td>
                      </tr>
                    ))}

                    {merged.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-green-100"
                        >
                          Nenhum dado encontrado para relatório.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </>
      ) : null}
    </>
  );
}