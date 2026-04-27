import { useEffect, useMemo, useState } from "react";
import "./Comissionamento.css";
import { supabase } from "../../supabase";

const menuItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "obras", label: "Obras" },
  { id: "sistemas", label: "Disciplinas" },
  { id: "checklist", label: "Checklist" },
  { id: "pendencias", label: "Pendências" },
  { id: "relatorio", label: "Relatório" },
];

const initialObraForm = {
  nome: "",
  cliente: "",
  local: "",
  responsavel: "",
  status: "Em andamento",
  data_inicio: "",
  data_previsao: "",
};

const sistemasPadrao = [
  "Elétrica",
  "Hidráulica",
  "HVAC",
  "Combate a incêndio",
  "Drywall",
  "Pisos",
  "Pinturas",
  "Acabamentos",
];

const checklistPadraoPorDisciplina = {
  "Elétrica": [
    "Eletrodutos",
    "Quadros elétricos",
    "Iluminação",
    "Tomadas",
    "SPDA",
    "Aterramento",
  ],
  "Hidráulica": [
    "Água fria",
    "Esgoto",
    "Águas pluviais",
    "Drenos",
  ],
  "HVAC": [
    "Equipamentos",
    "Dutos",
    "Difusores",
    "Dreno de condensado",
    "Teste de operação",
  ],
  "Combate a incêndio": [
    "Hidrantes",
    "Sprinklers",
    "Bombas",
    "Alarme de incêndio",
    "Sinalização",
  ],
  "Drywall": [
    "Montagem de paredes",
    "Montagem de forros",
    "Tratamento de juntas",
    "Acabamento",
  ],
  "Pisos": [
    "Regularização",
    "Assentamento",
    "Rejuntamento",
    "Limpeza final",
  ],
  "Pinturas": [
    "Preparação da superfície",
    "Massa",
    "Selador",
    "Pintura final",
  ],
  "Acabamentos": [
    "Portas",
    "Rodapés",
    "Louças",
    "Metais",
    "Revisão final",
  ],
};


