import React from "react";

const toneMap = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-800",
  default: "border-slate-200 bg-white text-slate-800",
};

export default function KpiCard({ title, value, subtitle, icon: Icon, accent = "default" }) {
  const tone = toneMap[accent] || toneMap.default;
  return (
    <div className={`rounded-[22px] border p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {subtitle ? <p className="mt-2 text-sm opacity-80">{subtitle}</p> : null}
        </div>
        {Icon ? <Icon className="h-5 w-5 opacity-80" /> : null}
      </div>
    </div>
  );
}
