import React, { useEffect, useMemo, useState } from "react";
import Panel from "../../components/Panel";
import { supabase } from "../../supabase";

export default function PlanejamentoEAP({ obraId, obraNome }) {
  const [itens, setItens] = useState([]);
  const [novoItem, setNovoItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subitemAberto, setSubitemAberto] = useState(null);
  const [novoSubitem, setNovoSubitem] = useState("");

  async function garantirPlanObraId() {
    if (!obraId) {
      throw new Error("Selecione uma obra antes de usar a EAP.");
    }

    const { data: existente, error: erroBusca } = await supabase
      .from("plan_obras")
      .select("id")
      .eq("obra_principal_id", obraId)
      .maybeSingle();

    if (erroBusca) {
      throw erroBusca;
    }

    if (existente?.id) {
      return existente.id;
    }

    const { data: obraPrincipal, error: erroObra } = await supabase
      .from("obras")
      .select("id, nome")
      .eq("id", obraId)
      .single();

    if (erroObra) {
      throw erroObra;
    }

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

        if (erroBusca2) {
          throw erroBusca2;
        }

        return existente2.id;
      }

      throw erroCriacao;
    }

    return criada.id;
  }

  async function carregarEAP() {
    if (!obraId) {
      setItens([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const planObraId = await garantirPlanObraId();

      const { data, error } = await supabase
        .from("plan_eap_itens")
        .select("*")
        .eq("obra_id", planObraId)
        .order("nivel", { ascending: true })
        .order("nome", { ascending: true });

      if (error) {
        throw error;
      }

      setItens(data || []);
    } catch (err) {
      console.error("ERRO AO CARREGAR EAP:", err);
      setItens([]);
      setError(err.message || "Erro ao carregar EAP.");
    } finally {
      setLoading(false);
    }
  }

  async function adicionarItem({ nome, parentId = null, nivel = 1 }) {
    if (!nome.trim()) return;

    if (!obraId) {
      alert("Selecione uma obra antes de cadastrar itens da EAP.");
      return;
    }

    setSaving(true);

    try {
      const planObraId = await garantirPlanObraId();

      const { error } = await supabase
        .from("plan_eap_itens")
        .insert({
          obra_id: planObraId,
          nome: nome.trim(),
          nivel,
          parent_id: parentId,
        });

      if (error) {
        throw error;
      }

      setNovoItem("");
      setNovoSubitem("");
      setSubitemAberto(null);
      await carregarEAP();
    } catch (err) {
      console.error("ERRO AO INSERIR:", err);
      alert("Erro ao salvar: " + (err.message || "Falha ao inserir item."));
    } finally {
      setSaving(false);
    }
  }

  async function excluirRecursivo(id) {
    const filhos = itens.filter((item) => item.parent_id === id);

    for (const filho of filhos) {
      await excluirRecursivo(filho.id);
    }

    const { error } = await supabase
      .from("plan_eap_itens")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  async function handleExcluir(id) {
    try {
      await excluirRecursivo(id);
      await carregarEAP();
    } catch (err) {
      console.error("ERRO AO EXCLUIR:", err);
      alert("Erro ao excluir: " + (err.message || "Falha ao excluir item."));
    }
  }

  useEffect(() => {
    carregarEAP();
  }, [obraId]);

  const itensPorPai = useMemo(() => {
    const mapa = new Map();

    for (const item of itens) {
      const chave = item.parent_id || "root";
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(item);
    }

    return mapa;
  }, [itens]);

  function renderItens(parentId = null, depth = 0, prefixoPai = "") {
    const chave = parentId || "root";
    const lista = itensPorPai.get(chave) || [];

    return lista.map((item, index) => {
      const numeracao = prefixoPai ? `${prefixoPai}.${index + 1}` : `${index + 1}`;
      const filhos = itensPorPai.get(item.id) || [];

      return (
        <div key={item.id} className="space-y-2">
          <div
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            style={{ marginLeft: `${depth * 24}px` }}
          >
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Nível {item.nivel}
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {numeracao} - {item.nome}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSubitemAberto(subitemAberto === item.id ? null : item.id)
                }
                className="rounded-lg border border-emerald-200 px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
              >
                + Subitem
              </button>

              <button
                onClick={() => handleExcluir(item.id)}
                className="rounded-lg border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Excluir
              </button>
            </div>
          </div>

          {subitemAberto === item.id && (
            <div
              className="flex gap-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-3"
              style={{ marginLeft: `${(depth + 1) * 24}px` }}
            >
              <input
                placeholder={`Novo subitem de ${item.nome}`}
                value={novoSubitem}
                onChange={(e) => setNovoSubitem(e.target.value)}
                className="min-w-[280px] rounded-xl border border-emerald-200 px-3 py-2 text-sm"
              />
              <button
                onClick={() =>
                  adicionarItem({
                    nome: novoSubitem,
                    parentId: item.id,
                    nivel: (item.nivel || 1) + 1,
                  })
                }
                disabled={!novoSubitem.trim() || saving}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar subitem"}
              </button>
            </div>
          )}

          {filhos.length > 0 && renderItens(item.id, depth + 1, numeracao)}
        </div>
      );
    });
  }

  return (
    <Panel title="Estrutura Analítica do Projeto (EAP)">
      <div className="mb-2 text-sm text-slate-500">
        Obra selecionada: <strong>{obraNome || "Nenhuma obra selecionada"}</strong>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          placeholder="Nome do item principal"
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          className="min-w-[280px] rounded-xl border border-green-200 px-3 py-2 text-sm"
        />
        <button
          onClick={() => adicionarItem({ nome: novoItem, parentId: null, nivel: 1 })}
          disabled={!novoItem.trim() || !obraId || saving}
          className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Adicionar"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">Carregando itens da EAP...</p>
      ) : itens.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhum item cadastrado na EAP.</p>
      ) : (
        <div className="space-y-3">{renderItens()}</div>
      )}
    </Panel>
  );
}
