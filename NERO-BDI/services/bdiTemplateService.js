export function aplicarTemplateBDI(template) {
  return {
    id: null,
    origem: null,
    nome: `${template.nome} - Novo`,
    custoDireto: String(template.resumo?.custo || "1000000"),
    items: template.items || [],
    resumo: template.resumo || {},
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    revisao: "REV 00",
    historicoRevisoes: [
      {
        revisao: "REV 00",
        data: new Date().toLocaleDateString("pt-BR"),
        responsavel: "NERO Construções",
        observacao: `Modelo técnico aplicado: ${template.nome}.`,
      },
    ],
  };
}
