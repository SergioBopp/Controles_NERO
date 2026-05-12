import React, { useState } from "react";
import {
  LayoutDashboard,
  Calculator,
  FileText,
  Database,
} from "lucide-react";

import BDIDashboard from "./pages/BDIDashboard";
import BDIComposicao from "./pages/BDIComposicao";
import BDIBiblioteca from "./pages/BDIBiblioteca";
import BDIRelatorios from "./pages/BDIRelatorios";

export default function BDIApp() {
  const [activePage, setActivePage] = useState("dashboard");

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "composicao", label: "Composição", icon: Calculator },
    { id: "biblioteca", label: "Biblioteca", icon: Database },
    { id: "relatorios", label: "Relatórios", icon: FileText },
  ];

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <BDIDashboard />;
      case "composicao":
        return <BDIComposicao />;
      case "biblioteca":
        return <BDIBiblioteca onAbrirComposicao={() => setActivePage("composicao")} />;
      case "relatorios":
        return <BDIRelatorios />;
      default:
        return (
          <div className="w-full min-h-[720px] bg-[#080D12] p-8 text-white">
            <div className="rounded-3xl border border-[#1F2937] bg-[#111827] p-8">
              <h1 className="text-3xl font-black">Página em desenvolvimento</h1>
              <p className="mt-2 text-slate-400">
                Esta área será ativada nas próximas versões do Cálculo do BDI.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex w-full min-h-[720px] bg-[#080D12] text-white overflow-hidden">
      <aside className="w-[236px] shrink-0 bg-[#111827] border-r border-[#1F2937]">
        <div className="h-[104px] px-7 flex flex-col justify-center border-b border-[#1F2937]">
          <h1 className="text-3xl font-black tracking-wide text-[#00FF88] leading-none">
            NERO
          </h1>
          <p className="mt-3 text-[12px] text-slate-300 tracking-[0.32em]">
            Cálculo do BDI
          </p>
        </div>

        <nav className="p-5 space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={[
                  "w-full h-[56px] rounded-2xl px-5 flex items-center gap-4 transition-all duration-200",
                  active
                    ? "bg-[#00FF88] text-black font-black shadow-lg shadow-emerald-950/30"
                    : "bg-[#161B22] hover:bg-[#1E293B] text-slate-200",
                ].join(" ")}
              >
                <Icon size={20} />
                <span className="text-[16px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {renderPage()}
      </main>
    </div>
  );
}
