import { supabase, isSupabaseConfigured } from "../../src/supabase";

const TABLE_NAME = "bdi_composicoes";
const LOCAL_STORAGE_KEY = "nero_bdi_composicoes_v1";
const LOAD_KEY = "nero_bdi_composicao_para_carregar_v1";

function isOnlineDatabaseReady() {
  return Boolean(isSupabaseConfigured && supabase);
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

function normalizeLocalModel(item) {
  return {
    ...item,
    origem: item.origem || "local",
    atualizadoEm: item.atualizadoEm || item.atualizado_em || new Date().toISOString(),
    criadoEm: item.criadoEm || item.criado_em || new Date().toISOString(),
  };
}

function toAppModel(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome,
    obraId: row.obra_id || null,
    custoDireto: row.resumo?.custo || "1000000",
    items: Array.isArray(row.items) ? row.items : [],
    resumo: row.resumo || {},
    observacoes: row.observacoes || "",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    origem: "supabase",
  };
}

function toDbPayload(composicao) {
  return {
    obra_id: composicao.obraId || null,
    nome: composicao.nome,
    resumo: composicao.resumo || {},
    items: composicao.items || [],
    observacoes: composicao.observacoes || null,
    atualizado_em: new Date().toISOString(),
  };
}

function mergeCompositions(supabaseItems = [], localItems = []) {
  const map = new Map();

  [...localItems.map(normalizeLocalModel), ...supabaseItems].forEach((item) => {
    if (!item) return;

    const key = String(item.id || item.nome || Date.now());

    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      return;
    }

    const existingDate = new Date(existing.atualizadoEm || existing.atualizado_em || 0).getTime();
    const itemDate = new Date(item.atualizadoEm || item.atualizado_em || 0).getTime();

    if (itemDate >= existingDate) {
      map.set(key, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(a.atualizadoEm || a.atualizado_em || 0).getTime();
    const db = new Date(b.atualizadoEm || b.atualizado_em || 0).getTime();
    return db - da;
  });
}

function upsertLocal(composicao) {
  const local = readLocal();
  const registro = normalizeLocalModel(composicao);

  const withoutSameId = local.filter((item) => item.id !== registro.id);
  const withoutSameName = withoutSameId.filter(
    (item) => String(item.nome || "").toLowerCase() !== String(registro.nome || "").toLowerCase()
  );

  writeLocal([registro, ...withoutSameName]);

  return registro;
}

export function prepararComposicaoParaCarregar(composicao) {
  localStorage.setItem(LOAD_KEY, JSON.stringify(composicao));
}

export function consumirComposicaoParaCarregar() {
  try {
    const raw = localStorage.getItem(LOAD_KEY);
    if (!raw) return null;

    const composicao = JSON.parse(raw);
    localStorage.removeItem(LOAD_KEY);

    return composicao;
  } catch {
    localStorage.removeItem(LOAD_KEY);
    return null;
  }
}

export async function listarComposicoesBDI() {
  const local = readLocal().map(normalizeLocalModel);

  if (isOnlineDatabaseReady()) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("atualizado_em", { ascending: false });

    if (!error) {
      const online = (data || []).map(toAppModel).filter(Boolean);
      return mergeCompositions(online, local);
    }

    console.warn("Falha ao listar BDI no Supabase. Usando localStorage.", error);
  }

  return local;
}

export async function salvarComposicaoBDI(composicao) {
  const agora = new Date().toISOString();

  const localDraft = {
    ...composicao,
    id: composicao.id || `bdi-${Date.now()}`,
    origem: composicao.origem || "local",
    criadoEm: composicao.criadoEm || agora,
    atualizadoEm: agora,
  };

  let localRegistro = upsertLocal(localDraft);

  if (isOnlineDatabaseReady()) {
    const payload = toDbPayload(composicao);

    let result;

    if (composicao.id && composicao.origem === "supabase") {
      result = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq("id", composicao.id)
        .select("*")
        .single();
    } else {
      result = await supabase
        .from(TABLE_NAME)
        .insert({
          ...payload,
          criado_em: agora,
        })
        .select("*")
        .single();
    }

    if (!result.error) {
      const onlineRegistro = toAppModel(result.data);
      upsertLocal(onlineRegistro);
      return onlineRegistro;
    }

    console.warn("Falha ao salvar BDI no Supabase. Mantendo cópia local.", result.error);
  }

  return localRegistro;
}

export async function excluirComposicaoBDI(id, origem = "supabase") {
  const local = readLocal();
  writeLocal(local.filter((item) => item.id !== id));

  if (isOnlineDatabaseReady() && origem === "supabase") {
    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

    if (error) {
      console.warn("Falha ao excluir BDI no Supabase. Excluído localmente.", error);
    }
  }

  return true;
}

export async function duplicarComposicaoBDI(composicao) {
  const agora = new Date().toISOString();

  const duplicada = {
    ...composicao,
    id: null,
    nome: `${composicao.nome || "Composição"} - cópia`,
    criadoEm: agora,
    atualizadoEm: agora,
    origem: undefined,
  };

  return salvarComposicaoBDI(duplicada);
}
