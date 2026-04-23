import React from "react";

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "green",
}) {
  const accents = {
    green: "from-green-50 to-white border-green-200",
    blue: "from-emerald-50 to-white border-emerald-200",
    amber: "from-amber-50 to-white border-amber-200",
    red: "from-red-50 to-white border-red-200",
    dark: "from-slate-50 to-white border-slate-200",
  };

  return (
    <div
      className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${
        accents[accent] || accents.green
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-green-100">
          <Icon className="h-5 w-5 text-green-800" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  );
}