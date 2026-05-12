import React from "react";
import {
  DollarSign,
  ShieldAlert,
  Landmark,
  TrendingUp,
} from "lucide-react";

export default function BDIDashboard() {
  const cards = [
    {
      title: "BDI TOTAL",
      value: "28.75%",
      icon: TrendingUp,
      color: "text-[#00FF88]",
    },
    {
      title: "IMPOSTOS",
      value: "12.30%",
      icon: Landmark,
      color: "text-[#38BDF8]",
    },
    {
      title: "RISCOS",
      value: "3.50%",
      icon: ShieldAlert,
      color: "text-[#F97316]",
    },
    {
      title: "LUCRO",
      value: "8.00%",
      icon: DollarSign,
      color: "text-[#EAB308]",
    },
  ];

  return (
    <div className="p-8 bg-[#0B0F14] min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white">
          Dashboard BDI
        </h1>

        <p className="text-gray-400 mt-2">
          Gestão estratégica de composição de BDI
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              key={index}
              className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    {card.title}
                  </p>

                  <h2 className={`text-3xl font-bold ${card.color}`}>
                    {card.value}
                  </h2>
                </div>

                <div
                  className={`w-14 h-14 rounded-2xl bg-[#1E293B] flex items-center justify-center ${card.color}`}
                >
                  <Icon size={28} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Área futura */}
      <div className="mt-10 bg-[#111827] border border-[#1F2937] rounded-2xl p-8">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Simulador Financeiro
        </h2>

        <div className="h-80 rounded-2xl border border-dashed border-[#374151] flex items-center justify-center text-gray-500">
          Área reservada para gráficos, composição analítica e simulador.
        </div>
      </div>
    </div>
  );
}