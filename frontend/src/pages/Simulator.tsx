import { useState } from "react";
import MainLayout from "../components/MainLayout";
import GroupTable from "../components/GroupTable";
import MatchCard from "../components/MatchCard";
import { useTournamentStore } from "../services/useTournamentStore";

type SubTabType = "groups" | "matches";
type StageType = "GROUP" | "R32" | "R16" | "QF" | "SF" | "F";

const STAGE_LABELS: Record<StageType, string> = {
  GROUP: "GRUP AŞAMASI",
  R32: "SON 32 TURU",
  R16: "SON 16 TURU",
  QF: "ÇEYREK FİNAL",
  SF: "YARI FİNAL",
  F: "BÜYÜK FİNAL",
};

const STAGE_COLORS: Record<StageType, string> = {
  GROUP: "#00FF87",
  R32: "#00E5FF",
  R16: "#FFE600",
  QF: "#FF6B00",
  SF: "#FF2D78",
  F: "#A78BFA",
};

export default function Simulator() {
  const [subTab, setSubTab] = useState<SubTabType>("groups");
  const [activeStage, setActiveStage] = useState<StageType>("GROUP");
  const { matches, resetAllMatches, reRollSeed, seed, loading, error } = useTournamentStore();

  const handleSubTabChange = (id: string) => {
    if (id === "groups" || id === "matches") {
      setSubTab(id);
    } else {
      // Redirect back to normal light-themed site routes
      window.location.hash = `#/${id}`;
    }
  };

  const filteredMatches = matches.filter((m) => m.stage === activeStage);
  const overriddenCount = matches.filter((m) => m.isOverridden).length;
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  return (
    <MainLayout currentRoute={subTab} onRouteChange={handleSubTabChange}>
      <div className="space-y-8 animate-fade-up text-white">
        {/* ══ DOCKPIT HEADER ══ */}
        <div className="relative overflow-hidden p-6 md:p-10 bg-zinc-900 border-[3px] border-black shadow-[6px_6px_0_#00FF87]">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
              `,
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00FF87] shadow-[0_0_12px_#00FF87]" />

          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="neon-badge neon-badge-green">KOKPİT MODU</span>
                <span className="neon-badge neon-badge-cyan">104 MAÇ Simülatörü</span>
                <span className="neon-badge neon-badge-yellow">CASCADE MOTOR</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">
                DÜNYA KUPASI 2026
                <br />
                <span className="text-[#00FF87] drop-shadow-[0_0_15px_rgba(0,255,135,0.3)]">TAHMİN KOKPİTİ</span>
              </h1>
              <p className="text-zinc-400 text-xs font-medium leading-relaxed max-w-[50ch]">
                Bu panel tamamen client-side çalışan matematiksel bir "What-If" simülasyon alanıdır. Herhangi bir maçın skorunu değiştirdiğinizde, tüm puan durumları ve eleme ağacı anında baştan hesaplanır.
              </p>
            </div>

            <div className="flex items-center space-x-3 flex-wrap gap-2.5">
              <button
                onClick={reRollSeed}
                className="swiss-btn-primary bg-[#00E5FF] hover:bg-[#00B4D8] text-zinc-950 border-black shadow-[3px_3px_0px_#00FF87] uppercase text-[10px] tracking-widest font-black"
                title={`Mevcut Tohum (Seed): ${seed}. Yeni olasılıklarla tekrar simüle et.`}
              >
                🎲 TAHMİNİ YENİLE ({seed})
              </button>

              {overriddenCount > 0 && (
                <button
                  onClick={resetAllMatches}
                  className="swiss-btn-primary bg-[#FF2D78] hover:bg-[#D8105B] text-white border-[#FF2D78] shadow-[4px_4px_0px_#FFF] uppercase text-[10px] tracking-widest font-black"
                >
                  🔄 SIFIRLA ({overriddenCount})
                </button>
              )}
              <a
                href="#/home"
                className="swiss-btn-secondary text-white border-zinc-700 hover:bg-zinc-800 uppercase text-[10px] tracking-widest font-black"
              >
                ← Normal Siteye Dön
              </a>
            </div>
          </div>
        </div>

        {/* ══ LOADING / ERROR STATES ══ */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-zinc-900 border-2 border-black shadow-[4px_4px_0_#1A1916]">
            <div className="w-10 h-10 border-3 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
            <p className="swiss-label animate-retro-blink text-zinc-400">Tahmin Motoru Yükleniyor...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-12 text-center bg-red-950/20 border-2 border-red-900 text-red-400 shadow-[4px_4px_0_#1A1916]">
            <div className="text-3xl mb-3">⚠️</div>
            <h4 className="font-black text-sm uppercase">Simülasyon Başlatma Hatası</h4>
            <p className="text-xs mt-1 text-red-500">{error}</p>
          </div>
        )}

        {/* ══ SUB-VIEWS RENDERING ══ */}
        {!loading && !error && (
          <div className="space-y-6">
            {subTab === "groups" ? (
              /* GROUP STANDINGS INFOGRAPHIC VIEW */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {groups.map((groupLetter) => (
                  <GroupTable key={groupLetter} groupLetter={groupLetter} />
                ))}
              </div>
            ) : (
              /* INTERACTIVE BRACKETS & FIXTURES VIEW */
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2.5 select-none">
                  {(Object.keys(STAGE_LABELS) as StageType[]).map((stage) => {
                    const isActive = activeStage === stage;
                    const color = STAGE_COLORS[stage];
                    const stageOverrides = matches.filter((m) => m.stage === stage && m.isOverridden).length;

                    return (
                      <button
                        key={stage}
                        onClick={() => setActiveStage(stage)}
                        className={`px-4 py-2 text-[10px] font-black tracking-wider uppercase border-2 transition-all duration-150 relative cursor-pointer ${
                          isActive
                            ? "bg-zinc-800 text-white"
                            : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                        }`}
                        style={{
                          borderColor: isActive ? color : "transparent",
                          boxShadow: isActive ? `3px 3px 0px ${color}` : "none",
                          borderRadius: "0",
                        }}
                      >
                        <span className="flex items-center space-x-1.5">
                          <span>{STAGE_LABELS[stage]}</span>
                          {stageOverrides > 0 && (
                            <span className="bg-[#FF2D78] text-white text-[8px] px-1 py-0.2 font-mono font-extrabold rounded-sm shadow-[1px_1px_0_#000]">
                              {stageOverrides}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {filteredMatches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredMatches.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-zinc-900/40 border-2 border-zinc-800 shadow-[4px_4px_0_rgba(0,0,0,0.2)] flex flex-col items-center justify-center space-y-4">
                    <span className="text-3xl">⏳</span>
                    <h4 className="font-black text-xs tracking-wider uppercase text-zinc-400">
                      Eşleşmeler Belirlenmedi
                    </h4>
                    <p className="text-[10px] text-zinc-600 max-w-[40ch] leading-relaxed">
                      Bu turdaki eşleşmeler, bir önceki turdaki simülasyon sonuçlarına göre otomatik belirlenmektedir. Grup turlarını veya önceki eleme turlarını tamamladığınızda eşleşmeler buraya yansıyacaktır.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
