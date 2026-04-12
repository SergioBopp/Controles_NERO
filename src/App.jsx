import { useState, useEffect } from "react";

// ===================== UTIL =====================
const moeda = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ===================== APP =====================
export default function App() {
  const [aba, setAba] = useState("manutencoes");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Header />

      <nav className="flex gap-3">
        <Tab label="Manutenções" ativo={aba === "manutencoes"} onClick={() => setAba("manutencoes")} />
        <Tab label="Almoxarifado" ativo={aba === "almox"} onClick={() => setAba("almox")} />
        <Tab label="Presença" ativo={aba === "presenca"} onClick={() => setAba("presenca")} />
      </nav>

      {aba === "manutencoes" && <Manutencoes />}
      {aba === "almox" && <Almoxarifado />}
      {aba === "presenca" && <Presenca />}
    </div>
  );
}

function Header() {
  return <h1 className="text-3xl font-bold">NERO Construções</h1>;
}

function Tab({ label, ativo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded ${ativo ? "bg-blue-600 text-white" : "bg-gray-200"}`}
    >
      {label}
    </button>
  );
}

// ===================== MANUTENÇÕES =====================
function Manutencoes() {
  const [lista, setLista] = useState(() => JSON.parse(localStorage.getItem("os") || "[]"));
  const [show, setShow] = useState(false);

  useEffect(() => localStorage.setItem("os", JSON.stringify(lista)), [lista]);

  const salvar = (os) => setLista([os, ...lista]);

  return (
    <div className="space-y-4">
      <button onClick={() => setShow(true)} className="bg-blue-600 text-white px-4 py-2 rounded">
        + Nova OS
      </button>

      <div className="grid md:grid-cols-2 gap-4">
        {lista.map((o) => (
          <div key={o.id} className={`p-4 rounded shadow border-l-4 ${o.status === "Pendente" ? "border-yellow-500" : "border-green-500"}`}>
            <p className="text-sm text-gray-500">{o.tipo}</p>
            <p className="text-xl font-bold">{moeda(o.total)}</p>
            <p>Status: {o.status}</p>
            <button className="text-blue-600 underline mt-2">Detalhes</button>
          </div>
        ))}
      </div>

      {show && <FormOS onClose={() => setShow(false)} onSave={salvar} />}
    </div>
  );
}

function FormOS({ onClose, onSave }) {
  const [tipo, setTipo] = useState("propria");
  const [bdi, setBdi] = useState(0);
  const [materiais, setMateriais] = useState(0);
  const [valor, setValor] = useState(0);
  const [cargos, setCargos] = useState([{ nome: "", diaria: 0, horas: 0 }]);

  const total = () => {
    const mao = cargos.reduce((t, c) => t + (c.diaria / 8) * c.horas, 0);
    return tipo === "propria"
      ? (mao + Number(materiais)) * (1 + bdi / 100)
      : valor * (1 + bdi / 100);
  };

  return (
    <div className="p-4 bg-gray-50 border rounded space-y-3">
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
        <input type="number" placeholder="Valor" onChange={e=>setValor(+e.target.value)} className="border p-2 w-full" />
      )}

      <input type="number" placeholder="BDI (%)" onChange={e=>setBdi(+e.target.value)} className="border p-2 w-full" />

      <div className="text-right font-bold">Total: {moeda(total())}</div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ id: Date.now(), tipo, total: total(), status: "Pendente" })}
          className="bg-blue-600 text-white px-3 py-1"
        >Salvar</button>
        <button onClick={onClose} className="bg-gray-400 text-white px-3 py-1">Cancelar</button>
      </div>
    </div>
  );
}

// ===================== ALMOX =====================
function Almoxarifado() {
  const [itens, setItens] = useState(() => JSON.parse(localStorage.getItem("estoque") || "[]"));
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState(0);

  useEffect(() => localStorage.setItem("estoque", JSON.stringify(itens)), [itens]);

  const add = () => {
    setItens([...itens, { id: Date.now(), nome, qtd }]);
    setNome(""); setQtd(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input placeholder="Material" value={nome} onChange={e=>setNome(e.target.value)} className="border p-2" />
        <input type="number" value={qtd} onChange={e=>setQtd(+e.target.value)} className="border p-2" />
        <button onClick={add} className="bg-green-600 text-white px-3">Adicionar</button>
      </div>

      {itens.map(i => (
        <div key={i.id} className="p-2 border rounded flex justify-between">
          <span>{i.nome}</span>
          <span>{i.qtd}</span>
        </div>
      ))}
    </div>
  );
}

// ===================== PRESENÇA =====================
function Presenca() {
  const [lista, setLista] = useState(() => JSON.parse(localStorage.getItem("presenca") || "[]"));
  const [nome, setNome] = useState("");

  useEffect(() => localStorage.setItem("presenca", JSON.stringify(lista)), [lista]);

  const registrar = () => {
    setLista([{ id: Date.now(), nome, data: new Date().toLocaleDateString("pt-BR") }, ...lista]);
    setNome("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} className="border p-2" />
        <button onClick={registrar} className="bg-blue-600 text-white px-3">Registrar</button>
      </div>

      {lista.map(p => (
        <div key={p.id} className="p-2 border rounded flex justify-between">
          <span>{p.nome}</span>
          <span>{p.data}</span>
        </div>
      ))}
    </div>
  );
}
