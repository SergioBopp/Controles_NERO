import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  FolderKanban,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Trash2,
  X,
} from "lucide-react";

import Panel from "../components/Panel";
import KpiCard from "../components/KpiCard";
import { supabase } from "../supabaseClient";
import { pct, shortDate } from "../data/formatters";

const initialEapForm = {
  id: "",
  codigo: "",
  nome: "",
  nivel: 1,
  tipo_item: "etapa",
  unidade: "vb",
  quantidade_prevista: 0,
  ordem: 0,
};

const initialCronForm = {
  eap_item_id: "",
  data_inicio_prevista: "",
  data_fim_prevista: "",
  percentual_peso_fisico: 0,
  percentual_peso_financeiro: 0,
  status: "nao_iniciado",
};

function buildMergedRows(eapItems, cronogramaItems) {
  const cronogramaMap = new Map(
    (cronogramaItems || []).map((item) => [item.eap_item_id, item])
  );

  return (eapItems || []).map((item) => {
    const cron = cronogramaMap.get(item.id) || {};

    return {
      id: item.id,
      codigo: item.codigo || "—",
      nome: item.nome || "—",
      nivel: item.nivel ?? 0,
      tipo_item: item.tipo_item || "—",
      unidade: item.unidade || "—",
      quantidade_prevista: item.quantidade_prevista ?? 0,
      ordem: item.ordem ?? 0,

      cronograma_id: cron.id || "",
      data_inicio_prevista: cron.data_inicio_prevista || "",
      data_fim_prevista: cron.data_fim_prevista || "",
      percentual_peso_fisico: Number(cron.percentual_peso_fisico || 0),
      percentual_peso_financeiro: Number(cron.percentual_peso_financeiro || 0),
      status: cron.status || "nao_iniciado",
    };
  });
}

function getStatusBadge(status) {
  const map = {
    nao_iniciado: "bg-slate-100 text-slate-700 ring-slate-200",
    em_andamento: "bg-blue-50 text-blue-700 ring-blue-200",
    concluido: "bg-green-50 text-green-700 ring-green-200",
    atrasado: "bg-red-50 text-red-700 ring-red-200",
    bloqueado: "bg-amber-50 text-amber-700 ring-amber-200",
  };

  const labelMap = {
    nao_iniciado: "Não iniciado",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    atrasado: "Atrasado",
    bloqueado: "Bloqueado",
  };

  return {
    className: map[status] || map.nao_iniciado,
    label: labelMap[status] || "Não iniciado",
  };
}

function getIndentClass(nivel) {
  if (nivel <= 1) return "";
  if (nivel === 2) return "pl-4";
  if (nivel === 3) return "pl-8";
  if (nivel === 4) return "pl-12";
  return "pl-16";
}

