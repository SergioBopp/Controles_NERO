import React from "react";
import {
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  ListChecks,
  Settings,
  FileText,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { nero } from "../data/formatters";

function SidebarItem({ icon: Icon, label, to }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
          isActive
            ? "bg-green-600 text-white shadow-sm"
            : "text-slate-700 hover:bg-green-50 hover:text-green-900"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="flex items-center gap-3 text-sm font-medium">
            <Icon
              className={`h-4 w-4 ${
                isActive
                  ? "text-white"
                  : "text-green-700 group-hover:text-green-800"
              }`}
            />
            {label}
          </span>
          <ChevronRight
            className={`h-4 w-4 transition ${
              isActive
                ? "text-white"
                : "text-green-300 group-hover:text-green-700"
            }`}
          />
        </>
      )}
    </NavLink>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-green-100">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green-700">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="h-fit rounded-[32px] border border-green-100 bg-white p-5 shadow-sm xl:sticky xl:top-8">
      <div
        className="rounded-[28px] p-5 text-white shadow-sm"
        style={{
          background: `linear-gradient(180deg, ${nero.sidebar} 0%, ${nero.sidebarSoft} 100%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white p-3 shadow-md">
            <img
              src="/logo-nero.png"
              alt="NERO Construções"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0 leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-green-200">
              Sistema Web
            </p>
            <h1 className="mt-1 text-2xl font-extrabold leading-none text-white">
              NERO
            </h1>
            <p className="mt-1 text-lg font-extrabold leading-none text-white">
              CONSTRUÇÕES
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-green-200">
          Gestão inteligente de obras
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <SidebarItem
          icon={LayoutDashboard}
          label="Dashboard"
          to="/dashboard"
        />
        <SidebarItem
          icon={FolderKanban}
          label="Planejamento"
          to="/planejamento"
        />
        <SidebarItem
          icon={ClipboardList}
          label="Medições"
          to="/medicoes"
        />
        <SidebarItem
          icon={ListChecks}
          label="Acompanhamento"
          to="/acompanhamento"
        />
        <SidebarItem
          icon={Settings}
          label="Configurações"
          to="/configuracoes"
        />
        <SidebarItem
          icon={FileText}
          label="Relatórios"
          to="/relatorios"
        />
        <SidebarItem
          icon={ClipboardCheck}
          label="Comissionamento"
          to="/comissionamento"
        />
      </div>

      <div className="mt-6 rounded-[28px] border border-green-100 bg-green-50/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-green-800">
          Resumo rápido
        </p>
        <div className="mt-4 grid gap-3">
          <MiniStat label="Sistema" value="NERO Planejamento" />
          <MiniStat label="Status" value="Operacional" />
          <MiniStat label="Módulo" value="Rotas ativas" />
        </div>
      </div>
    </aside>
  );
}
