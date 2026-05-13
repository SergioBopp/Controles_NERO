const REVISION_KEY = "nero_bdi_model_revision_history_v1";

function readRevisionStorage() {
  try {
    const raw = localStorage.getItem(REVISION_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRevisionStorage(data) {
  localStorage.setItem(REVISION_KEY, JSON.stringify(data));
}

export function obterHistoricoRevisoesBDI(templateId) {
  const storage = readRevisionStorage();

  return Array.isArray(storage[templateId])
    ? storage[templateId]
    : [];
}

export function registrarNovaRevisaoBDI(template) {
  if (!template?.id) return null;

  const storage = readRevisionStorage();
  const historico = obterHistoricoRevisoesBDI(template.id);

  const numeroAtual = historico.length;
  const novaRev = `REV ${String(numeroAtual).padStart(2, "0")}`;

  const revisao = {
    revisao: novaRev,
    data: new Date().toLocaleDateString("pt-BR"),
    observacao:
      historico.length === 0
        ? "Modelo criado."
        : "Nova revisão registrada.",
  };

  storage[template.id] = [...historico, revisao];

  writeRevisionStorage(storage);

  return revisao;
}