export default function PlanejamentoPage() {
  const [obras, setObras] = useState([]);
  const [obraId, setObraId] = useState("");
  const [eapItems, setEapItems] = useState([]);
  const [cronogramaItems, setCronogramaItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showEapForm, setShowEapForm] = useState(false);
  const [editingEap, setEditingEap] = useState(false);
  const [eapForm, setEapForm] = useState(initialEapForm);

  const [showCronForm, setShowCronForm] = useState(false);
  const [editingCron, setEditingCron] = useState(false);
  const [cronForm, setCronForm] = useState(initialCronForm);

  useEffect(() => {
    loadObras();
  }, []);

  useEffect(() => {
    if (obraId) loadPlanejamento(obraId, false);
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
      setError(err.message || "Não foi possível carregar as obras.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPlanejamento(selectedObraId, silent = true) {
    setError("");
    setSuccess("");
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [eapRes, cronRes] = await Promise.all([
        supabase
          .from("plan_eap_itens")
          .select("*")
          .eq("obra_id", selectedObraId)
          .order("ordem", { ascending: true })
          .order("codigo", { ascending: true }),
        supabase
          .from("plan_cronograma_itens")
          .select("*")
          .eq("obra_id", selectedObraId)
          .order("data_inicio_prevista", { ascending: true }),
      ]);

      if (eapRes.error) throw eapRes.error;
      if (cronRes.error) throw cronRes.error;

      setEapItems(eapRes.data || []);
      setCronogramaItems(cronRes.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Não foi possível carregar o planejamento.");
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
    () => buildMergedRows(eapItems, cronogramaItems),
    [eapItems, cronogramaItems]
  );

  const resumo = useMemo(() => {
    const totalItens = rows.length;
    const totalPlanejados = rows.filter(
      (item) => item.data_inicio_prevista || item.data_fim_prevista
    ).length;
    const somaPesoFisico = rows.reduce(
      (acc, item) => acc + Number(item.percentual_peso_fisico || 0),
      0
    );
    const somaPesoFinanceiro = rows.reduce(
      (acc, item) => acc + Number(item.percentual_peso_financeiro || 0),
      0
    );

    return {
      totalItens,
      totalPlanejados,
      somaPesoFisico,
      somaPesoFinanceiro,
    };
  }, [rows]);

  function openNewEapForm() {
    setEditingEap(false);
    setEapForm({ ...initialEapForm, ordem: rows.length + 1 });
    setShowEapForm(true);
    setShowCronForm(false);
    setError("");
    setSuccess("");
  }

  function openEditEapForm(item) {
    setEditingEap(true);
    setEapForm({
      id: item.id,
      codigo: item.codigo === "—" ? "" : item.codigo,
      nome: item.nome === "—" ? "" : item.nome,
      nivel: item.nivel || 1,
      tipo_item: item.tipo_item === "—" ? "etapa" : item.tipo_item,
      unidade: item.unidade === "—" ? "vb" : item.unidade,
      quantidade_prevista: item.quantidade_prevista || 0,
      ordem: item.ordem || 0,
    });
    setShowEapForm(true);
    setShowCronForm(false);
    setError("");
    setSuccess("");
  }

  function openCronForm(item) {
    setEditingCron(Boolean(item.cronograma_id));
    setCronForm({
      eap_item_id: item.id,
      data_inicio_prevista: item.data_inicio_prevista || "",
      data_fim_prevista: item.data_fim_prevista || "",
      percentual_peso_fisico: item.percentual_peso_fisico || 0,
      percentual_peso_financeiro: item.percentual_peso_financeiro || 0,
      status: item.status || "nao_iniciado",
    });
    setShowCronForm(true);
    setShowEapForm(false);
    setError("");
    setSuccess("");
  }

  function closeForms() {
    setShowEapForm(false);
    setShowCronForm(false);
    setEditingEap(false);
    setEditingCron(false);
    setEapForm(initialEapForm);
    setCronForm(initialCronForm);
  }

  function updateEapForm(field, value) {
    setEapForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateCronForm(field, value) {
    setCronForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveEap() {
    if (!obraId) return setError("Selecione uma obra.");
    if (!eapForm.codigo || !eapForm.nome) {
      return setError("Preencha código e nome do item.");
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        obra_id: obraId,
        codigo: eapForm.codigo,
        nome: eapForm.nome,
        nivel: Number(eapForm.nivel),
        tipo_item: eapForm.tipo_item,
        unidade: eapForm.unidade,
        quantidade_prevista: Number(eapForm.quantidade_prevista || 0),
        ordem: Number(eapForm.ordem || 0),
      };

      if (editingEap && eapForm.id) {
        const { error } = await supabase
          .from("plan_eap_itens")
          .update(payload)
          .eq("id", eapForm.id);
        if (error) throw error;
        setSuccess("Item da EAP atualizado com sucesso.");
      } else {
        const { error } = await supabase.from("plan_eap_itens").insert(payload);
        if (error) throw error;
        setSuccess("Item da EAP criado com sucesso.");
      }

      closeForms();
      await loadPlanejamento(obraId, true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Não foi possível salvar o item da EAP.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEap(item) {
    if (!window.confirm(`Deseja excluir o item "${item.nome}"?`)) return;

    setError("");
    setSuccess("");
    try {
      const { error } = await supabase
        .from("plan_eap_itens")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setSuccess("Item excluído com sucesso.");
      await loadPlanejamento(obraId, true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Não foi possível excluir o item.");
    }
  }

  async function handleSaveCron() {
    if (!obraId) return setError("Selecione uma obra.");
    if (!cronForm.eap_item_id) return setError("Selecione um item da EAP.");
    if (!cronForm.data_inicio_prevista || !cronForm.data_fim_prevista) {
      return setError("Preencha início e fim previstos.");
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const existing = cronogramaItems.find(
        (item) => item.eap_item_id === cronForm.eap_item_id
      );

      const payload = {
        obra_id: obraId,
        eap_item_id: cronForm.eap_item_id,
        data_inicio_prevista: cronForm.data_inicio_prevista,
        data_fim_prevista: cronForm.data_fim_prevista,
        percentual_peso_fisico: Number(cronForm.percentual_peso_fisico || 0),
        percentual_peso_financeiro: Number(
          cronForm.percentual_peso_financeiro || 0
        ),
        status: cronForm.status,
      };

      if (existing) {
        const { error } = await supabase
          .from("plan_cronograma_itens")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
        setSuccess("Cronograma atualizado com sucesso.");
      } else {
        const { error } = await supabase
          .from("plan_cronograma_itens")
          .insert(payload);
        if (error) throw error;
        setSuccess("Cronograma criado com sucesso.");
      }

      closeForms();
      await loadPlanejamento(obraId, true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Não foi possível salvar o cronograma.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCron(item) {
    const existing = cronogramaItems.find((c) => c.eap_item_id === item.id);
    if (!existing) return;
    if (!window.confirm(`Deseja excluir o cronograma de "${item.nome}"?`)) return;

    setError("");
    setSuccess("");
    try {
      const { error } = await supabase
        .from("plan_cronograma_itens")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;

      setSuccess("Cronograma excluído com sucesso.");
      await loadPlanejamento(obraId, true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Não foi possível excluir o cronograma.");
    }
  }

  if (loading) {
    return (
      <Panel title="Planejamento">
        <div className="text-sm text-slate-500">Carregando planejamento...</div>
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title="Planejamento da Obra"
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
              onClick={() => loadPlanejamento(obraId, true)}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Atualizando" : "Atualizar"}
            </button>

            <button
              onClick={openNewEapForm}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Novo item
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Manutenção da EAP e do cronograma planejado da obra selecionada.
        </p>
      </Panel>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Itens da EAP"
          value={String(resumo.totalItens)}
          subtitle="Quantidade total de itens cadastrados."
          icon={Layers3}
          accent="green"
        />
        <KpiCard
          title="Itens planejados"
          value={String(resumo.totalPlanejados)}
          subtitle="Itens com cronograma já configurado."
          icon={FolderKanban}
          accent="blue"
        />
        <KpiCard
          title="Peso físico total"
          value={pct(resumo.somaPesoFisico)}
          subtitle="Soma dos pesos físicos cadastrados."
          icon={Scale}
          accent="amber"
        />
        <KpiCard
          title="Peso financeiro total"
          value={pct(resumo.somaPesoFinanceiro)}
          subtitle="Soma dos pesos financeiros cadastrados."
          icon={CalendarRange}
          accent="dark"
        />
      </div>

      {showEapForm && (
        <Panel
          title={editingEap ? "Editar item da EAP" : "Novo item da EAP"}
          right={
            <button
              onClick={closeForms}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Código</span>
              <input
                type="text"
                value={eapForm.codigo}
                onChange={(e) => updateEapForm("codigo", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Nome</span>
              <input
                type="text"
                value={eapForm.nome}
                onChange={(e) => updateEapForm("nome", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Nível</span>
              <input
                type="number"
                value={eapForm.nivel}
                onChange={(e) => updateEapForm("nivel", Number(e.target.value))}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                value={eapForm.tipo_item}
                onChange={(e) => updateEapForm("tipo_item", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              >
                <option value="macroetapa">Macroetapa</option>
                <option value="etapa">Etapa</option>
                <option value="subetapa">Subetapa</option>
                <option value="servico">Serviço</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Unidade</span>
              <input
                type="text"
                value={eapForm.unidade}
                onChange={(e) => updateEapForm("unidade", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Qtd. prevista
              </span>
              <input
                type="number"
                step="0.01"
                value={eapForm.quantidade_prevista}
                onChange={(e) =>
                  updateEapForm("quantidade_prevista", Number(e.target.value))
                }
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Ordem</span>
              <input
                type="number"
                value={eapForm.ordem}
                onChange={(e) => updateEapForm("ordem", Number(e.target.value))}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleSaveEap}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : editingEap ? "Salvar alterações" : "Criar item"}
            </button>
          </div>
        </Panel>
      )}

      {showCronForm && (
        <Panel
          title={editingCron ? "Editar cronograma" : "Novo cronograma"}
          right={
            <button
              onClick={closeForms}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Início previsto</span>
              <input
                type="date"
                value={cronForm.data_inicio_prevista}
                onChange={(e) => updateCronForm("data_inicio_prevista", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Fim previsto</span>
              <input
                type="date"
                value={cronForm.data_fim_prevista}
                onChange={(e) => updateCronForm("data_fim_prevista", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Peso físico (%)</span>
              <input
                type="number"
                step="0.01"
                value={cronForm.percentual_peso_fisico}
                onChange={(e) =>
                  updateCronForm("percentual_peso_fisico", Number(e.target.value))
                }
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Peso financeiro (%)
              </span>
              <input
                type="number"
                step="0.01"
                value={cronForm.percentual_peso_financeiro}
                onChange={(e) =>
                  updateCronForm("percentual_peso_financeiro", Number(e.target.value))
                }
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={cronForm.status}
                onChange={(e) => updateCronForm("status", e.target.value)}
                className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
              >
                <option value="nao_iniciado">Não iniciado</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="atrasado">Atrasado</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleSaveCron}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : editingCron ? "Salvar cronograma" : "Criar cronograma"}
            </button>
          </div>
        </Panel>
      )}

      <Panel title="Estrutura Analítica do Projeto (EAP) + Cronograma">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Nível</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Unid.</th>
                <th className="px-3 py-2">Qtd.</th>
                <th className="px-3 py-2">Início</th>
                <th className="px-3 py-2">Fim</th>
                <th className="px-3 py-2">Peso físico</th>
                <th className="px-3 py-2">Peso financeiro</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const badge = getStatusBadge(item.status);

                return (
                  <tr
                    key={item.id}
                    className="bg-slate-50 text-sm shadow-sm ring-1 ring-green-100"
                  >
                    <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900">
                      {item.codigo}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      <div className={getIndentClass(item.nivel)}>{item.nome}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{item.nivel}</td>
                    <td className="px-3 py-3 text-slate-600">{item.tipo_item}</td>
                    <td className="px-3 py-3 text-slate-600">{item.unidade}</td>
                    <td className="px-3 py-3 text-slate-600">{item.quantidade_prevista}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {shortDate(item.data_inicio_prevista)}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {shortDate(item.data_fim_prevista)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {pct(item.percentual_peso_fisico)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {pct(item.percentual_peso_financeiro)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditEapForm(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          EAP
                        </button>

                        <button
                          onClick={() => openCronForm(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          <CalendarRange className="h-3.5 w-3.5" />
                          Cronograma
                        </button>

                        <button
                          onClick={() => handleDeleteEap(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>

                        {item.cronograma_id ? (
                          <button
                            onClick={() => handleDeleteCron(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover cron.
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-green-100"
                  >
                    Nenhum item encontrado para a obra selecionada.
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