
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock3,
  FileText,
  LayoutDashboard,
  Package,
  Search,
  Upload,
  Download,
  Building2,
  Users,
  Wrench,
  Plus,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase, isSupabaseConfigured } from "./supabase";

const LOGO_SRC = "/logo-nero.png";

const initialData = {
  obras: [
    { id: 101, nome: "Obra Principal", cliente: "NERO Construções", local: "Salvador/BA", status: "Ativa", dataInicio: "2026-04-01", observacao: "" },
  ],
  companies: [
    { id: 1, name: "NERO Construções", city: "Salvador/BA" },
    { id: 2, name: "Obra Shopping Atlântico", city: "Lauro de Freitas/BA" },
  ],
  roles: [
    { id: 1, companyId: 1, name: "Mestre de Obras" },
    { id: 2, companyId: 1, name: "Engenheiro Civil" },
    { id: 3, companyId: 1, name: "Almoxarife" },
    { id: 4, companyId: 2, name: "Técnico de Segurança" },
    { id: 5, companyId: 2, name: "Eletricista" },
  ],
  maintenanceRoles: [
    { id: "mr-1", name: "Eletricista", daily: 240 },
    { id: "mr-2", name: "Encanador", daily: 260 },
    { id: "mr-3", name: "Pintor", daily: 220 },
  ],
  maintenance: [],
  stock: [],
  attendance: [],
  history: [],
};

