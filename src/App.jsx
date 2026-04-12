// App v11 PROFISSIONAL COMPLETA
// Base preservada + Motor de OS integrado

import React, { useEffect, useMemo, useState } from "react";

// ================= UTIL =================
const moeda = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

const gerarId = () => Date.now() + Math.floor(Math.random() * 1000);

// ================= APP =================
export default function App() {
  const [aba, setAba] = useState("manutencoes");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">NERO Construções</h1>

      <div className="flex gap-3">
        <Tab label="Manutenções" ativo={aba === "manutencoes"} onClick={() => setAba("manutencoes")} />
        <Tab label="Almoxarifado" ativo={aba === "almox"} onClick={() => setAba("almox")} />
        <Tab label="Presença" ativo={aba === "presenca"} onClick={() => setAba("presenca")} />
      </div>

      {aba === "manutencoes" && <Manutencoes />}
      {aba === "almox" && <Almoxarifado />}
      {aba === "presenca" && <Presenca />}
    </div>
  );
}

function Tab({ label, ativo, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded ${ativo ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
      {label}
    </button>
  );
}

// ================= MANUTENÇÕES =================
function Manutencoes() {
  const [lista, setLista] = useState(() => JSON.parse(localStorage.getItem("os") || "[]"));
  const [show, setShow] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => localStorage.setItem("os", JSON.stringify(lista)), [lista]);

  return (
    <div className="space-y-4">
      <button onClick={() => setShow(true)} className="bg-blue-600 text-white px-4 py-2 rounded">
        + Nova OS
      </button>

      <div className="grid md:grid-cols-2 gap-4">
        {lista.map((os) => (
          <div key={os.id} className="p-4 border rounded shadow bg-white">
            <p className="text-sm text-gray-500">{os.tipo}</p>
            <p className="text-xl font-bold">{moeda(os.total)}</p>
            <p>Status: {os.status}</p>

            <div className="flex gap-2 mt-2">
              <button onClick={() => setDetalhe(os)} className="text-blue-600 underline">Detalhes</button>
              <button
                onClick={() => {
                  setLista(lista.map(o => o.id === os.id ? { ...o, status: o.status === "Pendente" ? "Concluído" : "Pendente" } : o));
                }}
                className="text-sm bg-gray-200 px-2 rounded"
              >
                Alternar Status
              </button>
            </div>
          </div>
        ))}
      </div>

      {show && <FormOS onClose={() => setShow(false)} onSave={(os) => setLista([os, ...lista])} />}
      {detalhe && <ModalDetalhe os={detalhe} onClose={() => setDetalhe(null)} />}
    </div>
  );
}

