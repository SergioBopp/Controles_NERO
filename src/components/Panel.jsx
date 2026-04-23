import React from "react";

export default function Panel({ title, right, children, className = "" }) {
  return (
    <section
      className={`rounded-[28px] border border-green-100 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}