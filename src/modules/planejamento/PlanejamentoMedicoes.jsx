import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  ClipboardList,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
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
import { supabase } from "../../supabase";
import { money, pct, shortDate } from "../../data/formatters";

const initialPeriodoForm = {
  id: "",
  competencia: "",
  data_inicio: "",
  data_fim: "",
};

const initialMedicaoForm = {
  id: "",
  periodo_id: "",
  eap_item_id: "",
  valor_previsto: 0,
  valor_real: 0,
  percentual_previsto: 0,
  percentual_real: 0,
};

function agruparMedicoesPorPeriodo(periodos, medicoes) {
  const grouped = {};

  for (const med of medicoes || []) {
    if (!grouped[med.periodo_id]) {
      grouped[med.periodo_id] = {
        valor_previsto: 0,
        valor_real: 0,
        percentual_previsto: 0,
        percentual_real: 0,
        itens_medidos: 0,
      };
    }

    grouped[med.periodo_id].valor_previsto += Number(med.valor_previsto || 0);
    grouped[med.periodo_id].valor_real += Number(med.valor_real || 0);
    grouped[med.periodo_id].percentual_previsto += Number(
      med.percentual_previsto || 0
    );
    grouped[med.periodo_id].percentual_real += Number(med.percentual_real || 0);
    grouped[med.periodo_id].itens_medidos += 1;
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
      itens_medidos: 0,
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
      itens_medidos: resumo.itens_medidos,
      valor_previsto_acumulado: acumuladoPrevisto,
      valor_real_acumulado: acumuladoReal,
      percentual_previsto_acumulado: acumuladoFisicoPrevisto,
      percentual_real_acumulado: acumuladoFisicoReal,
      desvio_financeiro: resumo.valor_real - resumo.valor_previsto,
      desvio_acumulado: acumuladoReal - acumuladoPrevisto,
      desvio_fisico: resumo.percentual_real - resumo.percentual_previsto,
      desvio_fisico_acumulado: acumuladoFisicoReal - acumuladoFisicoPrevisto,
    };
  });
}

