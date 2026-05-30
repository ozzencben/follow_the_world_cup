import { useState } from "react";
import MainLayout from "../components/MainLayout";
import GroupTable from "../components/GroupTable";
import MatchCard from "../components/MatchCard";
import { useTournamentStore } from "../services/useTournamentStore";
import { calculateCSR } from "../services/TournamentEngine";

type SubTabType = "groups" | "matches" | "analytics" | "guide";
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
  const [copied, setCopied] = useState(false);
  const {
    teams,
    matches,
    resetAllMatches,
    reRollSeed,
    seed,
    loading,
    error,
    isReadOnly,
    generateShareableLink,
    cloneBracket,
  } = useTournamentStore();

  const handleShare = () => {
    const link = generateShareableLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubTabChange = (id: string) => {
    if (id === "groups" || id === "matches" || id === "analytics" || id === "guide") {
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
        {/* ══ READ ONLY VIEWER MODE BANNER ══ */}
        {isReadOnly && (
          <div className="bg-black border-[3px] border-[#FF2D78] p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0_#FF2D78] animate-pulse">
            <div className="flex items-center space-x-3.5">
              <span className="text-2xl animate-bounce">👁️</span>
              <div>
                <h3 className="text-sm font-mono font-black text-[#FF2D78] uppercase tracking-wider">
                  İZLEYİCİ MODU (SALT OKUNUR)
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">
                  Şu an başka bir kullanıcının paylaştığı turnuva tahmin ağacını inceliyorsunuz. Skor değişiklikleri kilitlenmiştir.
                </p>
              </div>
            </div>
            <button
              onClick={cloneBracket}
              className="swiss-btn-primary bg-[#00FF87] hover:bg-[#00D06E] text-zinc-950 border-black shadow-[3px_3px_0px_#FFF] uppercase text-[10px] tracking-widest font-black shrink-0 px-4 py-2 cursor-pointer"
            >
              🎮 Kendi Tahminini Yap (Klonla)
            </button>
          </div>
        )}

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
              {!isReadOnly && (
                <>
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

                  <button
                    onClick={handleShare}
                    className="swiss-btn-primary bg-[#00FF87] hover:bg-[#00D06E] text-zinc-950 border-black shadow-[3px_3px_0px_#FFE600] uppercase text-[10px] tracking-widest font-black flex items-center gap-1.5"
                    title="Mevcut tahmin ağacınızı arkadaşlarınızla paylaşmak için kopyalanabilir bir link oluşturur."
                  >
                    <span>🔗</span>
                    <span>{copied ? "KOPYALANDI!" : "TAHMİNİ PAYLAŞ"}</span>
                  </button>
                </>
              )}

              {isReadOnly && (
                <button
                  onClick={cloneBracket}
                  className="swiss-btn-primary bg-[#00FF87] hover:bg-[#00D06E] text-zinc-950 border-black shadow-[3px_3px_0px_#FFF] uppercase text-[10px] tracking-widest font-black"
                >
                  🎮 BU TAHMİNİ KLONLA
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

            {subTab === "guide" && (
              /* HOW IT WORKS / DOCUMENTATION VIEW */
              <SimulationGuidePanel />
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

function SimulationGuidePanel() {
  const [activeGuideTab, setActiveGuideTab] = useState<"logic" | "rules" | "data" | "usage">("logic");

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ══ GUIDE SUB-NAVIGATOR ══ */}
      <div className="bg-zinc-900 border-[3px] border-black p-4 flex flex-wrap gap-2.5 shadow-[4px_4px_0_#FFE600] select-none">
        {[
          { id: "logic", label: "SİMÜLASYON MANTIĞI", color: "#00FF87" },
          { id: "rules", label: "HİPER-REALİZM KURALLARI", color: "#00E5FF" },
          { id: "data", label: "VERİ GÜVENİLİRLİĞİ & KAYNAKLAR", color: "#A78BFA" },
          { id: "usage", label: "NASIL KULLANILIR?", color: "#FFE600" },
        ].map((tab) => {
          const isActive = activeGuideTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveGuideTab(tab.id as any)}
              className={`px-4 py-2.5 text-[10px] font-black uppercase border-[2px] border-black tracking-wider transition-all duration-100 cursor-pointer ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "bg-black/40 text-zinc-500 hover:text-zinc-300"
              }`}
              style={{
                borderColor: isActive ? tab.color : "black",
                boxShadow: isActive ? `3px 3px 0px ${tab.color}` : "none",
                borderRadius: "0px",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══ CONTENT AREA ══ */}
      <div className="bg-zinc-900 border-[3px] border-black p-6 md:p-8 relative overflow-hidden shadow-[6px_6px_0_rgba(0,0,0,0.35)]">
        <div className="absolute right-4 top-4 font-mono text-[9px] text-zinc-700 tracking-widest pointer-events-none uppercase">
          SEC // {activeGuideTab.toUpperCase()} // INTEGRITY OK
        </div>

        {/* ── TAB 1: SIMULATION LOGIC ── */}
        {activeGuideTab === "logic" && (
          <div className="space-y-6">
            <div className="border-l-4 border-[#00FF87] pl-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                Cascade Tahmin Motorunun Çalışma Prensipleri
              </h2>
              <p className="text-[11px] text-[#00FF87] font-mono tracking-widest uppercase mt-0.5">
                MATEMATİKSEL "WHAT-IF" SENARYOLARI VE OLASILIK EĞRİLERİ
              </p>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              Bu simülatör, rastgele sayılar üreten basit bir şans makinesi değildir. Dünya Kupası'ndaki her eşleşme, takımların güncel form durumlarını, finansal kadro derinliklerini ve turnuva genetiğini birleştiren bilimsel bir modelleme üzerinden hesaplanır.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3">
                <span className="text-xs font-black text-[#00FF87] block uppercase font-mono tracking-wider">
                  1. Kompozit Güç Puanı (CSR) Nedir?
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Her ülkenin gücünü temsil eden <b>Composite Strength Rating (CSR)</b> puanı hesaplanırken sadece ELO puanına bakılmaz. ELO puanı (Grup aşamasında %55 etki), Transfermarkt kadro değerinin logaritmik ölçeği (%20), ülkenin Dünya Kupası'na katılım ve şampiyonluk sayılarıyla belirlenen turnuva DNA'sı (%10), son 1 yıllık form trendi (%5) ve eğer ev sahibiyse moral avantajı (+100 moral puanı) dinamik olarak harmanlanır.
                </p>
              </div>

              <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3">
                <span className="text-xs font-black text-[#00E5FF] block uppercase font-mono tracking-wider">
                  2. Poisson Gol Beklentisi Dağılımı
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  İki takım karşılaştığında, aralarındaki CSR puan farkı analiz edilerek her bir takım için <b>Lambda (&lambda;)</b> adı verilen gol beklenti değeri üretilir. Bu gol beklentisi, olasılık teorisindeki Poisson Dağılım formülüne sokulur. Poisson modeli, bir takımın o maçta tam olarak 0, 1, 2, 3 vb. gol atma ihtimalini yüzde bazında hesaplayarak maçı simüle eder.
                </p>
              </div>

              <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3">
                <span className="text-xs font-black text-[#FFE600] block uppercase font-mono tracking-wider">
                  3. Seeded Poisson (Mulberry32) & Knuth Algoritması
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Poisson dağılımından rastgele skorlar çekilirken, tarayıcı hafızasını yormayan ve her yeniden çalıştırmada aynı tohum (seed) değeriyle aynı sonuçları veren <b>Mulberry32 PRNG (Sözde Rastgele Sayı Üreticisi)</b> kullanılır. Knuth Algoritması sayesinde gol beklentileri gerçeğe en yakın şekilde dağıtılır ve uçuk skorlar (örn: 14-0) sınırlandırılarak oyun zevki artırılır.
                </p>
              </div>

              <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3">
                <span className="text-xs font-black text-[#A78BFA] block uppercase font-mono tracking-wider">
                  4. Dinamik Eleme Cascade (Dalgalanma) Zinciri
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Grup aşamasındaki 104 maçın tamamı ve en iyi 3.lük tie-breaker kuralları tek bir düğüm (node) olarak birbirine bağlıdır. Siz herhangi bir maçın sonucuna manuel müdahale ettiğinizde, bu değişiklik tüm turnuva ağacına (Son 32, Son 16, Çeyrek Final...) anında dalgalanma efektiyle yansır. Üst turlardaki eşleşen takımlar otomatik güncellenir ve geçersiz kalan eski kullanıcı tahminleri sıfırlanarak veri bütünlüğü korunur.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: HYPER-REALISM RULES ── */}
        {activeGuideTab === "rules" && (
          <div className="space-y-6">
            <div className="border-l-4 border-[#00E5FF] pl-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                Hiper-Realizm & Anti-Kaos Kuralları
              </h2>
              <p className="text-[11px] text-[#00E5FF] font-mono tracking-widest uppercase mt-0.5">
                KAOTİK SÜRPRİZLERİ ENGELLEYEN YÜKSEK GERÇEKÇİLİK FİLTRELERİ
              </p>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              Geleneksel Poisson simülasyonlarında "Bileşik Varyans (Compounding Variance)" sorunu nedeniyle favori takımlar çok kolay elenir ve turnuva sonuna doğru absürt finaller (Örn: Haiti - İskoçya) oluşur. Tahmin motorumuzda bu sapmaları sıfırlayan <b>9 adet özel hiper-realizm kuralı</b> aktiftir:
            </p>

            <div className="space-y-4 pt-4">
              {[
                {
                  title: "Kupa Canavarı Bonusu (Knockout DNA Clutch)",
                  desc: "Brezilya, Almanya, İtalya gibi turnuva geçmişi zengin devlerin Turnuva DNA katsayısı grup aşamasında normal (x1.0) etki ederken, Son 32 ve Son 16'da x1.5 katına, Çeyrek Final ve sonrasında tam 2 katına (x2.0) çıkar. Devlerin kupa turlarında vites büyütmesi matematiksel olarak modellenmiştir.",
                  badge: "AKTİF",
                  color: "#00FF87",
                },
                {
                  title: "Altın Wonderkid Jenerasyonu (Golden Generation)",
                  desc: "Kadro yaş ortalaması genç (< 27) ve Transfermarkt değeri yüksek (> 300M €) olan parlak jenerasyonlara (Örn: Türkiye, Fas) gol beklentilerinde (Lambda) %10 oranında pozitif bonus yansıtılır. Bu sayede sürpriz yapma şansları artar.",
                  badge: "AKTİF",
                  color: "#FFE600",
                },
                {
                  title: "Dev Katili Motivasyonu (Giant Killer)",
                  desc: "CSR farkı 250'den büyük olan aşırı dengesiz Davut vs Golyat eşleşmelerinde, zayıf takımın son 1 yıllık form trendi pozitifse sahaya ekstra +50 moral motivasyon gücüyle çıkması sağlanır. Bu, inandırıcı ve gerilimli sürprizlerin kapısını aralar.",
                  badge: "AKTİF",
                  color: "#00E5FF",
                },
                {
                  title: "Büyük Maç Baskısı & Stres Kontrolü (Variance Dampening)",
                  desc: "Turnuvanın sonlarına doğru (Çeyrek Final, Yarı Final ve Final) takımlar daha defansif oynar, hata yapmaktan kaçınır. Bu stresi yansıtmak adına Poisson öncesinde her iki takımın da gol beklentisi (Lambda) %25 oranında düşürülür. Maçlar gerçekçi bir şekilde 0-0 veya 1-0 gibi kilitlenmeye meyilli hale gelir.",
                  badge: "AKTİF",
                  color: "#FF2D78",
                },
                {
                  title: "Efsanelerin Zırhı (Elite Plot Armor)",
                  desc: "Eleme turlarında ELO'su >= 2000 olan elit bir dünya devi, kendisinden 200 CSR daha zayıf bir rakiple oynarsa zayıf takımın gol şansı ekstra %20 düşürülür. Büyük turnuvalarda devlerin basit hatalarla hezimete uğraması bu plot armor zırhıyla engellenir.",
                  badge: "AKTİF",
                  color: "#A78BFA",
                },
                {
                  title: "Sahne Korkusu Cezası (Stage Fright Penalty)",
                  desc: "Eğer bir takımın baz ELO'su 1650'den düşük, rakibinin ELO'su ise 1950'den büyükse; zayıf takımın gol beklentisi (Lambda) acımasızca %50 oranında tırpanlanır. Dev sahneye çıkan zayıf ekiplerin tecrübesizliği bu nerf kuralıyla simüle edilir.",
                  badge: "AKTİF",
                  color: "#FF2D78",
                },
                {
                  title: "Şişirilmiş İstatistik Filtresi (Fake Stats Normalization)",
                  desc: "Düşük profilli takımların kendi zayıf kıtalarında (örn: Okyanusya veya Karayipler) elde ettikleri fahiş gol ortalamaları, dev rakiplere karşı Poisson'a sokulurken sınırlandırılır. CSR farkı 300'den büyükse, zayıf takımın bölgesel gol ortalaması maksimum 1.1 olarak normalize edilir.",
                  badge: "AKTİF",
                  color: "#FFE600",
                },
                {
                  title: "Kesin Gol Sınırı (Ultimate Score Cap)",
                  desc: "CSR farkının 350'yi aştığı aşırı dengesiz güç eşleşmelerinde, zayıf takımın atabileceği maksimum gol sayısı Poisson'dan ne sonuç çıkarsa çıksın zorla 1 gol ile sınırlandırılır. Düşük ihtimalli bir sürpriz olsa bile bunun en fazla 1-0 olması garanti altına alınır.",
                  badge: "AKTİF",
                  color: "#00E5FF",
                },
                {
                  title: "Ev Sahibi Sınırı (Host Cap)",
                  desc: "Ev sahiplerine (ABD, Meksika, Kanada) verilen +100 moral puanı korunur. Ancak ev sahibi elit ELO seviyesine (1950 ELO) sahip değilse, moralsel CSR puanı maksimum 1950 ile sınırlandırılarak turnuvayı haksızca ve gerçek dışı şekilde domine etmeleri engellenir.",
                  badge: "AKTİF",
                  color: "#00FF87",
                },
              ].map((rule, idx) => (
                <div key={idx} className="bg-black/40 border border-zinc-800/60 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-[12px] font-black text-white tracking-wide flex items-center gap-2">
                      <span className="text-[#00E5FF] font-mono">[{idx + 1}]</span>
                      <span>{rule.title}</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[85ch]">
                      {rule.desc}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 text-[8px] font-mono font-black border border-black self-start"
                    style={{ backgroundColor: rule.color, color: "#000", boxShadow: "1.5px 1.5px 0px #000" }}
                  >
                    {rule.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: DATA RELIABILITY ── */}
        {activeGuideTab === "data" && (
          <div className="space-y-6">
            <div className="border-l-4 border-[#A78BFA] pl-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                Veri Doğruluğu & Kaynaklar
              </h2>
              <p className="text-[11px] text-[#A78BFA] font-mono tracking-widest uppercase mt-0.5">
                GERÇEK DÜNYA VERİLERİNDEN MODELLEME ALTYAPISI
              </p>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              FollowTheWorldCup.com tahmin motoru, hayali veriler üzerine kurulmamıştır. Simülasyonun arka planında yer alan tüm veriler, küresel olarak kabul görmüş futbol veritabanlarından çekilmiş, temizlenmiş ve normalize edilmiştir:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3 relative">
                <div className="w-8 h-8 rounded-full bg-[#A78BFA]/10 flex items-center justify-center text-[#A78BFA] font-mono text-xs font-bold border border-[#A78BFA]/30 mb-2">
                  01
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Historical Elo Ratings</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Ülkelerin güncel güç seviyeleri ve 1 yıllık ELO puan değişim eğrileri, futbol dünyasının en güvenilir derecelendirme sistemi olan <b>eloratings.net</b> veritabanı temel alınarak sisteme entegre edilmiştir. Bu sayede takımların form grafiği en güncel haliyle yansıtılır.
                </p>
              </div>

              <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3 relative">
                <div className="w-8 h-8 rounded-full bg-[#00FF87]/10 flex items-center justify-center text-[#00FF87] font-mono text-xs font-bold border border-[#00FF87]/30 mb-2">
                  02
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Transfermarkt Değerleri</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Takımların kadro derinliği, oyuncu kalitesi ve finansal gücünü yansıtan kadro piyasa değerleri <b>Transfermarkt</b> verilerinden çekilmiştir. Bu değerler motor içerisinde logaritmik olarak dengelenerek zengin ve fakir ülkeler arasındaki uçurum gerçekçi şekilde dengelenmiştir.
                </p>
              </div>

              <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3 relative">
                <div className="w-8 h-8 rounded-full bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF] font-mono text-xs font-bold border border-[#00E5FF]/30 mb-2">
                  03
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Resmi FIFA 2026 Formatı</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Turnuva yapısı, <b>FIFA 2026 Dünya Kupası</b> resmi formatına (48 takım, 12 grup, en iyi 8 grup üçüncüsünün eleme turlarına kalması, aşamalı eleme ağacı eşleşmeleri) birebir sadık kalınarak kodlanmıştır. Tie-break kuralları da resmi kurallarla aynıdır.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: HOW TO USE ── */}
        {activeGuideTab === "usage" && (
          <div className="space-y-6">
            <div className="border-l-4 border-[#FFE600] pl-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                Simülasyon Nasıl Kullanılır?
              </h2>
              <p className="text-[11px] text-[#FFE600] font-mono tracking-widest uppercase mt-0.5">
                İNTERAKTİF WHAT-IF ANALİZLERİ YAPMA KILAVUZU
              </p>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              Tahmin kokpitini kullanmak ve kendi turnuva senaryolarınızı yaratmak son derece basittir. İşte adım adım izleyebileceğiniz yol haritası:
            </p>

            <div className="space-y-6 pt-4 font-sans text-xs">
              <div className="flex items-start gap-4">
                <div className="w-7 h-7 bg-[#FFE600] text-zinc-950 font-black flex items-center justify-center shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-white text-[13px]">Puan Durumunu İnceleyin</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    <b>"GRUP TABLOLARI"</b> sekmesine giderek motorumuzun ELO ve CSR güçlerine göre otomatik simüle ettiği canlı puan durumlarını görebilirsiniz. Sol kenardaki neon yeşil barlar doğrudan çıkanları, siber mavi barlar ise en iyi üçüncülük adayı olan takımları simgeler.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-7 h-7 bg-[#00FF87] text-zinc-950 font-black flex items-center justify-center shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-white text-[13px]">Kendi Skorlarınızı Yazın (Interactive Override)</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    <b>"FİKSTÜR & ELEMELER"</b> sekmesine gidin. İstediğiniz herhangi bir maçın skor kutucuğuna (Örn: 2:1 yazan alana) tıklayın. Skorlar düzenlenebilir bir arayüze dönüşecektir. Kendi tahmininizi yazıp <b>"KAYDET"</b> butonuna basın.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-7 h-7 bg-[#00E5FF] text-zinc-950 font-black flex items-center justify-center shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-white text-[13px]">Cascade Etkisini Canlı İzleyin</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Kaydettiğiniz an, değiştirdiğiniz maçın bulunduğu grubun puan durumu anında yeniden hesaplanır. Eğer bu değişiklik üst tura çıkan takımı etkiliyorsa, o takımla ilgili sonraki tüm eleme eşleşmeleri ve eleme maçlarının sonuçları da milisaniyeler içinde dinamik olarak baştan simüle edilir.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-7 h-7 bg-[#A78BFA] text-white font-black flex items-center justify-center shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-white text-[13px]">Tohumu Yenileyin veya Sıfırlayın</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Olasılıkları karıştırıp farklı senaryolar görmek isterseniz üstteki <b>"🎲 TAHMİNİ YENİLE"</b> butonuna basabilirsiniz. Yaptığınız tüm manuel müdahaleleri silip tamamen yapay zeka/matematik motorunun varsayılan tahminlerine geri dönmek isterseniz <b>"🔄 SIFIRLA"</b> butonunu kullanabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
