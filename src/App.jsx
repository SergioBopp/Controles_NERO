import { useState } from "react";

export default function App() {
  const [tipo, setTipo] = useState("propria");
  const [bdi, setBdi] = useState(0);
  const [materiais, setMateriais] = useState(0);
  const [valorTerceirizado, setValorTerceirizado] = useState(0);

  const [cargos, setCargos] = useState([
    { nome: "Eletricista", diaria: 0, horas: 0 }
  ]);

  const adicionarCargo = () => {
    setCargos([...cargos, { nome: "", diaria: 0, horas: 0 }]);
  };

  const atualizarCargo = (index, campo, valor) => {
    const novos = [...cargos];
    novos[index][campo] = campo === "nome" ? valor : Number(valor);
    setCargos(novos);
  };

  const removerCargo = (index) => {
    const novos = cargos.filter((_, i) => i !== index);
    setCargos(novos);
  };

  const nomesUnicos = new Set(cargos.map(c => c.nome.trim().toLowerCase()));
  const temDuplicado = nomesUnicos.size !== cargos.length;

  const maoDeObra = cargos.reduce((total, c) => {
    const valorHora = c.diaria / 8;
    return total + valorHora * c.horas;
  }, 0);

  let total = 0;

  if (tipo === "propria") {
    total = (maoDeObra + Number(materiais)) * (1 + bdi / 100);
  }

  if (tipo === "terceirizada") {
    total = valorTerceirizado * (1 + bdi / 100);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">NERO Construções</h1>

      {/* Tipo de OS */}
      <div className="flex gap-4">
        <button
          onClick={() => setTipo("propria")}
          className={`px-4 py-2 rounded ${tipo === "propria" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Própria
        </button>
        <button
          onClick={() => setTipo("terceirizada")}
          className={`px-4 py-2 rounded ${tipo === "terceirizada" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Terceirizada
        </button>
      </div>

      {/* Própria */}
      {tipo === "propria" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Mão de Obra</h2>

          {cargos.map((c, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center">
              <input
                placeholder="Cargo"
                value={c.nome}
                onChange={(e) => atualizarCargo(i, "nome", e.target.value)}
                className="border p-2"
              />

              <input
                type="number"
                placeholder="Diária"
                value={c.diaria}
                onChange={(e) => atualizarCargo(i, "diaria", e.target.value)}
                className="border p-2"
              />

              <input
                type="number"
                placeholder="Horas"
                value={c.horas}
                onChange={(e) => atualizarCargo(i, "horas", e.target.value)}
                className="border p-2"
              />

              <button
                onClick={() => removerCargo(i)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Remover
              </button>
            </div>
          ))}

          <button
            onClick={adicionarCargo}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            + Adicionar Cargo
          </button>

          {temDuplicado && (
            <p className="text-red-600">⚠️ Existem cargos duplicados</p>
          )}

          <div>
            <label>Materiais</label>
            <input
              type="number"
              value={materiais}
              onChange={(e) => setMateriais(e.target.value)}
              className="border p-2 w-full"
            />
          </div>
        </div>
      )}

      {/* Terceirizada */}
      {tipo === "terceirizada" && (
        <div>
          <label>Valor do Serviço</label>
          <input
            type="number"
            value={valorTerceirizado}
            onChange={(e) => setValorTerceirizado(Number(e.target.value))}
            className="border p-2 w-full"
          />
        </div>
      )}

      {/* BDI */}
      <div>
        <label>BDI (%)</label>
        <input
          type="number"
          value={bdi}
          onChange={(e) => setBdi(Number(e.target.value))}
          className="border p-2 w-full"
        />
      </div>

      {/* Total */}
      <div className="text-3xl font-bold text-right">
        Total: R$ {total.toFixed(2)}
      </div>
    </div>
  );
}