const pages = {
  dashboard: { label: "Controles NERO Construções", icon: LayoutDashboard },
  stock: { label: "Almoxarifado", icon: Package },
  maintenance: { label: "Manutenções", icon: Wrench },
  attendance: { label: "Presença", icon: Users },
  history: { label: "Histórico", icon: Calendar },
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatDateBR(isoDate) {
  if (!isoDate) return "-";
  const [year, month, day] = String(isoDate).slice(0, 10).split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
}

function formatCurrencyBR(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function getTodayBR() {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
}

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateTimeBRNoSeconds() {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR");
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function generateUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `uuid-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function sameId(a, b) {
  return String(a ?? "") === String(b ?? "");
}

function addDaysISO(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffDaysFromToday(dateString) {
  if (!dateString) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateString}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((today - target) / (1000 * 60 * 60 * 24));
}

function getMaintenanceStatus(item) {
  if (item.deliveryDate) return "Entregue";
  if (item.realizationDate) return "Em execução";
  if (item.limitDate && diffDaysFromToday(item.limitDate) > 0) return "Atrasado";
  return "No prazo";
}

function getDelayIndicator(item) {
  if (item.deliveryDate || !item.limitDate) return "-";
  const diff = diffDaysFromToday(item.limitDate);
  return diff > 0 ? `${diff} dia${diff > 1 ? "s" : ""}` : "-";
}


const MAINTENANCE_ROLES_STORAGE_KEY = "nero_maintenance_roles_v10";
const MAINTENANCE_DETAILS_STORAGE_KEY = "nero_maintenance_details_v10";

function createEmptyLaborEntry() {
  return { id: generateUuid(), roleId: "", roleName: "", daily: 0, hours: 0 };
}

function createEmptyMaintenanceForm() {
  return {
    os: "",
    service: "",
    requester: "",
    requestDate: getTodayISO(),
    realizationDate: "",
    deliveryDate: "",
    limitDate: addDaysISO(getTodayISO(), 7),
    responsible: "",
    compositionType: "own",
    labor: [createEmptyLaborEntry()],
    outsourcedServiceCost: 0,
    materialCost: 0,
    bdi: 0,
    laborTotal: 0,
    subtotal: 0,
    totalCost: 0,
    cost: 0,
  };
}

function getHourlyRate(daily) {
  return Number(daily || 0) / 8;
}

function calculateLaborLine(line) {
  const daily = Number(line?.daily || 0);
  const hours = Number(line?.hours || 0);
  const hourly = getHourlyRate(daily);
  const subtotal = hourly * hours;
  return {
    ...line,
    daily,
    hours,
    hourly,
    subtotal,
  };
}

function calculateMaintenanceItem(item) {
  const compositionType = item?.compositionType === "outsourced" ? "outsourced" : "own";
  const labor = compositionType === "own"
    ? (item?.labor || []).map(calculateLaborLine).filter((line) => line.roleId || line.roleName || line.hours || line.daily)
    : [];
  const laborTotal = labor.reduce((acc, line) => acc + Number(line.subtotal || 0), 0);
  const materialCost = compositionType === "own" ? Number(item?.materialCost || 0) : 0;
  const outsourcedServiceCost = compositionType === "outsourced" ? Number(item?.outsourcedServiceCost || 0) : 0;
  const bdi = Number(item?.bdi || 0);
  const subtotal = compositionType === "outsourced" ? outsourcedServiceCost : laborTotal + materialCost;

  const calculated = subtotal * (1 + bdi / 100);
  const minimumApplied = calculated < 100;
  const totalCost = minimumApplied ? 100 : calculated;

  return {
    ...item,
    compositionType,
    labor,
    materialCost,
    outsourcedServiceCost,
    bdi,
    laborTotal,
    subtotal,
    totalCost,
    cost: totalCost,
    minimumApplied,
  };
}

function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getStoredMaintenanceRoles(defaultRoles = []) {
  const stored = readJsonStorage(MAINTENANCE_ROLES_STORAGE_KEY, null);
  return Array.isArray(stored) && stored.length ? stored : defaultRoles;
}

function saveStoredMaintenanceRoles(roles) {
  writeJsonStorage(MAINTENANCE_ROLES_STORAGE_KEY, roles);
}

function getStoredMaintenanceDetails() {
  return readJsonStorage(MAINTENANCE_DETAILS_STORAGE_KEY, {});
}

function saveStoredMaintenanceDetails(detailsMap) {
  writeJsonStorage(MAINTENANCE_DETAILS_STORAGE_KEY, detailsMap);
}

function upsertStoredMaintenanceDetail(item) {
  const current = getStoredMaintenanceDetails();
  current[item.id] = {
    compositionType: item.compositionType === "outsourced" ? "outsourced" : "own",
    labor: item.labor || [],
    outsourcedServiceCost: Number(item.outsourcedServiceCost || 0),
    materialCost: Number(item.materialCost || 0),
    bdi: Number(item.bdi || 0),
    laborTotal: Number(item.laborTotal || 0),
    subtotal: Number(item.subtotal || 0),
    totalCost: Number(item.totalCost || item.cost || 0),
  };
  saveStoredMaintenanceDetails(current);
}

function removeStoredMaintenanceDetail(id) {
  const current = getStoredMaintenanceDetails();
  delete current[id];
  saveStoredMaintenanceDetails(current);
}

function mergeMaintenanceWithStoredDetails(items) {
  const stored = getStoredMaintenanceDetails();
  return (items || []).map((item) => calculateMaintenanceItem({ ...stored[item.id], ...item }));
}


async function loadImageDataUrl(src) {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function Card({ children, className = "" }) {
  return <div className={cn("rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]", className)}>{children}</div>;
}

function CardHeader({ title, description, right }) {
  return (
    <div className="px-5 py-4 border-b border-slate-200/70 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-slate-50/70 rounded-t-[22px]">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
        {description ? <p className="text-sm text-slate-500 mt-1">{description}</p> : null}
      </div>
      {right}
    </div>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800 shadow-sm",
    outline: "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400",
    danger: "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-sm",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 h-10 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Badge({ children, className = "" }) {
  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.02em]", className)}>{children}</span>;
}

function Input({ className = "", ...props }) {
  return <input className={cn("w-full rounded-xl border border-slate-300 bg-white px-3.5 h-10 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100", className)} {...props} />;
}

function SelectField({ value, onChange, options, className = "" }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("w-full rounded-xl border border-slate-300 bg-white px-3.5 h-10 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100", className)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-[30px] border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button className="rounded-xl p-2 hover:bg-slate-100" onClick={onClose}>×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function LogoBlock() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 rounded-[20px] overflow-hidden bg-white shadow-sm border border-slate-200 flex items-center justify-center">
        <img
          src={LOGO_SRC}
          alt="Logo NERO"
          className="h-full w-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div className="hidden h-full w-full items-center justify-center bg-gradient-to-r from-emerald-700 to-emerald-800 text-white text-3xl font-bold">N</div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Sistema Web</p>
        <h1 className="text-[1.65rem] font-semibold tracking-tight text-white leading-none mt-2 uppercase">NERO</h1>
        <h2 className="text-[1.65rem] font-semibold tracking-tight text-white leading-none mt-1 uppercase">CONSTRUÇÕES</h2>
      </div>
    </div>
  );
}

function Sidebar({ currentPage, setCurrentPage }) {
  const sidebarPages = ["dashboard", "stock", "maintenance", "attendance", "history"];
  return (
    <aside className="hidden md:flex md:w-72 lg:w-[290px] border-r border-emerald-900/40 bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex-col text-white">
      <div className="px-6 py-6 border-b border-white/10 bg-transparent">
        <LogoBlock />
      </div>
      <nav className="flex-1 p-4 space-y-2.5">
        {sidebarPages.map((key) => {
          const item = pages[key];
          const Icon = item.icon;
          const active = currentPage === key;
          return (
            <button
              key={key}
              onClick={() => setCurrentPage(key)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all text-left border",
                active ? "bg-white text-emerald-900 border-white shadow-sm" : "bg-white/5 text-emerald-50 hover:bg-white/10 hover:border-white/20 border-transparent"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="font-medium text-[15px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function ConnectionBadge({ configured, onlineMode }) {
  if (!configured) return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Supabase não configurado</Badge>;
  if (!onlineMode) return <Badge className="bg-slate-100 text-slate-700 border-slate-300">Modo local</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Modo online</Badge>;
}

function Topbar({
  currentPage,
  setCurrentPage,
  onReset,
  onCloseDay,
  obraId,
  setObraId,
  obras,
  connectionBadge,
  onOpenObras,
  onExportBackup,
  onImportBackupClick,
}) {
  const mobilePages = ["dashboard", "stock", "maintenance", "attendance", "history"];
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div className="px-5 md:px-8 py-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-[1.75rem] md:text-[2rem] font-semibold tracking-tight text-slate-900">NERO CONSTRUÇÕES</h2>
            <div className="mt-3 grid grid-cols-1 xl:grid-cols-[minmax(320px,540px)_auto_auto_auto] gap-2.5 max-w-none">
              <SelectField
                value={String(obraId || "")}
                onChange={(value) => setObraId(value)}
                options={obras.length ? obras.map((obra) => ({ value: String(obra.id), label: obra.nome })) : [{ value: "", label: "Sem obras cadastradas" }]}
              />
              <Button variant="outline" onClick={onOpenObras}><Building2 className="h-4 w-4" /> Obras</Button>
              <Button variant="outline" onClick={onExportBackup}><Download className="h-4 w-4" /> Exportar backup</Button>
              <Button variant="outline" onClick={onImportBackupClick}><Upload className="h-4 w-4" /> Importar backup</Button>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 flex-wrap justify-end">
            {connectionBadge}
            <Badge className="bg-white text-slate-700 border-slate-300 text-sm px-4 h-10 rounded-full"><Calendar className="h-4 w-4 mr-2" /> {getTodayBR()}</Badge>
            {currentPage === "dashboard" ? (
              <>
                <Button variant="outline" className="rounded-xl px-4 h-10" onClick={onCloseDay}>Fechar dia</Button>
                <Button variant="outline" className="rounded-xl px-4 h-10" onClick={onReset}>Resetar base</Button>
              </>
            ) : null}
          </div>
        </div>
        <div className="md:hidden grid grid-cols-2 gap-2">
          {mobilePages.map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "h-10 rounded-xl border text-sm font-medium transition-colors",
                currentPage === page ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              {pages[page].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeStatCard({ title, value, subtitle, icon: Icon, alert, tone = "default" }) {
  const isDanger = tone === "danger" || (!!alert && tone === "default");
  const isSuccess = tone === "success";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border bg-white p-5 transition-all duration-300 shadow-[0_6px_20px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
        isDanger ? "border-rose-200" : isSuccess ? "border-emerald-200" : "border-slate-200"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-50/60 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>

          <div
            className={cn(
              "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              isDanger ? "bg-rose-100 text-rose-700" : isSuccess ? "bg-emerald-100 text-emerald-700" : "bg-emerald-50/70 text-emerald-700"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <p className={cn("mt-5 text-[2.2rem] font-bold leading-none tracking-tight", isDanger ? "text-rose-700" : isSuccess ? "text-emerald-700" : "text-slate-900")}>
          {value}
        </p>

        <p className="mt-4 text-sm leading-snug text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick} className="text-left rounded-[20px] border border-slate-200 p-4 transition-all duration-300 bg-white hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0"><p className="font-semibold text-slate-900">{title}</p><p className="text-sm text-slate-500 mt-1">{subtitle}</p></div>
      </div>
    </button>
  );
}

function ReturnHomeButton({ onClick }) {
  return <Button variant="outline" onClick={onClick}><ArrowLeft className="h-4 w-4" /> Página inicial</Button>;
}

function getMaintenanceStatusConfig(item) {
  const status = getMaintenanceStatus(item);
  if (status === "Atrasado") {
    return { status, border: "border-rose-200", stripe: "bg-rose-500", badge: "bg-rose-100 text-rose-700 border-rose-200" };
  }
  if (status === "Em execução") {
    return { status, border: "border-amber-200", stripe: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200" };
  }
  if (status === "Entregue") {
    return { status, border: "border-sky-200", stripe: "bg-sky-500", badge: "bg-sky-100 text-sky-700 border-sky-200" };
  }
  return { status, border: "border-emerald-200", stripe: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

function getMaintenanceSortWeight(item) {
  const status = getMaintenanceStatus(item);
  if (status === "Atrasado") return 0;
  if (status === "Em execução") return 1;
  if (status === "No prazo") return 2;
  if (status === "Entregue") return 3;
  return 4;
}

function DashboardPage({ data, obraAtual, historyCountForObra, onGoToStock, onGoToMaintenance, onGoToAttendance, onGoToHistory }) {
  const pendingCount = data.maintenance.filter((item) => getMaintenanceStatus(item) !== "Entregue").length;
  const delayedCount = data.maintenance.filter((item) => getMaintenanceStatus(item) === "Atrasado").length;
  const criticalStock = data.stock.filter((item) => Number(item.quantity) < Number(item.min)).length;
  const totalPresent = data.attendance.reduce((acc, item) => acc + Number(item.qty || 0), 0);
  const totalMaintenanceCost = data.maintenance.reduce((acc, item) => acc + Number(item.totalCost || item.cost || item.estimated_cost || 0), 0);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <HomeStatCard title="Manutenções abertas" value={pendingCount} subtitle="Aguardando entrega" icon={Clock3} />
        <HomeStatCard title="Manutenções atrasadas" value={delayedCount} subtitle="Prazo ultrapassado" icon={AlertTriangle} alert={delayedCount > 0} />
        <HomeStatCard title="Itens críticos" value={criticalStock} subtitle="Abaixo do mínimo" icon={Package} alert={criticalStock > 0} />
        <HomeStatCard title="Total presente" value={totalPresent} subtitle="Equipe somada na obra" icon={Users} />
        <HomeStatCard title="Custo total" value={formatCurrencyBR(totalMaintenanceCost)} subtitle="Total das OS da obra" icon={Briefcase} />
      </section>

      <Card className="overflow-hidden shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div className="p-6 md:p-7 bg-white text-slate-900">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Central operacional</p>
              <h3 className="text-2xl md:text-[2rem] font-semibold mt-2 tracking-tight">{obraAtual?.nome || "Selecione uma obra"}</h3>
              <p className="text-sm md:text-base text-slate-600 mt-3">Cliente: <span className="font-semibold">{obraAtual?.cliente || "-"}</span></p>
              <p className="text-sm md:text-base text-slate-600 mt-2">Local: <span className="font-semibold">{obraAtual?.local || "-"}</span></p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3"><p className="text-[11px] text-slate-500 uppercase tracking-[0.08em]">Empresas</p><p className="text-xl font-semibold mt-1 text-slate-900">{data.companies.length}</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3"><p className="text-[11px] text-slate-500 uppercase tracking-[0.08em]">Materiais</p><p className="text-xl font-semibold mt-1 text-slate-900">{data.stock.length}</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3"><p className="text-[11px] text-slate-500 uppercase tracking-[0.08em]">OS</p><p className="text-xl font-semibold mt-1 text-slate-900">{data.maintenance.length}</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3"><p className="text-[11px] text-slate-500 uppercase tracking-[0.08em]">Históricos</p><p className="text-xl font-semibold mt-1 text-slate-900">{historyCountForObra}</p></div>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <QuickActionCard icon={Package} title="Almoxarifado" subtitle="Consulta e cadastro de materiais" onClick={onGoToStock} />
        <QuickActionCard icon={Wrench} title="Manutenções" subtitle="OS, prazo, status e atraso" onClick={onGoToMaintenance} />
        <QuickActionCard icon={Users} title="Presença" subtitle="Lançamento em lote por função" onClick={onGoToAttendance} />
        <QuickActionCard icon={Calendar} title="Histórico" subtitle="Dias fechados e PDFs" onClick={onGoToHistory} />
      </section>
    </div>
  );
}

function StockPage({ stock, onBack, onAdd, onDelete }) {
  return (
    <div className="space-y-6">
      <Card><CardHeader title="Almoxarifado" description="Materiais, nota fiscal, valor e estoque mínimo" right={<div className="flex gap-3"><Button onClick={onAdd}>Novo material</Button><ReturnHomeButton onClick={onBack} /></div>} /></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stock.map((item) => (
          <Card key={item.id}>
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{item.category}</p>
                  <h3 className="text-base font-semibold text-slate-900 mt-1">{item.item}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={Number(item.quantity) < Number(item.min) ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"}>{Number(item.quantity) < Number(item.min) ? "Estoque mínimo" : "Normal"}</Badge>
                  <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => onDelete(item.id)}>Excluir</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-white border border-slate-200"><p className="text-sm text-slate-500">Saldo atual</p><p className="text-xl font-bold text-slate-900 mt-1">{item.quantity} {item.unit}</p></div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200"><p className="text-sm text-slate-500">Mínimo</p><p className="text-xl font-bold text-slate-900 mt-1">{item.min} {item.unit}</p></div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200"><p className="text-sm text-slate-500">Nota fiscal</p><p className="font-medium text-slate-900 mt-1">{item.invoice || "-"}</p></div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200"><p className="text-sm text-slate-500">Valor unitário</p><p className="font-medium text-slate-900 mt-1">{formatCurrencyBR(item.price)}</p></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MaintenancePage({ items, search, setSearch, onBack, onAdd, onDelete, onEdit, onView, onManageRoles, maintenanceRolesCount }) {
  const summary = {
    open: items.filter((item) => getMaintenanceStatus(item) !== "Entregue").length,
    delayed: items.filter((item) => getMaintenanceStatus(item) === "Atrasado").length,
    delivered: items.filter((item) => getMaintenanceStatus(item) === "Entregue").length,
    totalCost: items.reduce((acc, item) => acc + Number(item.totalCost || item.cost || 0), 0),
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const diff = getMaintenanceSortWeight(a) - getMaintenanceSortWeight(b);
      if (diff !== 0) return diff;
      const limitA = String(a.limitDate || "9999-12-31");
      const limitB = String(b.limitDate || "9999-12-31");
      if (limitA !== limitB) return limitA.localeCompare(limitB);
      return String(b.requestDate || "").localeCompare(String(a.requestDate || ""));
    });
  }, [items]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Manutenções"
          description="Controle de OS, composição própria ou terceirizada, BDI e atraso"
          right={
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-10" placeholder="Pesquisar OS..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" onClick={onManageRoles}><Briefcase className="h-4 w-4" /> Cargos da manutenção ({maintenanceRolesCount})</Button>
              <Button onClick={onAdd}>Nova manutenção</Button>
              <ReturnHomeButton onClick={onBack} />
            </div>
          }
        />
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HomeStatCard title="OS abertas" value={summary.open} subtitle="Ainda sem entrega" icon={Clock3} />
        <HomeStatCard title="OS atrasadas" value={summary.delayed} subtitle="Prazo excedido" icon={AlertTriangle} alert={summary.delayed > 0} />
        <HomeStatCard title="OS entregues" value={summary.delivered} subtitle="Serviços concluídos" icon={FileText} />
        <HomeStatCard title="Valor total" value={formatCurrencyBR(summary.totalCost)} subtitle="Soma geral das OS" icon={Briefcase} tone={summary.totalCost > 0 ? "danger" : "success"} />
      </section>

      {sortedItems.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sortedItems.map((item) => {
            const statusConfig = getMaintenanceStatusConfig(item);
            const isOutsourced = item.compositionType === "outsourced";
            return (
              <Card key={item.id} className={cn("overflow-hidden border-2", statusConfig.border)}>
                <div className={cn("h-1.5 w-full", statusConfig.stripe)} />
                <div className="p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">OS {item.os || "-"}</Badge>
                        <Badge className={statusConfig.badge}>{statusConfig.status}</Badge>
                        <Badge className="bg-white text-slate-700 border-slate-300">{isOutsourced ? "Terceirizada" : "Própria"}</Badge>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-900 break-words">{item.service || "Serviço não informado"}</h3>
                      <p className="mt-2 text-sm text-slate-500">Solicitante: <span className="font-medium text-slate-700">{item.requester || "-"}</span></p>
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 min-w-[220px]">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold">Custo total</p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatCurrencyBR(item.totalCost || item.cost || 0)}</p>
                      <p className="mt-1 text-sm text-slate-500">BDI: {Number(item.bdi || 0).toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Responsável</p>
                      <p className="mt-1 font-semibold text-slate-900">{item.responsible || "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Data limite</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatDateBR(item.limitDate)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Atraso</p>
                      <p className="mt-1 font-semibold text-slate-900">{getDelayIndicator(item)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Composição</p>
                      <p className="mt-1 font-semibold text-slate-900">{isOutsourced ? "Serviço terceirizado" : `${(item.labor || []).length} cargo(s)`}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onView(item)}>Detalhes</Button>
                    <Button variant="outline" className="h-10 px-4 border-emerald-300 text-emerald-800 hover:bg-emerald-50" onClick={() => onEdit(item)}>Editar</Button>
                    <Button variant="danger" className="h-10 px-4" onClick={() => onDelete(item.id)}>Excluir</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="p-10 text-center text-slate-500">Nenhuma manutenção cadastrada para esta obra.</div>
        </Card>
      )}
    </div>
  );
}

function AttendancePage({ attendance, companies, roles, onBack, onAddPresence, onAddCompany, onAddRole, onDeletePresence, onDeleteCompany, onDeleteRole }) {
  const grouped = useMemo(() => {
    return companies.map((company) => {
      const companyRoles = roles.filter((role) => role.companyId === company.id);
      const rows = companyRoles.map((role) => {
        const qty = attendance
          .filter((item) => item.companyId === company.id && item.roleId === role.id)
          .reduce((acc, item) => acc + Number(item.qty || 0), 0);

        return {
          roleId: role.id,
          roleName: role.name,
          qty,
          attendanceIds: attendance.filter((item) => item.companyId === company.id && item.roleId === role.id).map((item) => item.id),
        };
      });

      return { company, rows, total: rows.reduce((acc, row) => acc + row.qty, 0) };
    });
  }, [attendance, companies, roles]);

  const totalPresent = grouped.reduce((acc, company) => acc + company.total, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Presença"
          description="Controle por empresa e cargo/função no modelo da planilha"
          right={<div className="flex flex-wrap gap-3"><Button onClick={onAddCompany}>Nova empresa</Button><Button variant="outline" onClick={onAddRole}>Nova função</Button><Button variant="outline" onClick={onAddPresence}>Lançar presença</Button><ReturnHomeButton onClick={onBack} /></div>}
        />
      </Card>

      <Card>
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Users className="h-6 w-6" /></div><div><p className="text-sm text-slate-500">Total presente na obra</p><p className="text-3xl font-extrabold text-slate-900">{totalPresent}</p></div></div>
          <Badge className="bg-white text-slate-700 border-slate-300">Data base: {getTodayBR()}</Badge>
        </div>
      </Card>

      <div className="space-y-6">
        {grouped.map(({ company, rows, total }) => (
          <Card key={company.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 p-5 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{company.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{company.city}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">{total} presentes</Badge>
                <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => onDeleteCompany(company.id)}>Excluir empresa</Button>
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-900">CARGO/FUNÇÃO</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-900 w-40">PRESENTE</th>
                      <th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-900 w-44">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((row) => (
                      <tr key={row.roleId} className="bg-white">
                        <td className="border-b border-slate-200 px-4 py-3 text-base text-slate-800">{row.roleName}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-center text-xl font-bold text-slate-900">{row.qty}</td>
                        <td className="border-b border-slate-200 px-4 py-3">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {row.attendanceIds.length ? <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => onDeletePresence(row.attendanceIds[row.attendanceIds.length - 1])}>Excluir presença</Button> : null}
                            <Button variant="outline" className="h-9 px-3 rounded-xl" onClick={() => onDeleteRole(row.roleId)}>Excluir função</Button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-500">Nenhuma função cadastrada para esta empresa.</td></tr>
                    )}
                    <tr className="bg-slate-100">
                      <td className="px-4 py-3 text-right text-xl font-extrabold text-slate-900">TOTAL</td>
                      <td className="px-4 py-3 text-center text-2xl font-extrabold text-slate-900">{total}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function buildPdfHeader(doc, title, obraNome, date, generatedAt) {
  const marginLeft = 30;
  const marginRight = 20;
  const marginTop = 20;
  const pageWidth = 210;
  let y = marginTop;

  return loadImageDataUrl(LOGO_SRC)
    .then((imageDataUrl) => {
      const logoWidth = 26;
      const logoHeight = 26;
      const textStartX = marginLeft + logoWidth + 10;
      doc.addImage(imageDataUrl, "PNG", marginLeft, y, logoWidth, logoHeight);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(title, textStartX, y + 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Obra: ${obraNome || "Não informada"}`, textStartX, y + 12);
      doc.setFontSize(10);
      doc.text(`Data do fechamento: ${formatDateBR(date)}`, textStartX, y + 18);
      doc.text(`Gerado em: ${generatedAt}`, textStartX, y + 24);
      y += 32;
      doc.line(marginLeft, y, pageWidth - marginRight, y);
      y += 6;
      return { y, marginLeft, marginRight };
    })
    .catch(() => ({ y: 26, marginLeft, marginRight }));
}

