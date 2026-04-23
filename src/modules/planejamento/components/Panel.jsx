import React from "react";

export default function Panel({ title, right, children }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h3 className="text-lg font-semibold text-slate-900">{title}</h3> : <div />}
          {right || null}
        </div>
      )}
      {children}
    </section>
  );
}
