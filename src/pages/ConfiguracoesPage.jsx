import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Database,
  Palette,
  Save,
  ShieldCheck,
} from "lucide-react";

import Panel from "../components/Panel";
import KpiCard from "../components/KpiCard";
import { supabase } from "../supabaseClient";

const initialConfig = {
  id: "",
  limiteAlertaFisico: -2,
  limiteCriticoFisico: -5,
  limiteAlertaFinanceiro: -1000,
  limiteCriticoFinanceiro: -5000,
  moeda: "BRL",
  competenciaPadrao: "semanal",
  temaVisual: "nero",
  integracaoNero: true,
  notificacoesAtivas: true,
  modoLeituraExecutiva: true,
};

export default function ConfiguracoesPage() {
  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState("");
  const [config, setConfig] = useState(initialConfig);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadObras();
  }, []);

  useEffect(() => {
    if (obraId) loadConfiguracao(obraId);
  }, [obraId]);

  async function loadObras() {
    setLoading(true);
    setError("");
    setSuccess("");

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

  async function loadConfiguracao(selectedObraId) {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase
        .from("plan_configuracoes")
        .select("*")
        .eq("obra_id", selectedObraId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setConfig(initialConfig);
        setLoading(false);
        return;
      }

      setConfig({
        id: data.id,
        limiteAlertaFisico: Number(data.limite_alerta_fisico ?? -2),
        limiteCriticoFisico: Number(data.limite_critico_fisico ?? -5),
        limiteAlertaFinanceiro: Number(data.limite_alerta_financeiro ?? -1000),
        limiteCriticoFinanceiro: Number(data.limite_critico_financeiro ?? -5000),
        moeda: data.moeda ?? "BRL",
        competenciaPadrao: data.competencia_padrao ?? "semanal",
        temaVisual: data.tema_visual ?? "nero",
        integracaoNero: Boolean(data.integracao_nero),
        notificacoesAtivas: Boolean(data.notificacoes_ativas),
        modoLeituraExecutiva: Boolean(data.modo_leitura_executiva),
      });
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar as configurações.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSuccess("");
  }

  async function handleSave() {
    if (!obraId) {
      setError("Selecione uma obra.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        obra_id: obraId,
        limite_alerta_fisico: Number(config.limiteAlertaFisico),
        limite_critico_fisico: Number(config.limiteCriticoFisico),
        limite_alerta_financeiro: Number(config.limiteAlertaFinanceiro),
        limite_critico_financeiro: Number(config.limiteCriticoFinanceiro),
        moeda: config.moeda,
        competencia_padrao: config.competenciaPadrao,
        tema_visual: config.temaVisual,
        integracao_nero: Boolean(config.integracaoNero),
        notificacoes_ativas: Boolean(config.notificacoesAtivas),
        modo_leitura_executiva: Boolean(config.modoLeituraExecutiva),
      };

      if (config.id) {
        const { error } = await supabase
          .from("plan_configuracoes")
          .update(payload)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("plan_configuracoes")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        if (data?.id) {
          setConfig((prev) => ({ ...prev, id: data.id }));
        }
      }

      setSuccess("Configurações salvas com sucesso.");
    } catch (err) {
      console.error(err);
      setError("Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  const resumo = useMemo(() => {
    return {
      statusFisico: `Alerta em ${config.limiteAlertaFisico}% / Crítico em ${config.limiteCriticoFisico}%`,
      statusFinanceiro: `Alerta em ${config.limiteAlertaFinanceiro} / Crítico em ${config.limiteCriticoFinanceiro}`,
      tema: config.temaVisual,
      integracao: config.integracaoNero ? "Ativa" : "Desligada",
    };
  }, [config]);

  if (loading) {
    return <Panel title="Configurações">Carregando configurações...</Panel>;
  }

  return (
    <>
      <Panel
        title="Configurações do Módulo"
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
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Ajuste os parâmetros de leitura executiva, limites de desvio e preferências visuais por obra.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Leitura física"
          value={resumo.statusFisico}
          subtitle="Faixas usadas para gerar status automático do físico."
          icon={ShieldCheck}
          accent="green"
        />
        <KpiCard
          title="Leitura financeira"
          value={resumo.statusFinanceiro}
          subtitle="Faixas usadas para classificar desvios financeiros."
          icon={Bell}
          accent="amber"
        />
        <KpiCard
          title="Tema visual"
          value={resumo.tema}
          subtitle="Identidade visual atual do módulo."
          icon={Palette}
          accent="blue"
        />
        <KpiCard
          title="Integração NERO"
          value={resumo.integracao}
          subtitle="Estado da integração lógica com o sistema principal."
          icon={Database}
          accent="dark"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Parâmetros de status">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Limite de alerta físico (%)
              </span>
              <input
                type="number"
                value={config.limiteAlertaFisico}
                onChange={(e) =>
                  updateField("limiteAlertaFisico", Number(e.target.value))
                }
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Limite crítico físico (%)
              </span>
              <input
                type="number"
                value={config.limiteCriticoFisico}
                onChange={(e) =>
                  updateField("limiteCriticoFisico", Number(e.target.value))
                }
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Limite de alerta financeiro (R$)
              </span>
              <input
                type="number"
                value={config.limiteAlertaFinanceiro}
                onChange={(e) =>
                  updateField("limiteAlertaFinanceiro", Number(e.target.value))
                }
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Limite crítico financeiro (R$)
              </span>
              <input
                type="number"
                value={config.limiteCriticoFinanceiro}
                onChange={(e) =>
                  updateField("limiteCriticoFinanceiro", Number(e.target.value))
                }
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </Panel>

        <Panel title="Preferências do módulo">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Moeda</span>
              <select
                value={config.moeda}
                onChange={(e) => updateField("moeda", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Competência padrão
              </span>
              <select
                value={config.competenciaPadrao}
                onChange={(e) => updateField("competenciaPadrao", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              >
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Tema visual
              </span>
              <select
                value={config.temaVisual}
                onChange={(e) => updateField("temaVisual", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              >
                <option value="nero">NERO</option>
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
              </select>
            </label>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Recursos habilitados</p>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.integracaoNero}
                  onChange={(e) => updateField("integracaoNero", e.target.checked)}
                />
                Integração futura com NERO
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.notificacoesAtivas}
                  onChange={(e) =>
                    updateField("notificacoesAtivas", e.target.checked)
                  }
                />
                Notificações ativas
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.modoLeituraExecutiva}
                  onChange={(e) =>
                    updateField("modoLeituraExecutiva", e.target.checked)
                  }
                />
                Modo de leitura executiva
              </label>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Resumo técnico das configurações">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-green-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Status físico</p>
            <p className="mt-2 font-semibold text-slate-900">
              Alerta: {config.limiteAlertaFisico}% · Crítico: {config.limiteCriticoFisico}%
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Status financeiro</p>
            <p className="mt-2 font-semibold text-slate-900">
              Alerta: {config.limiteAlertaFinanceiro} · Crítico: {config.limiteCriticoFinanceiro}
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Padrão operacional</p>
            <p className="mt-2 font-semibold text-slate-900">
              {config.competenciaPadrao} · {config.moeda} · {config.temaVisual}
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}