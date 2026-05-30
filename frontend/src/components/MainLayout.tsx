import React from "react";
import { useTournamentStore } from "../services/useTournamentStore";

interface MainLayoutProps {
  children: React.ReactNode;
  currentRoute: string;
  onRouteChange: (route: string) => void;
}

export default function MainLayout({ children, currentRoute, onRouteChange }: MainLayoutProps) {
  const { matches } = useTournamentStore();

  // Compute live statistics from the state store to display in the neon sidebar widgets
  const totalMatches = matches.length;
  const overriddenMatches = matches.filter((m) => m.isOverridden).length;
  const simulatedMatches = matches.filter((m) => !m.isOverridden && (m.simulatedHomeScore !== null)).length;

  const navItems = [
    {
      id: "home",
      label: "ANA SAYFA",
      description: "Genel Kupa Görünümü",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-[#00FF87]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: "groups",
      label: "GRUP TABLOLARI",
      description: "Puan Durumu & Simülasyon",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-[#00FF87]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    },
    {
      id: "matches",
      label: "FİKSTÜR & ELEMELER",
      description: "Cascade Simülatör Oyunu",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-[#00FF87]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: "teams",
      label: "TAKIM KADROLARI",
      description: "Kadro Değerleri & İstatistikler",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-[#00FF87]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: "elo",
      label: "ELO RATINGS",
      description: "Güncel ELO Puan Durumu",
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? "text-[#00FF87]" : "text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col md:flex-row relative overflow-x-hidden select-none">
      {/* Dark Swiss Grid Background overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25 z-0" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px"
        }}
      />

      {/* ── DESKTOP SIDEBAR (Hidden on mobile) ────────────────── */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 bg-zinc-900 border-r-[3px] border-black z-20 sticky top-0 h-screen justify-between p-6 select-none shadow-[4px_0_0_#1A1916]">
        <div className="flex flex-col space-y-8">
          {/* Logo Widget */}
          <div className="flex items-center space-x-3 border-b-2 border-zinc-800 pb-5">
            <div className="w-10 h-10 bg-[#00FF87] flex items-center justify-center font-black text-black text-xl border-2 border-black shadow-[2px_2px_0px_#000]">
              FW
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wider text-white">WORLD CUP 2026</h1>
              <p className="text-[10px] text-[#00E5FF] font-mono tracking-widest uppercase">CASCADE SIMULATOR</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-3">
            <span className="text-[9px] font-bold text-zinc-500 tracking-[0.25em] mb-1">MENÜ SEÇENEKLERİ</span>
            {navItems.map((item) => {
              const active = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onRouteChange(item.id)}
                  className={`flex items-start p-3 text-left transition-all duration-150 relative group ${
                    active
                      ? "bg-zinc-800 border-2 border-[#00FF87] shadow-[3px_3px_0px_#00FF87] -translate-x-[2px] -translate-y-[2px]"
                      : "border-2 border-transparent hover:bg-zinc-800/50 hover:border-zinc-800"
                  }`}
                  style={{ borderRadius: "0px" }}
                >
                  <div className="mr-3 mt-[2px]">{item.icon(active)}</div>
                  <div className="flex flex-col">
                    <span className={`text-xs font-black tracking-wide ${active ? "text-[#00FF87]" : "text-white"}`}>
                      {item.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-medium group-hover:text-zinc-400 transition-colors">
                      {item.description}
                    </span>
                  </div>
                  {active && (
                    <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-[#00FF87] rounded-r-sm shadow-[0_0_8px_#00FF87]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Live Terminal HUD Statistics Widget */}
        <div className="bg-black/40 border-2 border-zinc-800 p-4 space-y-3 font-mono relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#00E5FF] animate-pulse" />
          <div className="flex items-center space-x-2 text-[10px] text-[#00E5FF] font-bold">
            <span className="w-2 h-2 bg-[#00FF87] animate-pulse rounded-full" />
            <span>SIM MOTOR STATUS: ON</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
            <div className="flex flex-col border-r border-zinc-800 pr-2">
              <span className="text-zinc-600 font-bold uppercase text-[8px]">Toplam Maç</span>
              <span className="text-white text-xs font-black">{totalMatches}</span>
            </div>
            <div className="flex flex-col pl-1">
              <span className="text-zinc-600 font-bold uppercase text-[8px]">Simüle Edilen</span>
              <span className="text-white text-xs font-black">{simulatedMatches}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-[9px]">
            <span className="text-[#00FF87] font-bold">KULLANICI MÜDAHALESİ:</span>
            <span className={`px-1.5 py-0.5 font-bold ${overriddenMatches > 0 ? "bg-[#00FF87] text-black" : "bg-zinc-800 text-zinc-400"}`}>
              {overriddenMatches} MAÇ
            </span>
          </div>
        </div>
      </aside>

      {/* ── MOBILE HEADER BAR (Hidden on desktop) ─────────────── */}
      <header className="md:hidden flex items-center justify-between bg-zinc-900 border-b-[3px] border-black p-4 z-20 sticky top-0 select-none shadow-[0_3px_0_#1A1916]">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-[#00FF87] flex items-center justify-center font-black text-black text-lg border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
            FW
          </div>
          <div>
            <h1 className="text-xs font-extrabold tracking-wider text-white">WORLD CUP 2026</h1>
            <p className="text-[8px] text-[#00E5FF] font-mono tracking-widest uppercase">CASCADE SIMULATOR</p>
          </div>
        </div>

        {/* Small Mobile HUD stats */}
        <div className="flex items-center space-x-3 bg-black border border-zinc-800 px-2.5 py-1 text-[9px] font-mono">
          <span className="w-1.5 h-1.5 bg-[#00FF87] rounded-full animate-ping" />
          <span className="text-zinc-400">T: <b className="text-white">{totalMatches}</b></span>
          <span className="text-zinc-400">M: <b className="text-[#00FF87]">{overriddenMatches}</b></span>
        </div>
      </header>

      {/* ── MAIN CONTENT WORKSPACE AREA ──────────────────────── */}
      <main className="flex-grow z-10 p-4 md:p-8 flex flex-col max-w-7xl w-full mx-auto md:pb-8 pb-24 min-h-[calc(100vh-64px)] md:min-h-screen">
        {/* Neon decorative ribbon */}
        <div className="w-full h-1 bg-gradient-to-r from-[#00FF87] via-[#00E5FF] to-[#FFE600] opacity-80 mb-6 shadow-[0_0_8px_rgba(0,255,135,0.4)]" />
        
        <div className="flex-grow">
          {children}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION (Hidden on desktop) ───────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-18 bg-zinc-900 border-t-[3px] border-black z-40 flex items-center justify-around px-3 pb-safe shadow-[0_-3px_0_#1A1916]">
        {navItems.map((item) => {
          const active = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onRouteChange(item.id)}
              className="flex flex-col items-center justify-center flex-1 py-2 relative"
            >
              <div className={`p-1.5 transition-transform duration-100 ${active ? "scale-110 -translate-y-1 bg-zinc-800 border border-zinc-700 shadow-[2px_2px_0px_rgba(0,255,135,0.3)]" : ""}`}>
                {item.icon(active)}
              </div>
              <span className={`text-[8px] font-black tracking-widest mt-1 ${active ? "text-[#00FF87]" : "text-zinc-500"}`}>
                {active ? item.label.split(" ")[0] : item.label.slice(0, 5)}
              </span>
              {active && (
                <div className="absolute top-0 w-8 h-[3px] bg-[#00FF87] shadow-[0_0_6px_#00FF87]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