function addPageNumbers(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(String(i), doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }
}

async function exportDailyPdf(day, companies, roles, obraNome) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = getDateTimeBRNoSeconds();
  const { y, marginLeft, marginRight } = await buildPdfHeader(doc, "RELATÓRIO DIÁRIO - NERO CONSTRUÇÕES", obraNome, day.date, generatedAt);
  const attendanceRows = companies.flatMap((company) =>
    roles
      .filter((role) => role.companyId === company.id)
      .map((role) => {
        const qty = (day.attendance || []).filter((a) => a.companyId === company.id && a.roleId === role.id).reduce((acc, row) => acc + Number(row.qty || 0), 0);
        return qty > 0 ? [company.name, role.name, qty] : null;
      })
      .filter(Boolean)
  );
  const maintenanceRows = (day.maintenance || []).map((m) => [m.os, m.service, getMaintenanceStatus(m), getDelayIndicator(m)]);
  const stockRows = (day.stock || []).map((s) => [s.item, s.quantity, s.min, formatCurrencyBR(s.price)]);

  autoTable(doc, { startY: y, margin: { left: marginLeft, right: marginRight }, styles: { fontSize: 10, font: "helvetica", cellPadding: 1.5 }, head: [["Indicador", "Valor"]], body: [["Total presente", String((day.attendance || []).reduce((acc, row) => acc + Number(row.qty || 0), 0))], ["Materiais cadastrados", String((day.stock || []).length)], ["Ordens de manutenção", String((day.maintenance || []).length)]], theme: "grid" });

  let nextY = doc.lastAutoTable.finalY + 6;
  autoTable(doc, { startY: nextY, margin: { left: marginLeft, right: marginRight }, styles: { fontSize: 10, font: "helvetica", cellPadding: 1.5 }, head: [["Empresa", "Função", "Quantidade"]], body: attendanceRows.length ? attendanceRows : [["Sem registros", "-", "-"]], theme: "grid" });
  nextY = doc.lastAutoTable.finalY + 6;
  autoTable(doc, { startY: nextY, margin: { left: marginLeft, right: marginRight }, styles: { fontSize: 9, font: "helvetica", cellPadding: 1.5 }, head: [["OS", "Serviço", "Status", "Atraso"]], body: maintenanceRows.length ? maintenanceRows : [["Sem manutenções", "-", "-", "-"]], theme: "grid" });
  nextY = doc.lastAutoTable.finalY + 6;
  autoTable(doc, { startY: nextY, margin: { left: marginLeft, right: marginRight }, styles: { fontSize: 9, font: "helvetica", cellPadding: 1.5 }, head: [["Material", "Saldo", "Mínimo", "Valor"]], body: stockRows.length ? stockRows : [["Sem materiais", "-", "-", "-"]], theme: "grid" });

  addPageNumbers(doc);
  doc.save(`relatorio-geral-${day.date}.pdf`);
}

