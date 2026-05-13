const CUSTOM_TEMPLATE_KEY = "nero_bdi_custom_templates_v1";

export function listarModelosPersonalizadosBDI() {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function salvarModeloPersonalizadoBDI(template) {
  const atuais = listarModelosPersonalizadosBDI();

  const modelo = {
    ...template,
    id: template?.id || `custom-${Date.now()}`,
    origem: "personalizado",
    criadoEm: template?.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  const semMesmoId = atuais.filter((item) => item.id !== modelo.id);

  localStorage.setItem(
    CUSTOM_TEMPLATE_KEY,
    JSON.stringify([modelo, ...semMesmoId])
  );

  return modelo;
}

export function duplicarModeloBDI(template) {
  if (!template) return null;

  const duplicated = {
    ...template,
    id: `custom-copy-${Date.now()}`,
    origem: "personalizado",
    nome: `Cópia de ${template.nome || "Modelo BDI"}`,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  return salvarModeloPersonalizadoBDI(duplicated);
}

export function excluirModeloPersonalizadoBDI(id) {
  if (!id) return false;

  const atuais = listarModelosPersonalizadosBDI();
  const atualizados = atuais.filter((item) => item.id !== id);

  localStorage.setItem(
    CUSTOM_TEMPLATE_KEY,
    JSON.stringify(atualizados)
  );

  return true;
}
