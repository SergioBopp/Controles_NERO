const CUSTOM_TEMPLATE_KEY = "nero_bdi_custom_templates_v1";

function readCustomTemplates() {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomTemplates(templates) {
  localStorage.setItem(CUSTOM_TEMPLATE_KEY, JSON.stringify(templates));
}

export function listarModelosPersonalizadosBDI() {
  return readCustomTemplates();
}

export function salvarModeloPersonalizadoBDI({ nome, categoria, descricao, custoDireto, items, resumo }) {
  const agora = new Date().toISOString();

  const modelo = {
    id: `custom-${Date.now()}`,
    origem: "personalizado",
    nome: nome?.trim() || "Modelo personalizado",
    categoria: categoria?.trim() || "Personalizado",
    descricao: descricao?.trim() || "Modelo personalizado criado a partir de uma composição do NERO.",
    resumo: {
      custo: Number(resumo?.custo || custoDireto || 0),
      bdi: Number(resumo?.bdi || 0),
      tributos: Number(resumo?.tributos || 0),
      valorBdi: Number(resumo?.valorBdi || 0),
      precoVenda: Number(resumo?.precoVenda || 0),
    },
    items: Array.isArray(items) ? items : [],
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const atuais = readCustomTemplates();
  const semMesmoNome = atuais.filter(
    (item) => String(item.nome || "").toLowerCase() !== modelo.nome.toLowerCase()
  );

  writeCustomTemplates([modelo, ...semMesmoNome]);
  return modelo;
}

export function excluirModeloPersonalizadoBDI(id) {
  const atuais = readCustomTemplates();
  writeCustomTemplates(atuais.filter((item) => item.id !== id));
}