function HistoryPage({ history, companies, roles, onBack, obraAtual }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="space-y-6">
      <Card><CardHeader title="Histórico diário" description={obraAtual ? `Dias fechados da obra: ${obraAtual.nome}` : "Selecione uma obra"} right={<ReturnHomeButton onClick={onBack} />} /></Card>
      {!history.length ? (
        <Card><div className="p-8 text-center"><p className="text-lg font-semibold text-slate-900">Nenhum dia fechado ainda para esta obra.</p><p className="text-sm text-slate-500 mt-1.5">Use o botão “Fechar dia” no dashboard.</p></div></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {history.map((day) => (
            <Card key={day.id}>
              <div className="p-5 space-y-3">
                <p className="font-semibold text-slate-900">{formatDateBR(day.date)}</p>
                <div className="text-sm text-slate-500">Obra: {day.obraName || "-"}</div>
                <div className="text-sm text-slate-500">{day.maintenance?.length || 0} manutenções • {day.stock?.length || 0} itens • {day.attendance?.length || 0} registros</div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setSelected(day)}>Ver detalhes</Button>
                  <Button onClick={() => exportDailyPdf(day, companies, roles, day.obraName)}><FileText className="h-4 w-4" /> PDF Geral</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected ? (
        <Card>
          <CardHeader title={`Detalhes - ${formatDateBR(selected.date)}`} description={`Obra: ${selected.obraName || "-"} • Snapshot salvo em ${new Date(selected.createdAt).toLocaleString("pt-BR")}`} right={<Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>} />
          <div className="p-5 space-y-6">
            <div><h4 className="font-bold text-slate-900 mb-3">Presença</h4><div className="space-y-2">{(selected.attendance || []).map((row) => <div key={row.id} className="flex justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50"><span>{row.companyId} / {row.roleId}</span><strong>{row.qty}</strong></div>)}</div></div>
            <div><h4 className="font-bold text-slate-900 mb-3">Almoxarifado</h4><div className="space-y-2">{(selected.stock || []).map((row) => <div key={row.id} className="flex justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50"><span>{row.item}</span><strong>{row.quantity}</strong></div>)}</div></div>
            <div><h4 className="font-bold text-slate-900 mb-3">Manutenções</h4><div className="space-y-2">{(selected.maintenance || []).map((row) => <div key={row.id} className="flex justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50"><span>{row.os} - {row.service}</span><strong>{getMaintenanceStatus(row)}</strong></div>)}</div></div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(() => ({ ...initialData, maintenanceRoles: getStoredMaintenanceRoles(initialData.maintenanceRoles) }));
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [obraId, setObraId] = useState("");
  const [onlineMode, setOnlineMode] = useState(isSupabaseConfigured);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [attendanceModal, setAttendanceModal] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [maintenanceRoleModal, setMaintenanceRoleModal] = useState(false);
  const [companyModal, setCompanyModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [obraModal, setObraModal] = useState(false);

  const [attendanceBatchCompanyId, setAttendanceBatchCompanyId] = useState("");
  const [attendanceBatchQuantities, setAttendanceBatchQuantities] = useState({});
  const [companyForm, setCompanyForm] = useState({ name: "", city: "" });
  const [roleForm, setRoleForm] = useState({ companyId: "", name: "" });
  const [maintenanceRoleForm, setMaintenanceRoleForm] = useState({ name: "", daily: 0 });
  const [obraForm, setObraForm] = useState({ nome: "", cliente: "", local: "", status: "Ativa", dataInicio: getTodayISO(), observacao: "" });
  const [stockForm, setStockForm] = useState({ item: "", unit: "un", quantity: 0, min: 0, category: "Material", invoice: "", price: 0 });
  const [maintenanceForm, setMaintenanceForm] = useState(createEmptyMaintenanceForm());
  const [editingMaintenanceId, setEditingMaintenanceId] = useState("");
  const [selectedMaintenanceDetails, setSelectedMaintenanceDetails] = useState(null);

  const obraAtual = useMemo(() => data.obras.find((obra) => sameId(obra.id, obraId)) || null, [data.obras, obraId]);

  const filteredData = useMemo(() => {
    if (!obraAtual) return { companies: data.companies, roles: data.roles, maintenanceRoles: data.maintenanceRoles || [], stock: [], maintenance: [], attendance: [], history: [] };
    return {
      companies: data.companies.filter((item) => !item.obraId || sameId(item.obraId, obraAtual.id)),
      roles: data.roles.filter((item) => !item.obraId || sameId(item.obraId, obraAtual.id)),
      maintenanceRoles: data.maintenanceRoles || [],
      stock: data.stock.filter((item) => sameId(item.obraId, obraAtual.id)),
      maintenance: data.maintenance.filter((item) => sameId(item.obraId, obraAtual.id)),
      attendance: data.attendance.filter((item) => sameId(item.obraId, obraAtual.id)),
      history: data.history.filter((item) => sameId(item.obraId, obraAtual.id)),
    };
  }, [data, obraAtual]);

  const maintenancePreview = useMemo(() => calculateMaintenanceItem(maintenanceForm), [maintenanceForm]);

  const selectedAttendanceRoles = useMemo(() => {
    return filteredData.roles.filter((role) => String(role.companyId) === String(attendanceBatchCompanyId));
  }, [filteredData.roles, attendanceBatchCompanyId]);

  const attendanceBatchTotal = useMemo(() => {
    return Object.values(attendanceBatchQuantities).reduce((acc, value) => acc + Number(value || 0), 0);
  }, [attendanceBatchQuantities]);

  const filteredMaintenance = useMemo(() => {
    if (!search.trim()) return filteredData.maintenance;
    return filteredData.maintenance.filter((item) =>
      [item.os, item.service, item.requester, item.responsible, (item.labor || []).map((line) => line.roleName).join(" "), getMaintenanceStatus(item), getDelayIndicator(item)]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [filteredData.maintenance, search]);

  async function fetchAllData() {
    if (!isSupabaseConfigured || !onlineMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const [obrasRes, companiesRes, rolesRes, stockRes, maintenanceRes, attendanceRes, historyRes] = await Promise.all([
        supabase.from("obras").select("*").order("id", { ascending: true }),
        supabase.from("companies").select("*").order("id", { ascending: true }),
        supabase.from("roles").select("*").order("id", { ascending: true }),
        supabase.from("stock_items").select("*").order("id", { ascending: true }),
        supabase.from("maintenance_orders").select("*").order("id", { ascending: true }),
        supabase.from("attendance_records").select("*").order("id", { ascending: true }),
        supabase.from("history_snapshots").select("*").order("date", { ascending: false }),
      ]);

      const errors = [obrasRes.error, companiesRes.error, rolesRes.error, stockRes.error, maintenanceRes.error, attendanceRes.error, historyRes.error].filter(Boolean);
      if (errors.length) throw errors[0];

      const nextData = {
        obras: (obrasRes.data || []).map((row) => ({ id: row.id, nome: row.nome, cliente: row.cliente, local: row.local, status: row.status, dataInicio: row.data_inicio, observacao: row.observacao })),
        companies: (companiesRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, name: row.name, city: row.city })),
        roles: (rolesRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, companyId: row.company_id, name: row.name })),
        maintenanceRoles: getStoredMaintenanceRoles(initialData.maintenanceRoles),
        stock: (stockRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, item: row.item, unit: row.unit, quantity: row.quantity, min: row.min_quantity, category: row.category, invoice: row.invoice, price: row.price })),
        maintenance: mergeMaintenanceWithStoredDetails((maintenanceRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, os: row.os, service: row.service, requester: row.requester, requestDate: row.request_date, realizationDate: row.realization_date, deliveryDate: row.delivery_date, cost: row.cost, limitDate: row.limit_date, responsible: row.responsible }))),
        attendance: (attendanceRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, companyId: row.company_id, roleId: row.role_id, qty: row.qty })),
        history: (historyRes.data || []).map((row) => ({ id: row.id, obraId: row.obra_id, date: row.date, createdAt: row.created_at, obraName: row.obra_nome, stock: row.snapshot?.stock || [], maintenance: (row.snapshot?.maintenance || []).map((item) => calculateMaintenanceItem(item)), attendance: row.snapshot?.attendance || [] })),
      };

      setData(nextData);
      setObraId((current) => {
        const currentExists = nextData.obras.some((obra) => sameId(obra.id, current));
        if (currentExists) return current;
        return nextData.obras[0]?.id ?? "";
      });
    } catch (error) {
      console.error(error);
      setErrorMessage("Não foi possível carregar os dados do Supabase. Confira as tabelas/colunas do script novo.");
      setOnlineMode(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [onlineMode]);

  useEffect(() => {
    saveStoredMaintenanceRoles(data.maintenanceRoles || []);
  }, [data.maintenanceRoles]);

  useEffect(() => {
    const details = {};
    (data.maintenance || []).forEach((item) => {
      details[item.id] = {
        compositionType: item.compositionType === "outsourced" ? "outsourced" : "own",
        labor: item.labor || [],
        outsourcedServiceCost: Number(item.outsourcedServiceCost || 0),
        materialCost: Number(item.materialCost || 0),
        bdi: Number(item.bdi || 0),
        laborTotal: Number(item.laborTotal || 0),
        subtotal: Number(item.subtotal || 0),
        totalCost: Number(item.totalCost || item.cost || 0),
      };
    });
    saveStoredMaintenanceDetails(details);
  }, [data.maintenance]);

  async function addObra() {
    const payload = { id: generateUuid(), ...obraForm };
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("obras").insert({ id: payload.id, nome: payload.nome, cliente: payload.cliente, local: payload.local, status: payload.status, data_inicio: payload.dataInicio, observacao: payload.observacao });
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, obras: [...prev.obras, payload] }));
    }
    setObraId(payload.id);
    setObraModal(false);
    setObraForm({ nome: "", cliente: "", local: "", status: "Ativa", dataInicio: getTodayISO(), observacao: "" });
  }

  async function addCompany() {
    const payload = { id: generateId(), obraId, name: companyForm.name, city: companyForm.city };
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("companies").insert({ id: payload.id, obra_id: payload.obraId, name: payload.name, city: payload.city });
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, companies: [...prev.companies, payload] }));
    }
    setCompanyModal(false);
    setCompanyForm({ name: "", city: "" });
  }

  async function addRole() {
    const payload = { id: generateId(), obraId, companyId: Number(roleForm.companyId), name: roleForm.name };
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("roles").insert({ id: payload.id, obra_id: payload.obraId, company_id: payload.companyId, name: payload.name });
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, roles: [...prev.roles, payload] }));
    }
    setRoleModal(false);
    setRoleForm({ companyId: "", name: "" });
  }

  function addMaintenanceRole() {
    const payload = { id: generateUuid(), name: maintenanceRoleForm.name.trim(), daily: Number(maintenanceRoleForm.daily || 0) };
    if (!payload.name) return;
    const duplicate = (data.maintenanceRoles || []).some((role) => role.name.trim().toLowerCase() === payload.name.toLowerCase());
    if (duplicate) {
      setErrorMessage("Já existe um cargo de manutenção com esse nome.");
      return;
    }
    setErrorMessage("");
    setData((prev) => ({ ...prev, maintenanceRoles: [...(prev.maintenanceRoles || []), payload].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) }));
    setMaintenanceRoleForm({ name: "", daily: 0 });
  }

  function deleteMaintenanceRole(id) {
    setData((prev) => ({
      ...prev,
      maintenanceRoles: (prev.maintenanceRoles || []).filter((item) => !sameId(item.id, id)),
      maintenance: prev.maintenance.map((item) =>
        calculateMaintenanceItem({
          ...item,
          labor: (item.labor || []).filter((line) => !sameId(line.roleId, id)),
        })
      ),
    }));
  }

  function addMaintenanceLaborLine() {
    setMaintenanceForm((prev) => ({ ...prev, labor: [...(prev.labor || []), createEmptyLaborEntry()] }));
  }

  function removeMaintenanceLaborLine(lineId) {
    setMaintenanceForm((prev) => ({ ...prev, labor: (prev.labor || []).filter((line) => line.id !== lineId) }));
  }

  function updateMaintenanceLaborLine(lineId, patch) {
    setMaintenanceForm((prev) => ({
      ...prev,
      labor: (prev.labor || []).map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    }));
  }

  function handleMaintenanceRoleSelection(lineId, roleId) {
    const selectedRole = (data.maintenanceRoles || []).find((role) => sameId(role.id, roleId));
    updateMaintenanceLaborLine(lineId, {
      roleId,
      roleName: selectedRole?.name || "",
      daily: Number(selectedRole?.daily || 0),
    });
  }

  async function addAttendanceRecord() {
    const companyId = Number(attendanceBatchCompanyId);
    const validRoles = filteredData.roles.filter((role) => role.companyId === companyId);
    const payloads = validRoles.map((role) => ({
      id: generateId(),
      obraId,
      companyId,
      roleId: role.id,
      qty: Number(attendanceBatchQuantities[role.id] || 0),
    })).filter((item) => item.qty > 0);

    if (!companyId) return;

    if (onlineMode && isSupabaseConfigured) {
      const roleIds = validRoles.map((role) => role.id);
      if (roleIds.length) {
        const { error: deleteError } = await supabase.from("attendance_records").delete().eq("obra_id", obraId).eq("company_id", companyId).in("role_id", roleIds);
        if (deleteError) return setErrorMessage(deleteError.message);
      }
      if (payloads.length) {
        const { error } = await supabase.from("attendance_records").insert(payloads.map((item) => ({ id: item.id, obra_id: item.obraId, company_id: item.companyId, role_id: item.roleId, qty: item.qty })));
        if (error) return setErrorMessage(error.message);
      }
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, attendance: [...prev.attendance.filter((item) => !(sameId(item.obraId, obraId) && item.companyId === companyId)), ...payloads] }));
    }

    setAttendanceModal(false);
    setAttendanceBatchCompanyId("");
    setAttendanceBatchQuantities({});
  }

  async function addStockItem() {
    const payload = { id: generateId(), obraId, item: stockForm.item, unit: stockForm.unit, quantity: Number(stockForm.quantity), min: Number(stockForm.min), category: stockForm.category, invoice: stockForm.invoice, price: Number(stockForm.price) };
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("stock_items").insert({ id: payload.id, obra_id: payload.obraId, item: payload.item, unit: payload.unit, quantity: payload.quantity, min_quantity: payload.min, category: payload.category, invoice: payload.invoice, price: payload.price });
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, stock: [...prev.stock, payload] }));
    }
    setStockModal(false);
    setStockForm({ item: "", unit: "un", quantity: 0, min: 0, category: "Material", invoice: "", price: 0 });
  }

  function closeMaintenanceModal() {
    setMaintenanceModal(false);
    setEditingMaintenanceId("");
    setMaintenanceForm(createEmptyMaintenanceForm());
  }

  function openNewMaintenanceModal() {
    setEditingMaintenanceId("");
    setMaintenanceForm(createEmptyMaintenanceForm());
    setMaintenanceModal(true);
  }

  function openMaintenanceEditor(item) {
    const normalized = calculateMaintenanceItem(item);
    setEditingMaintenanceId(item.id);
    setMaintenanceForm({
      os: normalized.os || "",
      service: normalized.service || "",
      requester: normalized.requester || "",
      requestDate: normalized.requestDate || getTodayISO(),
      realizationDate: normalized.realizationDate || "",
      deliveryDate: normalized.deliveryDate || "",
      limitDate: normalized.limitDate || addDaysISO(getTodayISO(), 7),
      responsible: normalized.responsible || "",
      compositionType: normalized.compositionType === "outsourced" ? "outsourced" : "own",
      labor: normalized.labor?.length ? normalized.labor.map((line) => ({ id: line.id || generateUuid(), roleId: line.roleId || "", roleName: line.roleName || "", daily: Number(line.daily || 0), hours: Number(line.hours || 0) })) : [createEmptyLaborEntry()],
      outsourcedServiceCost: Number(normalized.outsourcedServiceCost || 0),
      materialCost: Number(normalized.materialCost || 0),
      bdi: Number(normalized.bdi || 0),
      laborTotal: Number(normalized.laborTotal || 0),
      subtotal: Number(normalized.subtotal || 0),
      totalCost: Number(normalized.totalCost || normalized.cost || 0),
      cost: Number(normalized.totalCost || normalized.cost || 0),
    });
    setMaintenanceModal(true);
  }

  function openMaintenanceDetails(item) {
    setSelectedMaintenanceDetails(calculateMaintenanceItem(item));
  }

  const maintenanceSaveDisabled = !maintenanceForm.os || !maintenanceForm.service || !obraAtual || (
    maintenanceForm.compositionType === "outsourced"
      ? Number(maintenanceForm.outsourcedServiceCost || 0) <= 0
      : !(data.maintenanceRoles || []).length
  );

  async function addMaintenanceOrder() {
    const computed = calculateMaintenanceItem({ id: editingMaintenanceId || generateId(), obraId, ...maintenanceForm });
    if (onlineMode && isSupabaseConfigured) {
      if (editingMaintenanceId) {
        const { error } = await supabase
          .from("maintenance_orders")
          .update({
            obra_id: computed.obraId,
            os: computed.os,
            service: computed.service,
            requester: computed.requester,
            request_date: computed.requestDate,
            realization_date: computed.realizationDate || null,
            delivery_date: computed.deliveryDate || null,
            cost: Number(computed.totalCost || 0),
            limit_date: computed.limitDate,
            responsible: computed.responsible,
          })
          .eq("id", editingMaintenanceId);
        if (error) return setErrorMessage(error.message);
      } else {
        const { error } = await supabase.from("maintenance_orders").insert({
          id: computed.id,
          obra_id: computed.obraId,
          os: computed.os,
          service: computed.service,
          requester: computed.requester,
          request_date: computed.requestDate,
          realization_date: computed.realizationDate || null,
          delivery_date: computed.deliveryDate || null,
          cost: Number(computed.totalCost || 0),
          limit_date: computed.limitDate,
          responsible: computed.responsible,
        });
        if (error) return setErrorMessage(error.message);
      }
      upsertStoredMaintenanceDetail(computed);
      await fetchAllData();
    } else {
      setData((prev) => ({
        ...prev,
        maintenance: editingMaintenanceId
          ? prev.maintenance.map((item) => sameId(item.id, editingMaintenanceId) ? computed : item)
          : [...prev.maintenance, computed],
      }));
    }
    closeMaintenanceModal();
  }

  async function deleteCompany(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, companies: prev.companies.filter((item) => item.id !== id), roles: prev.roles.filter((item) => item.companyId !== id), attendance: prev.attendance.filter((item) => item.companyId !== id) }));
    }
  }

  async function deleteRole(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, roles: prev.roles.filter((item) => item.id !== id), attendance: prev.attendance.filter((item) => item.roleId !== id) }));
    }
  }

  async function deleteAttendanceRecord(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("attendance_records").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, attendance: prev.attendance.filter((item) => item.id !== id) }));
    }
  }

  async function deleteStockItem(id) {
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("stock_items").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, stock: prev.stock.filter((item) => item.id !== id) }));
    }
  }

  async function deleteMaintenanceOrder(id) {
    removeStoredMaintenanceDetail(id);
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("maintenance_orders").delete().eq("id", id);
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, maintenance: prev.maintenance.filter((item) => item.id !== id) }));
    }
  }

  async function closeDay() {
    if (!obraAtual) return;
    const snapshot = { id: generateId(), obraId: obraAtual.id, date: getTodayISO(), createdAt: new Date().toISOString(), obraName: obraAtual.nome, stock: filteredData.stock, maintenance: filteredData.maintenance, attendance: filteredData.attendance };
    if (onlineMode && isSupabaseConfigured) {
      const { error } = await supabase.from("history_snapshots").insert({ id: snapshot.id, obra_id: snapshot.obraId, date: snapshot.date, obra_nome: snapshot.obraName, snapshot: { stock: snapshot.stock, maintenance: snapshot.maintenance, attendance: snapshot.attendance } });
      if (error) return setErrorMessage(error.message);
      await fetchAllData();
    } else {
      setData((prev) => ({ ...prev, history: [snapshot, ...prev.history] }));
    }
  }

  function buildBackup() {
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      data,
    };
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-nero-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackupFromFile(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed?.data) throw new Error("Arquivo inválido.");
        setData({ ...parsed.data, maintenanceRoles: parsed.data.maintenanceRoles || getStoredMaintenanceRoles(initialData.maintenanceRoles), maintenance: (parsed.data.maintenance || []).map((item) => calculateMaintenanceItem(item)) });
        if (parsed.data.obras?.[0]) setObraId(parsed.data.obras[0].id);
      } catch (error) {
        setErrorMessage("Não foi possível ler o backup. Verifique se é um JSON exportado pelo sistema.");
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    saveStoredMaintenanceRoles(initialData.maintenanceRoles);
    saveStoredMaintenanceDetails({});
    setData(initialData);
    setCurrentPage("dashboard");
    setSearch("");
    setObraId(initialData.obras[0]?.id || "");
    setErrorMessage("");
  }

  const connectionBadge = (
    <div className="flex items-center gap-2">
      <ConnectionBadge configured={isSupabaseConfigured} onlineMode={onlineMode} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1540px]">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <div className="flex-1 min-w-0">
          <Topbar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onReset={resetData}
            onCloseDay={closeDay}
            obraId={obraId}
            setObraId={setObraId}
            obras={data.obras}
            connectionBadge={connectionBadge}
            onOpenObras={() => setObraModal(true)}
            onExportBackup={exportBackup}
            onImportBackupClick={() => document.getElementById("backup-input").click()}
          />

          <input id="backup-input" type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importBackupFromFile(e.target.files[0])} />

          {errorMessage ? <div className="px-5 md:px-8 pt-5"><div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">{errorMessage}</div></div> : null}

          <main className="px-5 md:px-8 py-6 md:py-8">
            {loading ? (
              <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
                <p className="text-base font-semibold text-slate-900">Carregando dados...</p>
                <p className="text-sm text-slate-500 mt-1.5">Aguarde a sincronização do sistema.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={currentPage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                  {currentPage === "dashboard" && <DashboardPage data={filteredData} obraAtual={obraAtual} historyCountForObra={filteredData.history.length} onGoToStock={() => setCurrentPage("stock")} onGoToMaintenance={() => setCurrentPage("maintenance")} onGoToAttendance={() => setCurrentPage("attendance")} onGoToHistory={() => setCurrentPage("history")} />}
                  {currentPage === "stock" && <StockPage stock={filteredData.stock} onBack={() => setCurrentPage("dashboard")} onAdd={() => setStockModal(true)} onDelete={deleteStockItem} />}
                  {currentPage === "maintenance" && <MaintenancePage items={filteredMaintenance} search={search} setSearch={setSearch} onBack={() => setCurrentPage("dashboard")} onAdd={openNewMaintenanceModal} onDelete={deleteMaintenanceOrder} onEdit={openMaintenanceEditor} onView={openMaintenanceDetails} onManageRoles={() => setMaintenanceRoleModal(true)} maintenanceRolesCount={data.maintenanceRoles?.length || 0} />}
                  {currentPage === "attendance" && <AttendancePage attendance={filteredData.attendance} companies={filteredData.companies} roles={filteredData.roles} onBack={() => setCurrentPage("dashboard")} onAddPresence={() => setAttendanceModal(true)} onAddCompany={() => setCompanyModal(true)} onAddRole={() => setRoleModal(true)} onDeletePresence={deleteAttendanceRecord} onDeleteCompany={deleteCompany} onDeleteRole={deleteRole} />}
                  {currentPage === "history" && <HistoryPage history={filteredData.history} companies={filteredData.companies} roles={filteredData.roles} onBack={() => setCurrentPage("dashboard")} obraAtual={obraAtual} />}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      <Modal open={obraModal} title="Cadastro de obras" onClose={() => setObraModal(false)}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da obra"><Input value={obraForm.nome} onChange={(e) => setObraForm((prev) => ({ ...prev, nome: e.target.value }))} /></Field>
            <Field label="Cliente"><Input value={obraForm.cliente} onChange={(e) => setObraForm((prev) => ({ ...prev, cliente: e.target.value }))} /></Field>
            <Field label="Local"><Input value={obraForm.local} onChange={(e) => setObraForm((prev) => ({ ...prev, local: e.target.value }))} /></Field>
            <Field label="Status"><SelectField value={obraForm.status} onChange={(value) => setObraForm((prev) => ({ ...prev, status: value }))} options={[{ value: "Ativa", label: "Ativa" }, { value: "Pausada", label: "Pausada" }, { value: "Concluída", label: "Concluída" }]} /></Field>
            <Field label="Data de início"><Input type="date" value={obraForm.dataInicio} onChange={(e) => setObraForm((prev) => ({ ...prev, dataInicio: e.target.value }))} /></Field>
            <Field label="Observação"><Input value={obraForm.observacao} onChange={(e) => setObraForm((prev) => ({ ...prev, observacao: e.target.value }))} /></Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setObraModal(false)}>Fechar</Button>
            <Button onClick={addObra} disabled={!obraForm.nome}>Salvar obra</Button>
          </div>
          <Card>
            <CardHeader title="Obras cadastradas" />
            <div className="p-5 space-y-3">
              {data.obras.map((obra) => (
                <div key={obra.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{obra.nome}</p>
                    <p className="text-sm text-slate-500">{obra.cliente} • {obra.local}</p>
                  </div>
                  <Badge className="bg-white text-slate-700 border-slate-300">{obra.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Modal>

      <Modal open={attendanceModal} title="Lançar presença" onClose={() => setAttendanceModal(false)}>
        <div className="space-y-5">
          <Field label="Empresa">
            <SelectField value={attendanceBatchCompanyId} onChange={(value) => { setAttendanceBatchCompanyId(value); setAttendanceBatchQuantities({}); }} options={[{ value: "", label: "Selecione..." }, ...filteredData.companies.map((c) => ({ value: String(c.id), label: c.name }))]} />
          </Field>
          {attendanceBatchCompanyId ? (
            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              <table className="w-full border-collapse">
                <thead><tr className="bg-slate-100"><th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-900">CARGO/FUNÇÃO</th><th className="border-b border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-900 w-40">PRESENTE</th></tr></thead>
                <tbody>
                  {selectedAttendanceRoles.length ? selectedAttendanceRoles.map((role) => (
                    <tr key={role.id}>
                      <td className="border-b border-slate-200 px-4 py-3 text-base text-slate-800">{role.name}</td>
                      <td className="border-b border-slate-200 px-4 py-3"><input type="number" min="0" value={attendanceBatchQuantities[role.id] ?? 0} onChange={(e) => setAttendanceBatchQuantities((prev) => ({ ...prev, [role.id]: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-base outline-none focus:border-emerald-500" /></td>
                    </tr>
                  )) : <tr><td colSpan={2} className="px-4 py-4 text-center text-slate-500">Nenhuma função cadastrada para esta empresa.</td></tr>}
                  <tr className="bg-slate-100"><td className="px-4 py-3 text-right text-xl font-extrabold text-slate-900">TOTAL</td><td className="px-4 py-3 text-center text-2xl font-extrabold text-slate-900">{attendanceBatchTotal}</td></tr>
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setAttendanceModal(false)}>Cancelar</Button><Button onClick={addAttendanceRecord} disabled={!attendanceBatchCompanyId}>Salvar tudo</Button></div>
        </div>
      </Modal>

      <Modal open={companyModal} title="Nova empresa" onClose={() => setCompanyModal(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome da empresa"><Input value={companyForm.name} onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <Field label="Cidade / UF"><Input value={companyForm.city} onChange={(e) => setCompanyForm((prev) => ({ ...prev, city: e.target.value }))} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setCompanyModal(false)}>Cancelar</Button><Button onClick={addCompany} disabled={!companyForm.name || !obraAtual}>Salvar</Button></div>
      </Modal>

      <Modal open={roleModal} title="Nova função / cargo" onClose={() => setRoleModal(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Empresa"><SelectField value={roleForm.companyId} onChange={(value) => setRoleForm((prev) => ({ ...prev, companyId: value }))} options={[{ value: "", label: "Selecione..." }, ...filteredData.companies.map((company) => ({ value: String(company.id), label: company.name }))]} /></Field>
          <Field label="Cargo / função"><Input value={roleForm.name} onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setRoleModal(false)}>Cancelar</Button><Button onClick={addRole} disabled={!roleForm.companyId || !roleForm.name || !obraAtual}>Salvar</Button></div>
      </Modal>


      <Modal open={maintenanceRoleModal} title="Cargos da manutenção" onClose={() => setMaintenanceRoleModal(false)}>
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Cadastre quantos cargos quiser. O formulário das OS puxa automaticamente os cargos cadastrados aqui.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_auto] gap-4 items-end">
            <Field label="Cargo">
              <Input value={maintenanceRoleForm.name} onChange={(e) => setMaintenanceRoleForm((prev) => ({ ...prev, name: e.target.value }))} />
            </Field>
            <Field label="Diária (R$)">
              <Input type="number" step="0.01" min="0" value={maintenanceRoleForm.daily} onChange={(e) => setMaintenanceRoleForm((prev) => ({ ...prev, daily: e.target.value }))} />
            </Field>
            <Button onClick={addMaintenanceRole} disabled={!maintenanceRoleForm.name.trim()}><Plus className="h-4 w-4" /> Adicionar</Button>
          </div>

          <Card>
            <CardHeader title="Base de cargos cadastrados" description="Cadastro único para reutilizar em todas as OS" />
            <div className="p-5 space-y-3">
              {(data.maintenanceRoles || []).length ? (data.maintenanceRoles || []).map((role) => (
                <div key={role.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{role.name}</p>
                    <p className="text-sm text-slate-500">Diária: {formatCurrencyBR(role.daily)} • Hora: {formatCurrencyBR(getHourlyRate(role.daily))}</p>
                  </div>
                  <Button variant="danger" className="h-9 px-3 rounded-xl" onClick={() => deleteMaintenanceRole(role.id)}><Trash2 className="h-4 w-4" /> Excluir</Button>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
                  Nenhum cargo de manutenção cadastrado ainda.
                </div>
              )}
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setMaintenanceRoleModal(false)}>Fechar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={stockModal} title="Novo material" onClose={() => setStockModal(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Material"><Input value={stockForm.item} onChange={(e) => setStockForm((prev) => ({ ...prev, item: e.target.value }))} /></Field>
          <Field label="Categoria"><Input value={stockForm.category} onChange={(e) => setStockForm((prev) => ({ ...prev, category: e.target.value }))} /></Field>
          <Field label="Unidade"><Input value={stockForm.unit} onChange={(e) => setStockForm((prev) => ({ ...prev, unit: e.target.value }))} /></Field>
          <Field label="Saldo"><Input type="number" value={stockForm.quantity} onChange={(e) => setStockForm((prev) => ({ ...prev, quantity: e.target.value }))} /></Field>
          <Field label="Mínimo"><Input type="number" value={stockForm.min} onChange={(e) => setStockForm((prev) => ({ ...prev, min: e.target.value }))} /></Field>
          <Field label="NF"><Input value={stockForm.invoice} onChange={(e) => setStockForm((prev) => ({ ...prev, invoice: e.target.value }))} /></Field>
          <Field label="Valor unitário"><Input type="number" step="0.01" value={stockForm.price} onChange={(e) => setStockForm((prev) => ({ ...prev, price: e.target.value }))} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setStockModal(false)}>Cancelar</Button><Button onClick={addStockItem} disabled={!stockForm.item || !obraAtual}>Salvar</Button></div>
      </Modal>


      <Modal open={!!selectedMaintenanceDetails} title={`Detalhes da manutenção${selectedMaintenanceDetails?.os ? ` - OS ${selectedMaintenanceDetails.os}` : ""}`} onClose={() => setSelectedMaintenanceDetails(null)}>
        {selectedMaintenanceDetails ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Serviço</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedMaintenanceDetails.service || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Tipo</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedMaintenanceDetails.compositionType === "outsourced" ? "Terceirizada" : "Própria"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Responsável</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedMaintenanceDetails.responsible || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Total com BDI</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{formatCurrencyBR(selectedMaintenanceDetails.totalCost || selectedMaintenanceDetails.cost || 0)}</p>
              </div>
            </div>

            {selectedMaintenanceDetails.compositionType === "outsourced" ? (
              <Card>
                <CardHeader title="Serviço terceirizado" description="Cálculo com base no valor terceirizado + BDI" />
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Valor terceirizado</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatCurrencyBR(selectedMaintenanceDetails.outsourcedServiceCost || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">BDI</p>
                    <p className="mt-1 font-semibold text-slate-900">{Number(selectedMaintenanceDetails.bdi || 0).toFixed(2)}%</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Subtotal</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatCurrencyBR(selectedMaintenanceDetails.subtotal || 0)}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader title="Composição da mão de obra" description="Linhas utilizadas no cálculo desta OS" />
                  <div className="p-5 space-y-3">
                    {(selectedMaintenanceDetails.labor || []).length ? (selectedMaintenanceDetails.labor || []).map((line) => {
                      const previewLine = calculateLaborLine(line);
                      return (
                        <div key={line.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Cargo</p><p className="mt-1 font-semibold text-slate-900">{previewLine.roleName || "-"}</p></div>
                            <div><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Diária</p><p className="mt-1 font-semibold text-slate-900">{formatCurrencyBR(previewLine.daily)}</p></div>
                            <div><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Horas</p><p className="mt-1 font-semibold text-slate-900">{Number(previewLine.hours || 0).toFixed(2)}</p></div>
                            <div><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Subtotal</p><p className="mt-1 font-semibold text-slate-900">{formatCurrencyBR(previewLine.subtotal)}</p></div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
                        Nenhuma linha de mão de obra lançada nesta OS.
                      </div>
                    )}
                  </div>
                </Card>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <HomeStatCard title="Mão de obra" value={formatCurrencyBR(selectedMaintenanceDetails.laborTotal || 0)} subtitle="Soma das linhas de cargo" icon={Users} tone={selectedMaintenanceDetails.laborTotal > 0 ? "default" : "success"} />
                  <HomeStatCard title="Materiais" value={formatCurrencyBR(selectedMaintenanceDetails.materialCost || 0)} subtitle="Materiais lançados na OS" icon={Package} tone={selectedMaintenanceDetails.materialCost > 0 ? "default" : "success"} />
                  <HomeStatCard title="Subtotal" value={formatCurrencyBR(selectedMaintenanceDetails.subtotal || 0)} subtitle="Antes do BDI" icon={Briefcase} tone={selectedMaintenanceDetails.subtotal > 0 ? "default" : "success"} />
                </section>
              </>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedMaintenanceDetails(null)}>Fechar</Button>
              <Button onClick={() => { const target = selectedMaintenanceDetails; setSelectedMaintenanceDetails(null); openMaintenanceEditor(target); }}>Editar manutenção</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={maintenanceModal} title={editingMaintenanceId ? "Editar manutenção" : "Nova manutenção"} onClose={closeMaintenanceModal}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Field label="OS"><Input value={maintenanceForm.os} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, os: e.target.value }))} /></Field>
            <Field label="Serviço"><Input value={maintenanceForm.service} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, service: e.target.value }))} /></Field>
            <Field label="Solicitante"><Input value={maintenanceForm.requester} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, requester: e.target.value }))} /></Field>
            <Field label="Data solicitação"><Input type="date" value={maintenanceForm.requestDate} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, requestDate: e.target.value, limitDate: addDaysISO(e.target.value, 7) }))} /></Field>
            <Field label="Data realização do serviço"><Input type="date" value={maintenanceForm.realizationDate} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, realizationDate: e.target.value }))} /></Field>
            <Field label="Data entrega"><Input type="date" value={maintenanceForm.deliveryDate} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, deliveryDate: e.target.value }))} /></Field>
            <Field label="Data limite"><Input type="date" value={maintenanceForm.limitDate} readOnly /></Field>
            <Field label="Responsável"><Input value={maintenanceForm.responsible} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, responsible: e.target.value }))} /></Field>
            <Field label="Tipo de composição">
              <SelectField
                value={maintenanceForm.compositionType || "own"}
                onChange={(value) => setMaintenanceForm((prev) => calculateMaintenanceItem({
                  ...prev,
                  compositionType: value,
                  labor: value === "outsourced" ? [] : (prev.labor?.length ? prev.labor : [createEmptyLaborEntry()]),
                  outsourcedServiceCost: value === "outsourced" ? prev.outsourcedServiceCost : 0,
                  materialCost: value === "outsourced" ? 0 : prev.materialCost,
                }))}
                options={[
                  { value: "own", label: "Própria" },
                  { value: "outsourced", label: "Terceirizada" },
                ]}
              />
            </Field>
            <Field label="BDI (%)"><Input type="number" step="0.01" min="0" value={maintenanceForm.bdi} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, bdi: e.target.value }))} /></Field>
            {maintenanceForm.compositionType === "own" ? (
              <Field label="Materiais (R$)"><Input type="number" step="0.01" min="0" value={maintenanceForm.materialCost} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, materialCost: e.target.value }))} /></Field>
            ) : (
              <Field label="Valor terceirizado (R$)"><Input type="number" step="0.01" min="0" value={maintenanceForm.outsourcedServiceCost} onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, outsourcedServiceCost: e.target.value }))} /></Field>
            )}
          </div>

          {maintenanceForm.compositionType === "own" ? (
            <Card>
              <CardHeader
                title="Composição da mão de obra"
                description="Cada linha calcula: horas × (diária ÷ 8)"
                right={
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setMaintenanceRoleModal(true)}><Briefcase className="h-4 w-4" /> Novo cargo</Button>
                    <Button variant="outline" onClick={addMaintenanceLaborLine}><Plus className="h-4 w-4" /> Adicionar cargo</Button>
                  </div>
                }
              />
              <div className="p-5 space-y-4">
                {(maintenanceForm.labor || []).length ? (maintenanceForm.labor || []).map((line) => {
                  const previewLine = calculateLaborLine(line);
                  return (
                    <div key={line.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-4 items-end">
                        <Field label="Cargo">
                          <SelectField
                            value={String(line.roleId || "")}
                            onChange={(value) => handleMaintenanceRoleSelection(line.id, value)}
                            options={[
                              { value: "", label: "Selecione..." },
                              ...(data.maintenanceRoles || []).map((role) => ({ value: String(role.id), label: role.name })),
                            ]}
                          />
                        </Field>

                        <Field label="Diária (R$)">
                          <Input type="number" value={previewLine.daily} readOnly />
                        </Field>

                        <Field label="Valor/hora (R$)">
                          <Input type="number" value={previewLine.hourly.toFixed(2)} readOnly />
                        </Field>

                        <Field label="Horas consumidas">
                          <Input type="number" step="0.01" min="0" value={line.hours} onChange={(e) => updateMaintenanceLaborLine(line.id, { hours: e.target.value })} />
                        </Field>

                        <Button
                          variant="danger"
                          className="w-full xl:w-auto"
                          onClick={() => removeMaintenanceLaborLine(line.id)}
                          disabled={(maintenanceForm.labor || []).length === 1}
                        >
                          <Trash2 className="h-4 w-4" /> Remover
                        </Button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Diária</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrencyBR(previewLine.daily)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Valor/hora</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrencyBR(previewLine.hourly)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Subtotal da linha</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrencyBR(previewLine.subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
                    Adicione pelo menos um cargo para compor a mão de obra da OS.
                  </div>
                )}

                {!data.maintenanceRoles?.length ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Cadastre os cargos da manutenção antes de lançar a composição da OS.
                  </div>
                ) : null}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Serviço terceirizado" description="Informe apenas o valor do serviço. O sistema aplicará somente o BDI." right={<Button variant="outline" onClick={() => setMaintenanceRoleModal(true)}><Briefcase className="h-4 w-4" /> Gerenciar cargos</Button>} />
              <div className="p-5">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Valor base do serviço terceirizado</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatCurrencyBR(maintenancePreview.outsourcedServiceCost || 0)}</p>
                  <p className="mt-2 text-sm text-slate-500">Total final calculado com BDI de {Number(maintenanceForm.bdi || 0).toFixed(2)}%.</p>
                </div>
              </div>
            </Card>
          )}

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {maintenanceForm.compositionType === "own" ? (
              <>
                <HomeStatCard title="Mão de obra" value={formatCurrencyBR(maintenancePreview.laborTotal)} subtitle="Soma das linhas de cargo" icon={Users} tone={maintenancePreview.laborTotal > 0 ? "default" : "success"} />
                <HomeStatCard title="Subtotal" value={formatCurrencyBR(maintenancePreview.subtotal)} subtitle="Mão de obra + materiais" icon={Package} tone={maintenancePreview.subtotal > 0 ? "default" : "success"} />
              </>
            ) : (
              <>
                <HomeStatCard title="Serviço terceirizado" value={formatCurrencyBR(maintenancePreview.outsourcedServiceCost || 0)} subtitle="Valor base informado" icon={Users} tone={maintenancePreview.outsourcedServiceCost > 0 ? "default" : "success"} />
                <HomeStatCard title="Subtotal" value={formatCurrencyBR(maintenancePreview.subtotal)} subtitle="Base para aplicação do BDI" icon={Package} tone={maintenancePreview.subtotal > 0 ? "default" : "success"} />
              </>
            )}
            <HomeStatCard title="Total com BDI" value={formatCurrencyBR(maintenancePreview.totalCost)} subtitle={`BDI aplicado: ${Number(maintenanceForm.bdi || 0).toFixed(2)}%`} icon={Briefcase} tone={maintenancePreview.totalCost > 0 ? "danger" : "success"} />
          </section>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={closeMaintenanceModal}>Cancelar</Button>
            <Button onClick={addMaintenanceOrder} disabled={maintenanceSaveDisabled}>
              {editingMaintenanceId ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
