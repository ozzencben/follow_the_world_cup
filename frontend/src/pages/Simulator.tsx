import { useState } from "react";
import MainLayout from "../components/MainLayout";
import GroupTable from "../components/GroupTable";
import MatchCard from "../components/MatchCard";
import { useTournamentStore } from "../services/useTournamentStore";
import { calculateCSR } from "../services/TournamentEngine";

type SubTabType = "groups" | "matches" | "analytics";
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
  const { teams, matches, resetAllMatches, reRollSeed, seed, loading, error } = useTournamentStore();

  const handleSubTabChange = (id: string) => {
    if (id === "groups" || id === "matches" || id === "analytics") {
      setSubTab(id as SubTabType);
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
            {subTab === "groups" && (
              /* GROUP STANDINGS INFOGRAPHIC VIEW */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {groups.map((groupLetter) => (
                  <GroupTable key={groupLetter} groupLetter={groupLetter} />
                ))}
              </div>
            )}

            {subTab === "matches" && (
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

            {subTab === "analytics" && (
              /* DYNAMIC TEAM PROFILES & ANALYTICS VIEW */
              <TeamAnalyticsPanel teams={teams} />
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

interface TeamAnalyticsPanelProps {
  teams: any[];
}

function TeamAnalyticsPanel({ teams }: TeamAnalyticsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  // Dynamically calculate ELO profile categories
  const mappedTeams = teams.map((team) => {
    const csr = Math.round(calculateCSR(team, "GROUP"));
    const rating = team.rating;
    const avgRating = team.avgRating || rating;
    const matchesTotal = team.matchesTotal || 0;
    const appearances = team.appearances || 0;
    const championships = team.championships || 0;
    const squadValue = team.squadValue || 0;
    const averageAge = team.averageAge || 27;

    let label: "GİZLİ POTANSİYEL" | "YÜKSELEN YILDIZ" | "TARİHİ EFSANE" | "GERİLEYEN DEV" | "MÜTEVAZI GÜÇ" = "MÜTEVAZI GÜÇ";
    let explanation = "";
    let color = "#A78BFA"; // purple/violet default

    if (matchesTotal >= 800 && (championships > 0 || appearances >= 15)) {
      label = "TARİHİ EFSANE";
      color = "#A78BFA"; // violet
      explanation = `${championships > 0 ? championships + ' Şampiyonluk ve ' : ''}${appearances} katılımı ile turnuva DNA'sı en yüksek elit devlerden biridir.`;
    } else if (rating < 1900 && squadValue > 300 && championships === 0) {
      label = "GİZLİ POTANSİYEL";
      color = "#00E5FF"; // siber mavi
      explanation = `${squadValue}M € kadro değeri ve ${averageAge} yaş ortalamasıyla gizli bir devdir. Kupayı devirme potansiyeli çok yüksektir.`;
    } else if (rating - avgRating >= 100) {
      label = "YÜKSELEN YILDIZ";
      color = "#00FF87"; // neon yeşil
      explanation = `Tarihsel ELO ortalaması ${avgRating} iken, güncel ELO puanı ${rating} seviyesine fırlamıştır (+${rating - avgRating} ELO artışı).`;
    } else if (rating - avgRating < -20 && squadValue < 250) {
      label = "GERİLEYEN DEV";
      color = "#FF2D78"; // siber pembe
      explanation = `Geçmiş gücünün gerisinde kalmış, form grafiği ve kadro değeri (${squadValue}M €) eriyen tehlike sınırındaki takım.`;
    } else {
      label = "MÜTEVAZI GÜÇ";
      color = "#FFE600"; // siber sarı
      explanation = `${rating} ELO puanıyla her an sürpriz yapabilecek, turnuvanın dengelerini elinde tutan tehlikeli bir karanlık at (dark horse).`;
    }

    return {
      ...team,
      csr,
      label,
      color,
      explanation,
      avgRating,
      matchesTotal,
    };
  });

  // Calculate HUD counters
  const wonderkidsCount = teams.filter((t) => t.averageAge < 27 && t.squadValue > 300).length;
  const potentialCount = mappedTeams.filter((t) => t.label === "GİZLİ POTANSİYEL").length;
  const legendCount = mappedTeams.filter((t) => t.label === "TARİHİ EFSANE").length;

  const filteredTeams = mappedTeams.filter((team) => {
    const matchesSearch =
      team.nameTr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.code.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeCategory === "ALL") return matchesSearch;
    return team.label === activeCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* ══ ANALYTICS HUD METRICS ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border-[3px] border-black p-5 relative overflow-hidden shadow-[4px_4px_0_#FFE600]">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">ALTIN JENERASYON (YAŞ &lt; 27)</span>
          <span className="text-3xl font-black text-[#FFE600] font-mono block">{wonderkidsCount} ÜLKE</span>
          <p className="text-[9px] text-zinc-400 mt-2 leading-relaxed">Kadro değeri 300M € üstü ve yaş ortalaması 27'den küçük wonderkid kadrolar.</p>
        </div>

        <div className="bg-zinc-900 border-[3px] border-black p-5 relative overflow-hidden shadow-[4px_4px_0_#00E5FF]">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">GİZLİ POTANSİYELLER (DARK HORSE)</span>
          <span className="text-3xl font-black text-[#00E5FF] font-mono block">{potentialCount} ÜLKE</span>
          <p className="text-[9px] text-zinc-400 mt-2 leading-relaxed">Kadro kalitesi çok yüksek olmasına rağmen kupa tecrübesi olmayan gizli dinamolar.</p>
        </div>

        <div className="bg-zinc-900 border-[3px] border-black p-5 relative overflow-hidden shadow-[4px_4px_0_#A78BFA]">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">TARİHİ EFSANELER (LEGENDS)</span>
          <span className="text-3xl font-black text-[#A78BFA] font-mono block">{legendCount} ÜLKE</span>
          <p className="text-[9px] text-zinc-400 mt-2 leading-relaxed">Tarihinde en çok maç yapmış, kupa pedigrisi ve turnuva DNA'sı yüksek elite devler.</p>
        </div>
      </div>

      {/* ══ SEARCH & FILTER BAR ══ */}
      <div className="bg-zinc-900 border-[3px] border-black p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-[4px_4px_0_#00FF87]">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Takım ara (Örn: Türkiye, Fas)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border-[2px] border-black p-2.5 text-xs text-white placeholder-zinc-500 tracking-wide font-medium rounded-none focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87]"
            style={{ borderRadius: "0px" }}
          />
          <div className="absolute right-3 top-3.5 w-4 h-4 text-zinc-500 pointer-events-none">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 select-none w-full md:w-auto">
          {[
            { id: "ALL", label: "TÜMÜ" },
            { id: "TARİHİ EFSANE", label: "EFSANELER" },
            { id: "GİZLİ POTANSİYEL", label: "POTANSİYELLER" },
            { id: "YÜKSELEN YILDIZ", label: "YÜKSELEN YILDIZLAR" },
            { id: "GERİLEYEN DEV", label: "GERİLEYEN DEVLER" },
            { id: "MÜTEVAZI GÜÇ", label: "MÜTEVAZI GÜÇLER" },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase border-[2px] border-black tracking-wider transition-all duration-100 cursor-pointer ${
                  isActive
                    ? "bg-[#00FF87] text-black shadow-[2px_2px_0px_#FFF]"
                    : "bg-black/40 text-zinc-400 hover:text-white"
                }`}
                style={{ borderRadius: "0px" }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ TEAMS LIST GRID ══ */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredTeams.map((team) => (
            <div
              key={team.code}
              className="bg-zinc-900 border-[3px] border-black p-5 relative overflow-hidden flex flex-col justify-between shadow-[5px_5px_0_rgba(0,0,0,0.35)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[7px_7px_0_#00FF87] transition-all duration-150"
            >
              {/* Top Row: Title, Flag, Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 border-2 border-black flex items-center justify-center overflow-hidden shrink-0 shadow-[2px_2px_0_#000]">
                    <img
                      src={`https://api.fifa.com/api/v3/picture/flags-sq-1/${team.code.toUpperCase()}`}
                      alt={team.nameEn}
                      className="w-full h-full object-cover scale-110"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/40x40/222/00FF87?text=${team.code.toUpperCase()}`;
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white tracking-tight flex items-center gap-2">
                      <span>{team.nameTr}</span>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">{team.code}</span>
                    </h3>
                    <p className="text-[9px] text-[#00E5FF] font-mono tracking-widest">{team.confederationId} KONFEDERASYONU</p>
                  </div>
                </div>

                <span
                  className="px-2 py-1 text-[8px] font-black uppercase tracking-wider border-2 border-black"
                  style={{
                    backgroundColor: team.color,
                    color: "#000",
                    boxShadow: "2px 2px 0px #000",
                  }}
                >
                  {team.label}
                </span>
              </div>

              {/* Technical Description */}
              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed my-4 bg-black/40 border border-zinc-800/80 p-3">
                {team.explanation}
              </p>

              {/* Stats Metrics Row */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-800/80 text-[10px] font-mono">
                <div className="flex flex-col">
                  <span className="text-[7px] text-zinc-500 font-bold uppercase leading-none mb-1">GÜNCEL ELO</span>
                  <span className="text-white font-extrabold text-xs flex items-center gap-1">
                    <span>{team.rating}</span>
                    {parseInt(team.oneYearRatingChange) > 0 ? (
                      <span className="text-[#00FF87] text-[8px]">▲</span>
                    ) : parseInt(team.oneYearRatingChange) < 0 ? (
                      <span className="text-[#FF2D78] text-[8px]">▼</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-zinc-500 font-bold uppercase leading-none mb-1">KADRO DEĞERİ</span>
                  <span className="text-white font-extrabold text-xs">{team.squadValue}M €</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-zinc-500 font-bold uppercase leading-none mb-1">YAŞ ORT.</span>
                  <span className="text-white font-extrabold text-xs">{team.averageAge} yaş</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-zinc-500 font-bold uppercase leading-none mb-1">C.S.R GÜCÜ</span>
                  <span className="text-[#00E5FF] font-black text-xs">{team.csr}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-zinc-900 border-2 border-zinc-800 shadow-[4px_4px_0_rgba(0,0,0,0.2)] flex flex-col items-center justify-center space-y-4">
          <span className="text-3xl">📭</span>
          <h4 className="font-black text-xs tracking-wider uppercase text-zinc-400">Aramanıza Uygun Takım Bulunamadı</h4>
          <p className="text-[10px] text-zinc-600 max-w-[30ch]">Farklı bir arama terimi girerek veya kategori filtrelerini değiştirerek tekrar deneyebilirsiniz.</p>
        </div>
      )}
    </div>
  );
}