function ComissionamentoApp() {
  const [view, setView] = useState("dashboard");
  const [obras, setObras] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [pendencias, setPendencias] = useState([]);
  const [obraForm, setObraForm] = useState(initialObraForm);
  const [obraSelecionada, setObraSelecionada] = useState("");
  const [sistemaSelecionado, setSistemaSelecionado] = useState("");
  const [novoSistema, setNovoSistema] = useState("");
  const [novoItemChecklist, setNovoItemChecklist] = useState("");
  const [novaEvidenciaChecklist, setNovaEvidenciaChecklist] = useState("");
  const [novoLinkEvidenciaChecklist, setNovoLinkEvidenciaChecklist] = useState("");
  const [evidenciasDraft, setEvidenciasDraft] = useState({});
  const [evidenciasUrlDraft, setEvidenciasUrlDraft] = useState({});
  const [salvandoItemId, setSalvandoItemId] = useState("");
  const [filtroStatusPendencia, setFiltroStatusPendencia] = useState("Todas");
  const [filtroTextoPendencia, setFiltroTextoPendencia] = useState("");
  const [uploadingItemId, setUploadingItemId] = useState("");
  const [backupGerado, setBackupGerado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const pageTitle = useMemo(() => {
    const item = menuItems.find((menu) => menu.id === view);
    return item?.label === "Dashboard" ? "Comissionamento" : item?.label || "Comissionamento";
  }, [view]);

  const sistemasDaObra = useMemo(() => {
    if (!obraSelecionada) return [];
    return sistemas.filter((sistema) => sistema.obra_id === obraSelecionada);
  }, [sistemas, obraSelecionada]);

  const checklistDoSistema = useMemo(() => {
    if (!sistemaSelecionado) return [];
    return checklist.filter((item) => item.sistema_id === sistemaSelecionado);
  }, [checklist, sistemaSelecionado]);

  const executive = useMemo(() => {
    const totalChecklist = checklist.length;
    const ok = checklist.filter((item) => item.status === "OK").length;
    const pendente = checklist.filter((item) => !item.status || item.status === "Pendente").length;
    const naoConforme = checklist.filter((item) => item.status === "Não conforme").length;
    const progresso = totalChecklist ? Math.round((ok / totalChecklist) * 100) : 0;
    const pendenciasAbertas = pendencias.filter((p) => !p.status || p.status === "Aberta").length;
    const pendenciasResolvidas = pendencias.filter((p) => p.status === "Resolvida").length;

    const sistemasResumo = sistemas.map((sistema) => {
      const itens = checklist.filter((item) => item.sistema_id === sistema.id);
      const itensOk = itens.filter((item) => item.status === "OK").length;
      const itensNc = itens.filter((item) => item.status === "Não conforme").length;
      const percentual = itens.length ? Math.round((itensOk / itens.length) * 100) : 0;
      const obra = obras.find((o) => o.id === sistema.obra_id);

      return {
        id: sistema.id,
        nome: sistema.nome,
        obra: obra?.nome || "-",
        total: itens.length,
        ok: itensOk,
        nc: itensNc,
        percentual,
      };
    });

    return {
      totalChecklist,
      ok,
      pendente,
      naoConforme,
      progresso,
      pendenciasAbertas,
      pendenciasResolvidas,
      sistemasResumo,
    };
  }, [obras, sistemas, checklist, pendencias]);

  async function carregarDados() {
    setLoading(true);
    setFeedback("");

    const [obrasRes, sistemasRes, checklistRes, pendenciasRes] = await Promise.all([
      supabase.from("obras").select("*").order("created_at", { ascending: false }),
      supabase.from("sistemas").select("*").order("created_at", { ascending: false }),
      supabase.from("checklist").select("*").order("created_at", { ascending: false }),
      supabase.from("pendencias").select("*").order("created_at", { ascending: false }),
    ]);

    if (obrasRes.error || sistemasRes.error || checklistRes.error || pendenciasRes.error) {
      setFeedback("Erro ao carregar dados. Confira Supabase, .env e SQL.");
    } else {
      const obrasData = obrasRes.data || [];
      setObras(obrasData);
      setSistemas(sistemasRes.data || []);
      setChecklist(checklistRes.data || []);
      setPendencias(pendenciasRes.data || []);

      if (!obraSelecionada && obrasData.length > 0) {
        setObraSelecionada(obrasData[0].id);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (!obraSelecionada) {
      setSistemaSelecionado("");
      return;
    }

    const sistemasAtuais = sistemas.filter((sistema) => sistema.obra_id === obraSelecionada);

    if (sistemasAtuais.length === 0) {
      setSistemaSelecionado("");
      return;
    }

    if (!sistemasAtuais.some((sistema) => sistema.id === sistemaSelecionado)) {
      setSistemaSelecionado(sistemasAtuais[0].id);
    }
  }, [obraSelecionada, sistemas, sistemaSelecionado]);

  async function salvarObra(event) {
    event.preventDefault();
    setFeedback("");

    if (!obraForm.nome.trim()) {
      setFeedback("Informe o nome da obra.");
      return;
    }

    setLoading(true);

    const payload = {
      ...obraForm,
      nome: obraForm.nome.trim(),
      cliente: obraForm.cliente.trim() || null,
      local: obraForm.local.trim() || null,
      responsavel: obraForm.responsavel.trim() || null,
      data_inicio: obraForm.data_inicio || null,
      data_previsao: obraForm.data_previsao || null,
    };

    const { error } = await supabase.from("obras").insert(payload);

    if (error) {
      setFeedback("Erro ao cadastrar obra: " + error.message);
    } else {
      setObraForm(initialObraForm);
      setFeedback("Obra cadastrada com sucesso.");
      await carregarDados();
    }

    setLoading(false);
  }

  async function salvarSistema(event) {
    event.preventDefault();
    setFeedback("");

    if (!obraSelecionada) {
      setFeedback("Selecione uma obra antes de cadastrar a disciplina.");
      return;
    }

    if (!novoSistema.trim()) {
      setFeedback("Informe o nome da disciplina.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("sistemas").insert({
      obra_id: obraSelecionada,
      nome: novoSistema.trim(),
      status: "Pendente",
    });

    if (error) {
      setFeedback("Erro ao cadastrar disciplina: " + error.message);
    } else {
      setNovoSistema("");
      setFeedback("Disciplina cadastrada com sucesso.");
      await carregarDados();
    }

    setLoading(false);
  }

  async function criarSistemasPadrao() {
    setFeedback("");

    if (!obraSelecionada) {
      setFeedback("Selecione uma obra antes de criar as disciplinas padrão.");
      return;
    }

    const existentes = sistemas
      .filter((sistema) => sistema.obra_id === obraSelecionada)
      .map((sistema) => sistema.nome.toLowerCase().trim());

    const novos = sistemasPadrao
      .filter((nome) => !existentes.includes(nome.toLowerCase().trim()))
      .map((nome) => ({
        obra_id: obraSelecionada,
        nome,
        status: "Pendente",
      }));

    if (novos.length === 0) {
      setFeedback("Esta obra já possui todas as disciplinas padrão.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("sistemas").insert(novos);

    if (error) {
      setFeedback("Erro ao criar disciplinas padrão: " + error.message);
    } else {
      setFeedback(`${novos.length} disciplina(s) padrão criada(s) com sucesso.`);
      await carregarDados();
    }

    setLoading(false);
  }

  async function salvarChecklist(event) {
    event.preventDefault();
    setFeedback("");

    if (!obraSelecionada) {
      setFeedback("Selecione uma obra antes de cadastrar o item.");
      return;
    }

    if (!sistemaSelecionado) {
      setFeedback("Selecione uma disciplina antes de cadastrar o item.");
      return;
    }

    if (!novoItemChecklist.trim()) {
      setFeedback("Informe o nome do item do checklist.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("checklist").insert({
      sistema_id: sistemaSelecionado,
      nome: novoItemChecklist.trim(),
      status: "Pendente",
      evidencia: novaEvidenciaChecklist.trim() || null,
      evidencia_url: novoLinkEvidenciaChecklist.trim() || null,
    });

    if (error) {
      setFeedback("Erro ao cadastrar item: " + error.message);
    } else {
      setNovoItemChecklist("");
      setNovaEvidenciaChecklist("");
      setNovoLinkEvidenciaChecklist("");
      setFeedback("Item cadastrado com sucesso.");
      await carregarDados();
    }

    setLoading(false);
  }


  async function criarChecklistPadrao() {
    setFeedback("");

    if (!sistemaSelecionado) {
      setFeedback("Selecione uma disciplina antes de criar o checklist padrão.");
      return;
    }

    const disciplina = sistemas.find((sistema) => sistema.id === sistemaSelecionado);

    if (!disciplina) {
      setFeedback("Disciplina não encontrada.");
      return;
    }

    const itensPadrao = checklistPadraoPorDisciplina[disciplina.nome] || [];

    if (itensPadrao.length === 0) {
      setFeedback("Não há checklist padrão configurado para esta disciplina.");
      return;
    }

    const itensExistentes = checklist
      .filter((item) => item.sistema_id === sistemaSelecionado)
      .map((item) => item.nome.toLowerCase().trim());

    const novosItens = itensPadrao
      .filter((nome) => !itensExistentes.includes(nome.toLowerCase().trim()))
      .map((nome) => ({
        sistema_id: sistemaSelecionado,
        nome,
        status: "Pendente",
      }));

    if (novosItens.length === 0) {
      setFeedback("Esta disciplina já possui todos os itens padrão.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("checklist").insert(novosItens);

    if (error) {
      setFeedback("Erro ao criar checklist padrão: " + error.message);
    } else {
      setFeedback(`${novosItens.length} item(ns) padrão criado(s) com sucesso.`);
      await carregarDados();
    }

    setLoading(false);
  }

  async function atualizarChecklistStatus(item, novoStatus) {
    setFeedback("");
    setSalvandoItemId(item.id);

    const evidencia = evidenciasDraft[item.id] ?? item.evidencia ?? "";
    const evidenciaUrl = evidenciasUrlDraft[item.id] ?? item.evidencia_url ?? "";

    const { error } = await supabase
      .from("checklist")
      .update({
        status: novoStatus,
        evidencia,
        evidencia_url: evidenciaUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setFeedback("Erro ao atualizar checklist: " + error.message);
      setSalvandoItemId("");
      return;
    }

    if (novoStatus === "Não conforme") {
      const sistema = sistemas.find((s) => s.id === item.sistema_id);
      const obraId = sistema?.obra_id || obraSelecionada || null;
      const jaExiste = pendencias.some((pendencia) => pendencia.checklist_id === item.id);

      if (!jaExiste) {
        await supabase.from("pendencias").insert({
          obra_id: obraId,
          sistema_id: item.sistema_id,
          checklist_id: item.id,
          descricao: item.nome,
          prioridade: "Alta",
          status: "Aberta",
        });
      }
    }

    await carregarDados();
    setSalvandoItemId("");
  }

  function atualizarEvidenciaLocal(itemId, valor) {
    setEvidenciasDraft((atual) => ({
      ...atual,
      [itemId]: valor,
    }));
  }

  function atualizarEvidenciaUrlLocal(itemId, valor) {
    setEvidenciasUrlDraft((atual) => ({
      ...atual,
      [itemId]: valor,
    }));
  }

  const kpis = [
    { label: "Obras", value: obras.length, hint: "Projetos ativos" },
    { label: "Disciplinas", value: sistemas.length, hint: "Disciplinas cadastradas" },
    { label: "Avanço", value: `${executive.progresso}%`, hint: "Checklist OK" },
    { label: "Não conformes", value: executive.naoConforme, hint: "Itens críticos" },
  ];


  function getObraNome(id) {
    return obras.find((obra) => obra.id === id)?.nome || "-";
  }

  function getDisciplinaNome(id) {
    return sistemas.find((sistema) => sistema.id === id)?.nome || "-";
  }

  function getChecklistNome(id) {
    return checklist.find((item) => item.id === id)?.nome || "-";
  }

  async function atualizarPendencia(id, campo, valor) {
    setFeedback("");
    setLoading(true);

    const { error } = await supabase
      .from("pendencias")
      .update({ [campo]: valor })
      .eq("id", id);

    if (error) {
      setFeedback("Erro ao atualizar pendência: " + error.message);
    } else {
      await carregarDados();
    }

    setLoading(false);
  }

  const pendenciasAbertas = pendencias.filter((p) => !p.status || p.status === "Aberta");
  const pendenciasAndamento = pendencias.filter((p) => p.status === "Em andamento");
  const pendenciasResolvidas = pendencias.filter((p) => p.status === "Resolvida");

  const pendenciasFiltradas = pendencias.filter((pendencia) => {
    const statusAtual = pendencia.status || "Aberta";
    const atendeStatus = filtroStatusPendencia === "Todas" || statusAtual === filtroStatusPendencia;

    const texto = filtroTextoPendencia.trim().toLowerCase();
    const textoCompleto = [
      getObraNome(pendencia.obra_id),
      getDisciplinaNome(pendencia.sistema_id),
      getChecklistNome(pendencia.checklist_id),
      pendencia.descricao,
      pendencia.responsavel,
      pendencia.prioridade,
      statusAtual,
    ]
      .join(" ")
      .toLowerCase();

    return atendeStatus && (!texto || textoCompleto.includes(texto));
  });


  function limparNomeArquivo(nome) {
    return String(nome || "arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .toLowerCase();
  }

  async function uploadEvidenciaChecklist(item, arquivo) {
    setFeedback("");

    if (!arquivo) return;

    const limiteMb = 8;
    const tamanhoMb = arquivo.size / 1024 / 1024;

    if (tamanhoMb > limiteMb) {
      setFeedback(`Arquivo muito grande. Limite atual: ${limiteMb} MB.`);
      return;
    }

    setUploadingItemId(item.id);

    const sistema = sistemas.find((s) => s.id === item.sistema_id);
    const obraId = sistema?.obra_id || obraSelecionada || "sem-obra";
    const extensao = limparNomeArquivo(arquivo.name).split(".").pop() || "bin";
    const nomeArquivo = `${Date.now()}_${limparNomeArquivo(arquivo.name)}`;
    const caminho = `${obraId}/${item.sistema_id}/${item.id}/${nomeArquivo}`;

    const { error: uploadError } = await supabase.storage
      .from("evidencias")
      .upload(caminho, arquivo, {
        cacheControl: "3600",
        upsert: true,
        contentType: arquivo.type || undefined,
      });

    if (uploadError) {
      setFeedback("Erro ao enviar evidência: " + uploadError.message);
      setUploadingItemId("");
      return;
    }

    const { data } = supabase.storage.from("evidencias").getPublicUrl(caminho);
    const publicUrl = data?.publicUrl || "";

    const { error: updateError } = await supabase
      .from("checklist")
      .update({
        evidencia_url: publicUrl,
        evidencia_nome: arquivo.name,
        evidencia_tipo: arquivo.type || null,
        evidencia_path: caminho,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (updateError) {
      setFeedback("Upload feito, mas erro ao salvar link: " + updateError.message);
    } else {
      setFeedback("Evidência enviada com sucesso.");
      await carregarDados();
    }

    setUploadingItemId("");
  }

  function baixarArquivoTexto(nome, conteudo, tipo = "application/json") {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function gerarBackupInteligente() {
    const agora = new Date();
    const data = agora.toISOString().slice(0, 10);

    const backup = {
      versao: "NERO V2.5",
      gerado_em: agora.toISOString(),
      observacao: "Backup lógico do banco. Arquivos físicos do Supabase Storage devem ser exportados separadamente se o bucket não for público/permanente.",
      tabelas: {
        obras,
        disciplinas: sistemas,
        checklist,
        pendencias,
      },
      evidencias: checklist
        .filter((item) => item.evidencia_url || item.evidencia_path)
        .map((item) => ({
          checklist_id: item.id,
          item: item.nome,
          evidencia_url: item.evidencia_url || null,
          evidencia_path: item.evidencia_path || null,
          evidencia_nome: item.evidencia_nome || null,
          evidencia_tipo: item.evidencia_tipo || null,
        })),
    };

    baixarArquivoTexto(`nero_backup_${data}.json`, JSON.stringify(backup, null, 2));
    setBackupGerado(`Backup JSON gerado em ${data}.`);
  }

  function gerarManifestoEvidencias() {
    const data = new Date().toISOString().slice(0, 10);

    const linhas = [
      "obra;disciplina;item;evidencia_nome;evidencia_url;evidencia_path",
      ...checklist
        .filter((item) => item.evidencia_url || item.evidencia_path)
        .map((item) => {
          const sistema = sistemas.find((s) => s.id === item.sistema_id);
          const obra = obras.find((o) => o.id === sistema?.obra_id);
          return [
            obra?.nome || "",
            sistema?.nome || "",
            item.nome || "",
            item.evidencia_nome || "",
            item.evidencia_url || "",
            item.evidencia_path || "",
          ].map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(";");
        }),
    ];

    baixarArquivoTexto(`nero_manifesto_evidencias_${data}.csv`, linhas.join("\\n"), "text/csv;charset=utf-8");
  }



  async function excluirPendencia(pendenciaId) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir esta pendência? Esta ação não poderá ser desfeita."
    );

    if (!confirmar) return;

    setFeedback("");

    const { error } = await supabase
      .from("pendencias")
      .delete()
      .eq("id", pendenciaId);

    if (error) {
      setFeedback("Erro ao excluir pendência: " + error.message);
      return;
    }

    setFeedback("Pendência excluída com sucesso.");
    await carregarDados();
  }


  return (
    <div className="comissionamento-embed">
      <section className="comissionamento-embed-head">
        <div>
          <span className="eyebrow">Módulo operacional</span>
          <h1>{pageTitle}</h1>
        </div>

        <div className="comissionamento-embed-actions">
          <span className="status">● {loading ? "Sincronizando" : "Online"}</span>
          <button className="btn" onClick={carregarDados}>Atualizar</button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              if (view !== "relatorio") {
                setView("relatorio");
              } else {
                window.print();
              }
            }}
          >
            Gerar relatório
          </button>
        </div>
      </section>

      <nav className="comissionamento-tabs">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? "active" : ""}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="comissionamento-content">
{feedback && <div className="alert">{feedback}</div>}

          {view === "dashboard" && (
            <>
              <section className="cards">
                {kpis.map((kpi) => (
                  <div className="card" key={kpi.label}>
                    <div>
                      <h4>{kpi.label}</h4>
                      <small>{kpi.hint}</small>
                    </div>
                    <p>{kpi.value}</p>
                  </div>
                ))}
              </section>

              <section className="painel">
                <h2>Comissionamento</h2>
                <p>
                  Controle de sistemas, checklists, evidências, pendências e relatório executivo.
                </p>

                <div className="quick-grid">
                  <div>
                    <strong>Obras cadastradas</strong>
                    <span>{obras.length} registro(s)</span>
                  </div>
                  <div>
                    <strong>Disciplinas cadastradas</strong>
                    <span>{sistemas.length} registro(s)</span>
                  </div>
                  <div>
                    <strong>Pendências abertas</strong>
                    <span>{executive.pendenciasAbertas} registro(s)</span>
                  </div>
                </div>
              </section>

              <section className="page-card executive-panel">
                <div className="executive-head">
                  <div>
                    <span className="painel-title">Visão executiva</span>
                    <h2>Avanço por disciplina</h2>
                    <p>Acompanhamento consolidado do checklist por disciplina.</p>
                  </div>
                  <div className="executive-score">
                    <strong>{executive.progresso}%</strong>
                    <span>avanço geral</span>
                  </div>
                </div>

                <div className="progress-main">
                  <div className="progress-bar">
                    <div style={{ width: `${executive.progresso}%` }} />
                  </div>
                </div>

                <div className="table-wrap executive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Obra</th>
                        <th>Disciplina</th>
                        <th>Itens</th>
                        <th>OK</th>
                        <th>NC</th>
                        <th>Avanço</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executive.sistemasResumo.length === 0 ? (
                        <tr>
                          <td colSpan="6">Nenhuma disciplina cadastrada ainda.</td>
                        </tr>
                      ) : (
                        executive.sistemasResumo.map((linha) => (
                          <tr key={linha.id}>
                            <td>{linha.obra}</td>
                            <td>{linha.nome}</td>
                            <td>{linha.total}</td>
                            <td>{linha.ok}</td>
                            <td>{linha.nc}</td>
                            <td>
                              <div className="mini-progress">
                                <span>{linha.percentual}%</span>
                                <div><i style={{ width: `${linha.percentual}%` }} /></div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {view === "obras" && (
            <section className="page-card">
              <span className="painel-title">Cadastro e controle</span>
              <h2>Obras</h2>
              <p>Cadastre as obras que serão comissionadas e acompanhe o status operacional.</p>

              <form className="form-grid" onSubmit={salvarObra}>
                <input
                  placeholder="Nome da obra *"
                  value={obraForm.nome}
                  onChange={(e) => setObraForm({ ...obraForm, nome: e.target.value })}
                />
                <input
                  placeholder="Cliente"
                  value={obraForm.cliente}
                  onChange={(e) => setObraForm({ ...obraForm, cliente: e.target.value })}
                />
                <input
                  placeholder="Local"
                  value={obraForm.local}
                  onChange={(e) => setObraForm({ ...obraForm, local: e.target.value })}
                />
                <input
                  placeholder="Responsável"
                  value={obraForm.responsavel}
                  onChange={(e) => setObraForm({ ...obraForm, responsavel: e.target.value })}
                />
                <select
                  value={obraForm.status}
                  onChange={(e) => setObraForm({ ...obraForm, status: e.target.value })}
                >
                  <option>Andamento</option>
                  <option>Planejada</option>
                  <option>Concluída</option>
                  <option>Pausada</option>
                </select>
                <input
                  type="date"
                  value={obraForm.data_inicio}
                  onChange={(e) => setObraForm({ ...obraForm, data_inicio: e.target.value })}
                />
                <input
                  type="date"
                  value={obraForm.data_previsao}
                  onChange={(e) => setObraForm({ ...obraForm, data_previsao: e.target.value })}
                />
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Cadastrar obra"}
                </button>
              </form>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Obra</th>
                      <th>Cliente</th>
                      <th>Local</th>
                      <th>Responsável</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obras.length === 0 ? (
                      <tr>
                        <td colSpan="5">Nenhuma obra cadastrada ainda.</td>
                      </tr>
                    ) : (
                      obras.map((obra) => (
                        <tr key={obra.id}>
                          <td>{obra.nome}</td>
                          <td>{obra.cliente || "-"}</td>
                          <td>{obra.local || "-"}</td>
                          <td>{obra.responsavel || "-"}</td>
                          <td><span className="badge ok">{obra.status}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {view === "sistemas" && (
            <section className="page-card">
              <span className="painel-title">Cadastro por obra</span>
              <h2>Disciplinas</h2>
              <p>Cadastre e gerencie as disciplinas vinculadas a cada obra.</p>

              <div className="systems-toolbar">
                <select
                  value={obraSelecionada}
                  onChange={(e) => setObraSelecionada(e.target.value)}
                >
                  <option value="">Selecione a obra</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.nome}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={criarSistemasPadrao}
                  disabled={loading || !obraSelecionada}
                >
                  Criar disciplinas padrão
                </button>
              </div>

              <form className="systems-form" onSubmit={salvarSistema}>
                <input
                  placeholder="Nome da disciplina"
                  value={novoSistema}
                  onChange={(e) => setNovoSistema(e.target.value)}
                />
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Cadastrar disciplina"}
                </button>
              </form>

              <div className="systems-grid">
                {obraSelecionada === "" ? (
                  <div className="empty-state">Selecione uma obra para visualizar os sistemas.</div>
                ) : sistemasDaObra.length === 0 ? (
                  <div className="empty-state">Nenhuma disciplina cadastrada para esta obra.</div>
                ) : (
                  sistemasDaObra.map((sistema) => (
                    <div className="system-card" key={sistema.id}>
                      <strong>{sistema.nome}</strong>
                      <span>{sistema.status || "Pendente"}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}


          {view === "checklist" && (
            <section className="page-card">
              <span className="painel-title">Cadastro por sistema</span>
              <h2>Checklist</h2>
              <p>Cadastre os itens de verificação vinculados a cada disciplina da obra.</p>

              <div className="checklist-toolbar">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={criarChecklistPadrao}
                  disabled={loading || !sistemaSelecionado}
                >
                  Criar checklist padrão
                </button>
              </div>

              <form className="form-grid checklist-form checklist-form-evidence" onSubmit={salvarChecklist}>
                <select
                  value={obraSelecionada}
                  onChange={(e) => setObraSelecionada(e.target.value)}
                >
                  <option value="">Selecione a obra</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>
                      {obra.nome}
                    </option>
                  ))}
                </select>

                <select
                  value={sistemaSelecionado}
                  onChange={(e) => setSistemaSelecionado(e.target.value)}
                >
                  <option value="">Selecione a disciplina</option>
                  {sistemasDaObra.map((sistema) => (
                    <option key={sistema.id} value={sistema.id}>
                      {sistema.nome}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="Nome do item"
                  value={novoItemChecklist}
                  onChange={(e) => setNovoItemChecklist(e.target.value)}
                />

                <input
                  placeholder="Observação inicial"
                  value={novaEvidenciaChecklist}
                  onChange={(e) => setNovaEvidenciaChecklist(e.target.value)}
                />

                <input
                  className="evidence-url-field"
                  placeholder="Link da foto/PDF"
                  value={novoLinkEvidenciaChecklist}
                  onChange={(e) => setNovoLinkEvidenciaChecklist(e.target.value)}
                />

                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Cadastrar item"}
                </button>
              </form>

              <div className="table-wrap checklist-table">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Status</th>
                      <th>Evidência</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!sistemaSelecionado ? (
                      <tr>
                        <td colSpan="4">Selecione uma disciplina para visualizar o checklist.</td>
                      </tr>
                    ) : checklistDoSistema.length === 0 ? (
                      <tr>
                        <td colSpan="4">Nenhum item cadastrado para esta disciplina.</td>
                      </tr>
                    ) : (
                      checklistDoSistema.map((item) => (
                        <tr key={item.id}>
                          <td>{item.nome}</td>
                          <td>
                            <span className={`badge ${item.status === "OK" ? "ok" : item.status === "Não conforme" ? "bad" : "warn"}`}>
                              {item.status || "Pendente"}
                            </span>
                          </td>
                          <td>
                            <div className="evidence-box evidence-box-v25">
                              <input
                                className="evidence-input"
                                placeholder="Observação/evidência"
                                value={evidenciasDraft[item.id] ?? item.evidencia ?? ""}
                                onChange={(e) => atualizarEvidenciaLocal(item.id, e.target.value)}
                              />
                              <input
                                className="evidence-input"
                                placeholder="Link da foto/PDF"
                                value={evidenciasUrlDraft[item.id] ?? item.evidencia_url ?? ""}
                                onChange={(e) => atualizarEvidenciaUrlLocal(item.id, e.target.value)}
                              />

                              <label className="upload-evidence-button">
                                {uploadingItemId === item.id ? "Enviando..." : "Upload foto/PDF"}
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  disabled={uploadingItemId === item.id}
                                  onChange={(e) => uploadEvidenciaChecklist(item, e.target.files?.[0])}
                                />
                              </label>

                              {(evidenciasUrlDraft[item.id] || item.evidencia_url) && (
                                <a
                                  className="evidence-link"
                                  href={evidenciasUrlDraft[item.id] || item.evidencia_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir evidência
                                </a>
                              )}

                              {(item.evidencia_nome || item.evidencia_path) && (
                                <small className="evidence-file-name">
                                  {item.evidencia_nome || item.evidencia_path}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="check-actions">
                              <button type="button" className="mini-action ok" disabled={salvandoItemId === item.id} onClick={() => atualizarChecklistStatus(item, "OK")}>OK</button>
                              <button type="button" className="mini-action warn" disabled={salvandoItemId === item.id} onClick={() => atualizarChecklistStatus(item, "Pendente")}>Pendente</button>
                              <button type="button" className="mini-action bad" disabled={salvandoItemId === item.id} onClick={() => atualizarChecklistStatus(item, "Não conforme")}>NC</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {view === "pendencias" && (
            <section className="page-card pendencias-card">
              <span className="painel-title">Controle executivo de tratativas</span>
              <h2>Pendências</h2>
              <p>Gerencie não conformidades, responsáveis, prioridades e status de resolução.</p>

              <div className="quick-grid pendencias-summary">
                <button
                  type="button"
                  className={`summary-tile ${filtroStatusPendencia === "Aberta" ? "active" : ""}`}
                  onClick={() => setFiltroStatusPendencia(filtroStatusPendencia === "Aberta" ? "Todas" : "Aberta")}
                >
                  <strong>Abertas</strong>
                  <span>{pendenciasAbertas.length} registro(s)</span>
                </button>

                <button
                  type="button"
                  className={`summary-tile ${filtroStatusPendencia === "Em andamento" ? "active" : ""}`}
                  onClick={() => setFiltroStatusPendencia(filtroStatusPendencia === "Em andamento" ? "Todas" : "Em andamento")}
                >
                  <strong>Andamento</strong>
                  <span>{pendenciasAndamento.length} registro(s)</span>
                </button>

                <button
                  type="button"
                  className={`summary-tile ${filtroStatusPendencia === "Resolvida" ? "active" : ""}`}
                  onClick={() => setFiltroStatusPendencia(filtroStatusPendencia === "Resolvida" ? "Todas" : "Resolvida")}
                >
                  <strong>Resolvidas</strong>
                  <span>{pendenciasResolvidas.length} registro(s)</span>
                </button>
              </div>

              <div className="pendencias-toolbar">
                <input
                  placeholder="Buscar por obra, disciplina, item, descrição ou responsável"
                  value={filtroTextoPendencia}
                  onChange={(e) => setFiltroTextoPendencia(e.target.value)}
                />

                <select
                  value={filtroStatusPendencia}
                  onChange={(e) => setFiltroStatusPendencia(e.target.value)}
                >
                  <option>Todas</option>
                  <option>Aberta</option>
                  <option>Em andamento</option>
                  <option>Resolvida</option>
                </select>
              </div>

              <div className="pendencias-list">
                {pendenciasFiltradas.length === 0 ? (
                  <div className="pendencia-empty">
                    Nenhuma pendência encontrada para os filtros atuais.
                  </div>
                ) : (
                  pendenciasFiltradas.map((pendencia) => (
                    <article className="pendencia-card-item" key={pendencia.id}>
                      <div className="pendencia-main-grid">
                        <div className="pendencia-field">
                          <span>Obra</span>
                          <strong>{getObraNome(pendencia.obra_id)}</strong>
                        </div>

                        <div className="pendencia-field">
                          <span>Disciplina</span>
                          <strong>{getDisciplinaNome(pendencia.sistema_id)}</strong>
                        </div>

                        <div className="pendencia-field pendencia-field-item">
                          <span>Item</span>
                          <strong>{getChecklistNome(pendencia.checklist_id)}</strong>
                        </div>

                        <div className="pendencia-field">
                          <span>Prioridade</span>
                          <select
                            className={`priority-select ${pendencia.prioridade === "Alta" ? "alta" : pendencia.prioridade === "Baixa" ? "baixa" : "media"}`}
                            value={pendencia.prioridade || "Média"}
                            onChange={(e) => atualizarPendencia(pendencia.id, "prioridade", e.target.value)}
                          >
                            <option>Alta</option>
                            <option>Média</option>
                            <option>Baixa</option>
                          </select>
                        </div>
                      </div>

                      <div className="pendencia-description">
                        <span>Descrição</span>
                        <p>{pendencia.descricao || "-"}</p>
                      </div>

                      <div className="pendencia-footer-grid">
                        <div className="pendencia-field">
                          <span>Responsável</span>
                          <input
                            className="evidence-input responsavel-input"
                            placeholder="Responsável"
                            defaultValue={pendencia.responsavel || ""}
                            onBlur={(e) => atualizarPendencia(pendencia.id, "responsavel", e.target.value)}
                          />
                        </div>

                        <div className="pendencia-field">
                          <span>Status</span>
                          <span className={`badge ${pendencia.status === "Resolvida" ? "ok" : pendencia.status === "Em andamento" ? "warn" : "bad"}`}>
                            {pendencia.status || "Aberta"}
                          </span>
                        </div>

                        <div className="pendencia-actions-area">
                          <span>Ações</span>
                          <div className="pendencia-actions-card">
                            <button type="button" className="mini-action bad" onClick={() => atualizarPendencia(pendencia.id, "status", "Aberta")}>
                              Aberta
                            </button>
                            <button type="button" className="mini-action warn" onClick={() => atualizarPendencia(pendencia.id, "status", "Em andamento")}>
                              Andamento
                            </button>
                            <button type="button" className="mini-action ok" onClick={() => atualizarPendencia(pendencia.id, "status", "Resolvida")}>
                              Resolvida
                            </button>
                            <button type="button" className="mini-action delete" onClick={() => excluirPendencia(pendencia.id)}>
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {view === "relatorio" && (
            <section className="page-card report-card">
              <div className="executive-head">
                <div>
                  <span className="painel-title">Saída executiva</span>
                  <h2>Relatório Executivo</h2>
                  <p>Resumo consolidado de obras, disciplinas, checklist, não conformidades e pendências.</p>
                </div>

                <button className="btn-primary no-print" type="button" onClick={() => window.print()}>
                  Imprimir / Salvar PDF
                </button>
              </div>

              <div className="report-grid">
                <div>
                  <strong>{obras.length}</strong>
                  <span>Obras</span>
                </div>
                <div>
                  <strong>{sistemas.length}</strong>
                  <span>Disciplinas</span>
                </div>
                <div>
                  <strong>{executive.totalChecklist}</strong>
                  <span>Itens</span>
                </div>
                <div>
                  <strong>{executive.progresso}%</strong>
                  <span>Avanço</span>
                </div>
                <div>
                  <strong>{executive.naoConforme}</strong>
                  <span>Não conformes</span>
                </div>
                <div>
                  <strong>{pendenciasAbertas.length}</strong>
                  <span>Pendências abertas</span>
                </div>
              </div>

              <div className="backup-panel no-print">
                <div>
                  <span className="painel-title">Backup inteligente</span>
                  <h3>Exportação de segurança</h3>
                  <p>Gere um backup lógico do NERO e um manifesto das evidências para auditoria/arquivamento.</p>
                  {backupGerado && <small>{backupGerado}</small>}
                </div>

                <div className="backup-actions">
                  <button className="btn-primary" type="button" onClick={gerarBackupInteligente}>
                    Baixar backup JSON
                  </button>
                  <button className="btn" type="button" onClick={gerarManifestoEvidencias}>
                    Manifesto evidências
                  </button>
                </div>
              </div>

              <div className="report-section">
                <h3>Resumo por disciplina</h3>
                <div className="table-wrap executive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Obra</th>
                        <th>Disciplina</th>
                        <th>Total</th>
                        <th>OK</th>
                        <th>NC</th>
                        <th>Avanço</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executive.sistemasResumo.length === 0 ? (
                        <tr>
                          <td colSpan="6">Nenhum dado para relatório.</td>
                        </tr>
                      ) : (
                        executive.sistemasResumo.map((linha) => (
                          <tr key={linha.id}>
                            <td>{linha.obra}</td>
                            <td>{linha.nome}</td>
                            <td>{linha.total}</td>
                            <td>{linha.ok}</td>
                            <td>{linha.nc}</td>
                            <td>{linha.percentual}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="report-section">
                <h3>Pendências</h3>
                <div className="table-wrap pendencias-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Obra</th>
                        <th>Disciplina</th>
                        <th>Item</th>
                        <th>Descrição</th>
                        <th>Status</th>
                        <th>Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendencias.length === 0 ? (
                        <tr>
                          <td colSpan="6">Nenhuma pendência registrada.</td>
                        </tr>
                      ) : (
                        pendencias.map((pendencia) => (
                          <tr key={pendencia.id}>
                            <td>{getObraNome(pendencia.obra_id)}</td>
                            <td>{getDisciplinaNome(pendencia.sistema_id)}</td>
                            <td>{getChecklistNome(pendencia.checklist_id)}</td>
                            <td>{pendencia.descricao || "-"}</td>
                            <td>{pendencia.status || "Aberta"}</td>
                            <td>{pendencia.responsavel || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
      </div>
    </div>
  );
}

export default ComissionamentoApp;