function getPeriodoStatus(periodo) {
  if (periodo.valor_real > periodo.valor_previsto) {
    return {
      label: "Acima do previsto",
      className: "bg-red-50 text-red-700 ring-red-200",
    };
  }

  if (periodo.valor_real < periodo.valor_previsto) {
    return {
      label: "Abaixo do previsto",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  }

  return {
    label: "Aderente",
    className: "bg-green-50 text-green-700 ring-green-200",
  };
}

function getDiagnostico(ultimaLinha) {
  if (!ultimaLinha) {
    return {
      status: "Sem dados",
      tone: "text-slate-700 bg-slate-50 ring-slate-200",
      leitura: "Ainda não há medições suficientes para leitura executiva.",
    };
  }

  const desvioFisico = Number(ultimaLinha.desvio_fisico_acumulado || 0);
  const desvioFinanceiro = Number(ultimaLinha.desvio_acumulado || 0);

  if (desvioFisico < -5 && desvioFinanceiro < 0) {
    return {
      status: "Crítico",
      tone: "text-red-700 bg-red-50 ring-red-200",
      leitura:
        "A obra está atrasada fisicamente e consumindo menos que o planejado. O padrão sugere subexecução frente ao cronograma.",
    };
  }

  if (desvioFisico < 0 && desvioFinanceiro >= 0) {
    return {
      status: "Alerta",
      tone: "text-amber-700 bg-amber-50 ring-amber-200",
      leitura:
        "A obra apresenta atraso físico com gasto igual ou acima do previsto. Vale revisar produtividade e frentes executivas.",
    };
  }

  if (desvioFisico >= 0 && desvioFinanceiro > 0) {
    return {
      status: "Atenção custo",
      tone: "text-orange-700 bg-orange-50 ring-orange-200",
      leitura:
        "O avanço físico está aderente ou adiantado, porém com custo acima do previsto. Recomenda-se revisar desvios financeiros.",
    };
  }

  return {
    status: "Controlado",
    tone: "text-green-700 bg-green-50 ring-green-200",
    leitura:
      "A obra está sob controle, com comportamento físico-financeiro dentro da faixa esperada para a medição atual.",
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

function formatEapLabel(item) {
  if (!item) return "—";
  const codigo = item?.codigo ? `${item.codigo} - ` : "";
  const nivel = item?.nivel ? `N${item.nivel} · ` : "";
  return `${nivel}${codigo}${item?.nome || "—"}`;
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function PlanejamentoMedicoes({ obraId, obraNome }) {
  const [periodos, setPeriodos] = useState([]);
  const [medicoes, setMedicoes] = useState([]);
  const [eapItems, setEapItems] = useState([]);

  const [showPeriodoModal, setShowPeriodoModal] = useState(false);
  const [showMedicaoModal, setShowMedicaoModal] = useState(false);

  const [editingPeriodo, setEditingPeriodo] = useState(false);
  const [editingMedicao, setEditingMedicao] = useState(false);

  const [periodoForm, setPeriodoForm] = useState(initialPeriodoForm);
  const [medicaoForm, setMedicaoForm] = useState(initialMedicaoForm);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function garantirPlanObraId() {
    if (!obraId) {
      throw new Error("Selecione uma obra antes de usar medições.");
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
    setSuccess("");
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
      setError(err?.message || "Erro ao carregar dados de medições.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const rows = useMemo(
    () => agruparMedicoesPorPeriodo(periodos, medicoes),
    [periodos, medicoes]
  );

  const curvaFinanceira = useMemo(
    () =>
      rows.map((r) => ({
        name: r.competencia,
        previsto: r.valor_previsto_acumulado,
        real: r.valor_real_acumulado,
      })),
    [rows]
  );

  const curvaFisica = useMemo(
    () =>
      rows.map((r) => ({
        name: r.competencia,
        previsto: r.percentual_previsto_acumulado,
        real: r.percentual_real_acumulado,
      })),
    [rows]
  );

  const ultimaLinha = rows.length ? rows[rows.length - 1] : null;
  const diagnostico = getDiagnostico(ultimaLinha);

  const mensagemBloqueioMedicao = !obraId
    ? "Selecione uma obra para continuar."
    : eapItems.length === 0
    ? "Cadastre itens da EAP antes de lançar medições."
    : periodos.length === 0
    ? "A obra possui EAP cadastrada, mas ainda não possui período de medição."
    : "";

  const resumo = useMemo(() => {
    const totalPeriodos = rows.length;
    const totalItensMedidos = rows.reduce(
      (acc, item) => acc + Number(item.itens_medidos || 0),
      0
    );
    const previstoTotal = rows.reduce(
      (acc, item) => acc + Number(item.valor_previsto || 0),
      0
    );
    const realTotal = rows.reduce(
      (acc, item) => acc + Number(item.valor_real || 0),
      0
    );

    return {
      totalPeriodos,
      totalItensMedidos,
      previstoTotal,
      realTotal,
      desvioTotal: realTotal - previstoTotal,
    };
  }, [rows]);

  const medicoesDetalhadas = useMemo(() => {
    const periodoMap = new Map(periodos.map((p) => [p.id, p]));
    const eapMap = new Map(eapItems.map((e) => [e.id, e]));

    return medicoes.map((med) => ({
      ...med,
      competencia: periodoMap.get(med.periodo_id)?.competencia || "—",
      item_nome: formatEapLabel(eapMap.get(med.eap_item_id)),
    }));
  }, [medicoes, periodos, eapItems]);

  function openPeriodoForm() {
    if (!obraId) {
      setError("Selecione uma obra antes de criar um período.");
      return;
    }
    setEditingPeriodo(false);
    setPeriodoForm(initialPeriodoForm);
    setShowPeriodoModal(true);
    setShowMedicaoModal(false);
    setError("");
    setSuccess("");
  }

  function openPeriodoEditForm(periodo) {
    setEditingPeriodo(true);
    setPeriodoForm({
      id: periodo.id,
      competencia: periodo.competencia || "",
      data_inicio: periodo.data_inicio || "",
      data_fim: periodo.data_fim || "",
    });
    setShowPeriodoModal(true);
    setShowMedicaoModal(false);
    setError("");
    setSuccess("");
  }

  function openMedicaoForm() {
    if (!obraId) {
      setError("Selecione uma obra antes de criar uma medição.");
      return;
    }
    if (!periodos.length) {
      setError("A obra possui EAP cadastrada, mas ainda não possui período de medição.");
      return;
    }
    if (!eapItems.length) {
      setError("Cadastre itens da EAP antes de lançar medições.");
      return;
    }

    setEditingMedicao(false);
    setMedicaoForm({
      ...initialMedicaoForm,
      periodo_id: periodos[0]?.id || "",
      eap_item_id: eapItems[0]?.id || "",
    });
    setShowMedicaoModal(true);
    setShowPeriodoModal(false);
    setError("");
    setSuccess("");
  }

  function openMedicaoEditForm(med) {
    setEditingMedicao(true);
    setMedicaoForm({
      id: med.id,
      periodo_id: med.periodo_id || "",
      eap_item_id: med.eap_item_id || "",
      valor_previsto: Number(med.valor_previsto || 0),
      valor_real: Number(med.valor_real || 0),
      percentual_previsto: Number(med.percentual_previsto || 0),
      percentual_real: Number(med.percentual_real || 0),
    });
    setShowMedicaoModal(true);
    setShowPeriodoModal(false);
    setError("");
    setSuccess("");
  }

  function closeForms() {
    setShowPeriodoModal(false);
    setShowMedicaoModal(false);
    setEditingPeriodo(false);
    setEditingMedicao(false);
    setPeriodoForm(initialPeriodoForm);
    setMedicaoForm(initialMedicaoForm);
  }

  function updatePeriodo(field, value) {
    setPeriodoForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateMedicao(field, value) {
    setMedicaoForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSavePeriodo() {
    if (!obraId) {
      return setError("Selecione uma obra antes de salvar.");
    }

    if (!periodoForm.competencia) {
      return setError("Informe a competência.");
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const planObraId = await garantirPlanObraId();

      const payload = {
        obra_id: planObraId,
        competencia: periodoForm.competencia,
        data_inicio: periodoForm.data_inicio || null,
        data_fim: periodoForm.data_fim || null,
      };

      if (editingPeriodo && periodoForm.id) {
        const { error } = await supabase
          .from("plan_periodos_medicao")
          .update(payload)
          .eq("id", periodoForm.id);

        if (error) throw error;
        setSuccess("Período atualizado com sucesso.");
      } else {
        const { error } = await supabase
          .from("plan_periodos_medicao")
          .insert(payload);

        if (error) throw error;
        setSuccess("Período criado com sucesso.");
      }

      closeForms();
      await loadData(true);
    } catch (err) {
      console.error("Erro real ao salvar período:", err);
      setError(err?.message || JSON.stringify(err) || "Erro ao salvar período.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePeriodo(id) {
    if (!window.confirm("Excluir período?")) return;

    try {
      const { error } = await supabase
        .from("plan_periodos_medicao")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSuccess("Período excluído com sucesso.");
      await loadData(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Erro ao excluir período.");
    }
  }

  async function handleSaveMedicao() {
    if (!obraId) {
      return setError("Selecione uma obra antes de salvar.");
    }

    if (!medicaoForm.periodo_id || !medicaoForm.eap_item_id) {
      return setError("Selecione período e item da EAP.");
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const planObraId = await garantirPlanObraId();

      const payload = {
        obra_id: planObraId,
        periodo_id: medicaoForm.periodo_id,
        eap_item_id: medicaoForm.eap_item_id,
        valor_previsto: Number(medicaoForm.valor_previsto || 0),
        valor_real: Number(medicaoForm.valor_real || 0),
        percentual_previsto: Number(medicaoForm.percentual_previsto || 0),
        percentual_real: Number(medicaoForm.percentual_real || 0),
      };

      if (editingMedicao && medicaoForm.id) {
        const { error } = await supabase
          .from("plan_medicoes_itens")
          .update(payload)
          .eq("id", medicaoForm.id);

        if (error) throw error;
        setSuccess("Lançamento de medição atualizado com sucesso.");
      } else {
        const { error } = await supabase
          .from("plan_medicoes_itens")
          .insert(payload);

        if (error) throw error;
        setSuccess("Lançamento de medição salvo com sucesso.");
      }

      closeForms();
      await loadData(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Erro ao salvar medição.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMedicao(id) {
    if (!window.confirm("Excluir lançamento de medição?")) return;

    try {
      const { error } = await supabase
        .from("plan_medicoes_itens")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSuccess("Lançamento excluído com sucesso.");
      await loadData(true);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Erro ao excluir lançamento.");
    }
  }

  if (loading) {
    return <Panel title="Medições">Carregando...</Panel>;
  }

  return (
    <>
      <Panel
        title="Períodos de Medição"
        right={
          <div className="flex flex-wrap items-center gap-2">
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

            <button
              onClick={openPeriodoForm}
              disabled={!obraId}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Novo período
            </button>

            <button
              onClick={openMedicaoForm}
              disabled={!obraId || !!mensagemBloqueioMedicao}
              className="inline-flex items-center gap-1 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ClipboardList className="h-4 w-4" />
              Nova medição
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Gestão de competências e lançamentos de medição por item da EAP.
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

        {!error && mensagemBloqueioMedicao ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {mensagemBloqueioMedicao}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Competências"
          value={String(resumo.totalPeriodos)}
          subtitle="Quantidade de períodos de medição cadastrados."
          icon={CalendarRange}
          accent="green"
        />
        <KpiCard
          title="Itens medidos"
          value={String(resumo.totalItensMedidos)}
          subtitle="Quantidade total de lançamentos de medição."
          icon={ClipboardList}
          accent="blue"
        />
        <KpiCard
          title="Previsto total"
          value={money(resumo.previstoTotal)}
          subtitle="Soma do valor previsto em todos os períodos."
          icon={Save}
          accent="amber"
        />
        <KpiCard
          title="Desvio total"
          value={money(resumo.desvioTotal)}
          subtitle="Diferença total entre real e previsto."
          icon={Trash2}
          accent="red"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Leitura Executiva da Medição">
          <div className="space-y-4">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${diagnostico.tone}`}
            >
              {diagnostico.status}
            </div>

            <p className="text-sm leading-6 text-slate-700">
              {diagnostico.leitura}
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Última competência
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {ultimaLinha?.competencia || "—"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {ultimaLinha
                    ? `${shortDate(ultimaLinha.data_inicio)} → ${shortDate(
                        ultimaLinha.data_fim
                      )}`
                    : "Sem período consolidado"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Desvio físico acumulado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {pct(ultimaLinha?.desvio_fisico_acumulado || 0)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Diferença entre avanço real e previsto.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Previsto acumulado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {money(ultimaLinha?.valor_previsto_acumulado || 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Real acumulado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {money(ultimaLinha?.valor_real_acumulado || 0)}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Desvio Financeiro por Período">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" />
                <YAxis
                  tickFormatter={(value) =>
                    `R$ ${Number(value).toLocaleString("pt-BR")}`
                  }
                />
                <Tooltip content={<MoneyTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar
                  dataKey="desvio_financeiro"
                  name="Desvio no período"
                  fill="#f59e0b"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Curva S Financeira">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curvaFinanceira}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="previsto"
                  name="Previsto"
                  stroke="#16a34a"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="real"
                  name="Real"
                  stroke="#0f172a"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Curva S Física">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curvaFisica}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<PercentTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="previsto"
                  name="Previsto"
                  stroke="#f59e0b"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="real"
                  name="Real"
                  stroke="#16a34a"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Modal
        open={showPeriodoModal}
        title={editingPeriodo ? "Editar Período" : "Novo Período de Medição"}
        onClose={closeForms}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Competência
            </label>
            <input
              placeholder="Ex: 2026-S22"
              value={periodoForm.competencia}
              onChange={(e) => updatePeriodo("competencia", e.target.value)}
              className="rounded-xl border border-green-200 px-3 py-2 text-sm w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Data início
            </label>
            <input
              type="date"
              value={periodoForm.data_inicio}
              onChange={(e) => updatePeriodo("data_inicio", e.target.value)}
              className="rounded-xl border border-green-200 px-3 py-2 text-sm w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Data fim
            </label>
            <input
              type="date"
              value={periodoForm.data_fim}
              onChange={(e) => updatePeriodo("data_fim", e.target.value)}
              className="rounded-xl border border-green-200 px-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeForms}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSavePeriodo}
            disabled={saving || !obraId}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Salvando..."
              : editingPeriodo
              ? "Salvar alterações"
              : "Salvar período"}
          </button>
        </div>
      </Modal>

      <Modal
        open={showMedicaoModal}
        title={
          editingMedicao
            ? "Editar Lançamento de Medição"
            : "Novo Lançamento de Medição"
        }
        onClose={closeForms}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Período</label>
            <select
              value={medicaoForm.periodo_id}
              onChange={(e) => updateMedicao("periodo_id", e.target.value)}
              className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
            >
              <option value="">Selecione o período</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.competencia}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Item da EAP</label>
            <select
              value={medicaoForm.eap_item_id}
              onChange={(e) => updateMedicao("eap_item_id", e.target.value)}
              className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
            >
              <option value="">Selecione o item da EAP</option>
              {eapItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatEapLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Valor previsto (R$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Ex: 10000"
              value={medicaoForm.valor_previsto}
              onChange={(e) =>
                updateMedicao("valor_previsto", Number(e.target.value))
              }
              className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Valor real (R$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Ex: 8500"
              value={medicaoForm.valor_real}
              onChange={(e) =>
                updateMedicao("valor_real", Number(e.target.value))
              }
              className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Físico previsto (%)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Ex: 100"
              value={medicaoForm.percentual_previsto}
              onChange={(e) =>
                updateMedicao("percentual_previsto", Number(e.target.value))
              }
              className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Físico real (%)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Ex: 85"
              value={medicaoForm.percentual_real}
              onChange={(e) =>
                updateMedicao("percentual_real", Number(e.target.value))
              }
              className="w-full rounded-xl border border-green-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeForms}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveMedicao}
            disabled={saving || !obraId}
            className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Salvando..."
              : editingMedicao
              ? "Salvar alterações"
              : "Salvar medição"}
          </button>
        </div>
      </Modal>

      <Panel title="Lista de Competências">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <th className="px-3 py-2">Competência</th>
                <th className="px-3 py-2">Período</th>
                <th className="px-3 py-2">Itens</th>
                <th className="px-3 py-2">Previsto</th>
                <th className="px-3 py-2">Real</th>
                <th className="px-3 py-2">Desvio</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const status = getPeriodoStatus(p);
                return (
                  <tr
                    key={p.id}
                    className="bg-slate-50 text-sm shadow-sm ring-1 ring-green-100"
                  >
                    <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900">
                      {p.competencia}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {shortDate(p.data_inicio)} → {shortDate(p.data_fim)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {p.itens_medidos}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(p.valor_previsto)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(p.valor_real)}
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      {money(p.desvio_financeiro)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="rounded-r-2xl px-3 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openPeriodoEditForm(p)}>
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </button>
                        <button onClick={() => handleDeletePeriodo(p.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-green-100"
                  >
                    Nenhuma competência encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Lançamentos de Medição">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <th className="px-3 py-2">Competência</th>
                <th className="px-3 py-2">Item da EAP</th>
                <th className="px-3 py-2">Valor previsto</th>
                <th className="px-3 py-2">Valor real</th>
                <th className="px-3 py-2">% previsto</th>
                <th className="px-3 py-2">% real</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {medicoesDetalhadas.map((med) => (
                <tr
                  key={med.id}
                  className="bg-slate-50 text-sm shadow-sm ring-1 ring-green-100"
                >
                  <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-900">
                    {med.competencia}
                  </td>
                  <td className="px-3 py-3 text-slate-900">{med.item_nome}</td>
                  <td className="px-3 py-3 text-slate-900">
                    {money(med.valor_previsto)}
                  </td>
                  <td className="px-3 py-3 text-slate-900">
                    {money(med.valor_real)}
                  </td>
                  <td className="px-3 py-3 text-slate-900">
                    {pct(med.percentual_previsto)}
                  </td>
                  <td className="px-3 py-3 text-slate-900">
                    {pct(med.percentual_real)}
                  </td>
                  <td className="rounded-r-2xl px-3 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openMedicaoEditForm(med)}>
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </button>
                      <button onClick={() => handleDeleteMedicao(med.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {medicoesDetalhadas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-green-100"
                  >
                    Nenhum lançamento de medição encontrado.
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