function FormOS({ onClose, onSave }) {
  const [tipo, setTipo] = useState("propria");
  const [bdi, setBdi] = useState(0);
  const [materiais, setMateriais] = useState(0);
  const [valor, setValor] = useState(0);
  const [cargos, setCargos] = useState([{ nome: "", diaria: 0, horas: 0 }]);

  const calcular = () => {
    const mao = cargos.reduce((t, c) => t + (c.diaria / 8) * c.horas, 0);
    return tipo === "propria"
      ? (mao + Number(materiais)) * (1 + bdi / 100)
      : valor * (1 + bdi / 100);
  };

  return (
    <div className="p-4 border rounded bg-gray-50 space-y-3">
      <div className="flex gap-2">
        <Tab label="Própria" ativo={tipo === "propria"} onClick={() => setTipo("propria")} />
        <Tab label="Terceirizada" ativo={tipo === "terceirizada"} onClick={() => setTipo("terceirizada")} />
      </div>

      {tipo === "propria" && cargos.map((c, i) => (
        <div key={i} className="grid grid-cols-4 gap-2">
          <input placeholder="Cargo" onChange={e => { const n=[...cargos]; n[i].nome=e.target.value; setCargos(n); }} className="border p-2" />
          <input type="number" placeholder="Diária" onChange={e => { const n=[...cargos]; n[i].diaria=+e.target.value; setCargos(n); }} className="border p-2" />
          <input type="number" placeholder="Horas" onChange={e => { const n=[...cargos]; n[i].horas=+e.target.value; setCargos(n); }} className="border p-2" />
          <button onClick={() => setCargos(cargos.filter((_,x)=>x!==i))} className="bg-red-500 text-white">X</button>
        </div>
      ))}

      {tipo === "propria" && (
        <>
          <button onClick={() => setCargos([...cargos, { nome: "", diaria: 0, horas: 0 }])} className="bg-green-600 text-white px-2 py-1">+ Cargo</button>
          <input type="number" placeholder="Materiais" onChange={e=>setMateriais(e.target.value)} className="border p-2 w-full" />
        </>
      )}

      {tipo === "terceirizada" && (
        <input type="number" placeholder="Valor do Serviço" onChange={e=>setValor(+e.target.value)} className="border p-2 w-full" />
      )}

      <input type="number" placeholder="BDI (%)" onChange={e=>setBdi(+e.target.value)} className="border p-2 w-full" />

      <div className="text-right font-bold">Total: {moeda(calcular())}</div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ id: gerarId(), tipo, total: calcular(), status: "Pendente", detalhes: { cargos, materiais, bdi, valor } })}
          className="bg-blue-600 text-white px-3 py-1"
        >Salvar</button>
        <button onClick={onClose} className="bg-gray-400 text-white px-3 py-1">Cancelar</button>
      </div>
    </div>
  );
}

function ModalDetalhe({ os, onClose }) {
  const d = os.detalhes;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-lg space-y-3">
        <h2 className="text-xl font-bold">Detalhes da OS</h2>

        {os.tipo === "propria" && (
          <div>
            <p className="font-semibold">Mão de obra:</p>
            {d.cargos.map((c,i)=> (
              <p key={i}>{c.nome} - {c.horas}h</p>
            ))}
            <p>Materiais: {moeda(d.materiais)}</p>
          </div>
        )}

        {os.tipo === "terceirizada" && (
          <p>Valor base: {moeda(d.valor)}</p>
        )}

        <p>BDI: {d.bdi}%</p>
        <p className="font-bold">Total: {moeda(os.total)}</p>

        <button onClick={onClose} className="bg-gray-400 text-white px-3 py-1">Fechar</button>
      </div>
    </div>
  );
}

// ================= ALMOX =================
function Almoxarifado() {
  const [itens, setItens] = useState(() => JSON.parse(localStorage.getItem("estoque") || "[]"));
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState(0);

  useEffect(() => localStorage.setItem("estoque", JSON.stringify(itens)), [itens]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Material" className="border p-2" />
        <input type="number" value={qtd} onChange={e=>setQtd(+e.target.value)} className="border p-2" />
        <button onClick={()=>setItens([...itens,{id:gerarId(),nome,qtd}])} className="bg-green-600 text-white px-3">Add</button>
      </div>
      {itens.map(i => (
        <div key={i.id} className="flex justify-between border p-2">
          <span>{i.nome}</span>
          <span>{i.qtd}</span>
        </div>
      ))}
    </div>
  );
}

// ================= PRESENÇA =================
function Presenca() {
  const [lista, setLista] = useState(() => JSON.parse(localStorage.getItem("presenca") || "[]"));
  const [nome, setNome] = useState("");

  useEffect(() => localStorage.setItem("presenca", JSON.stringify(lista)), [lista]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome" className="border p-2" />
        <button onClick={()=>setLista([{id:gerarId(),nome,data:new Date().toLocaleDateString("pt-BR")},...lista])} className="bg-blue-600 text-white px-3">Registrar</button>
      </div>
      {lista.map(p => (
        <div key={p.id} className="flex justify-between border p-2">
          <span>{p.nome}</span>
          <span>{p.data}</span>
        </div>
      ))}
    </div>
  );
}
