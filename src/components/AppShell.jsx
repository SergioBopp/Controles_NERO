import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[rgb(247,250,247)] text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 md:p-6 xl:p-8">
        <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
          <Sidebar />
          <main className="space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}