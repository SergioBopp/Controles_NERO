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

function toAppModel(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome,
    obraId: row.obra_id || null,
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
  if (isOnlineDatabaseReady()) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("atualizado_em", { ascending: false });

    if (!error) {
      return (data || []).map(toAppModel);
    }

    console.warn("Falha Supabase. Usando localStorage.", error);
  }

  return readLocal();
}

export async function salvarComposicaoBDI(composicao) {
  const agora = new Date().toISOString();

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
      return toAppModel(result.data);
    }

    console.warn("Erro Supabase. Salvando localmente.", result.error);
  }

  const local = readLocal();

  const registro = {
    ...composicao,
    id: composicao.id || `bdi-${Date.now()}`,
    origem: "local",
    criadoEm: composicao.criadoEm || agora,
    atualizadoEm: agora,
  };

  const semMesmoRegistro = local.filter(
    (item) => item.id !== registro.id
  );

  writeLocal([registro, ...semMesmoRegistro]);

  return registro;
}

export async function excluirComposicaoBDI(
  id,
  origem = "supabase"
) {
  if (isOnlineDatabaseReady() && origem === "supabase") {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", id);

    if (!error) return true;
  }

  const local = readLocal();

  writeLocal(
    local.filter((item) => item.id !== id)
  );

  return true;
}

export async function duplicarComposicaoBDI(composicao) {
  const agora = new Date().toISOString();

  const duplicada = {
    ...composicao,
    id: null,
    nome: `${composicao.nome} - cópia`,
    criadoEm: agora,
    atualizadoEm: agora,
    origem: undefined,
  };

  return salvarComposicaoBDI(duplicada);
}