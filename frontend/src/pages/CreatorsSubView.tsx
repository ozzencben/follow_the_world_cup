import { useEffect } from "react";
import { useTournamentStore } from "../services/useTournamentStore";
import type { Creator } from "../services/useTournamentStore";

// ── CREATOR CARD ─────────────────────────────────────────────────
function CreatorCard({
  creator,
  rank,
  onView,
}: {
  creator: Creator;
  rank: number;
  onView: (bracketString: string, name: string) => void;
}) {
  const hasPrediction =
    creator.bracketString !== null && creator.bracketString.trim() !== "";
  const overrideCount = hasPrediction
    ? creator.bracketString!.split("|").length
    : 0;

  const initials = creator.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="relative bg-zinc-900 border-2 border-zinc-700 overflow-hidden"
      style={{
        boxShadow: hasPrediction ? "5px 5px 0px #00FF87" : "5px 5px 0px #3f3f46",
      }}
    >
      {/* Accent strip */}
      <div className="h-1 w-full" style={{ background: hasPrediction ? "#00FF87" : "#3f3f46" }} />

      <div className="p-5 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div
            className="text-3xl font-black leading-none shrink-0 tabular-nums"
            style={{ color: hasPrediction ? "#00FF87" : "#52525b" }}
          >
            {String(rank).padStart(2, "0")}
          </div>

          {/* Avatar monogram */}
          <div
            className="w-12 h-12 flex items-center justify-center font-black text-lg border-2 border-black shrink-0"
            style={{
              background: hasPrediction ? "#00FF87" : "#3f3f46",
              color: hasPrediction ? "#000" : "#71717a",
              boxShadow: "3px 3px 0px #000",
            }}
          >
            {initials}
          </div>

          {/* Name & ID */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-base font-black tracking-tight text-white leading-tight truncate">
              {creator.name}
            </span>
            <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase mt-0.5">
              #{creator.id}
            </span>
          </div>

          {/* Verified badge */}
          <div
            className="shrink-0 text-[8px] font-black tracking-widest px-2 py-1 border"
            style={{ background: "#00FF8712", color: "#00FF87", borderColor: "#00FF8740" }}
          >
            ✓ VERİFİED
          </div>
        </div>

        <div className="border-t-2 border-dashed border-zinc-800" />

        {/* Status & CTA */}
        {hasPrediction ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col">
              <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "#00FF87" }}>
                ● TAHMİN YAYINDA
              </span>
              <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                <span className="text-white font-black">{overrideCount}</span> maç override
              </span>
            </div>

            <button
              onClick={() => onView(creator.bracketString!, creator.name)}
              className="flex items-center gap-2 px-5 py-2.5 font-black text-xs tracking-widest text-black border-2 border-black uppercase"
              style={{ background: "#00FF87", boxShadow: "4px 4px 0px #000" }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.boxShadow = "1px 1px 0px #000";
                b.style.transform = "translate(3px,3px)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.boxShadow = "4px 4px 0px #000";
                b.style.transform = "translate(0,0)";
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              TAHMİNİ İNCELE
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col">
              <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "#00E5FF" }}>
                ⏳ TAHMİN BEKLENİYOR
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">Henüz yayınlanmadı</span>
            </div>
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2.5 font-black text-xs tracking-widest border-2 border-zinc-700 text-zinc-600 cursor-not-allowed uppercase"
              style={{ background: "#18181b", boxShadow: "4px 4px 0px #27272a" }}
            >
              ⏳ BEKLEMEDE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN SUB-VIEW ─────────────────────────────────────────────────
interface CreatorsSubViewProps {
  /** Called after loading a creator's bracket — navigates to groups tab in Simulator */
  onViewCreator: () => void;
}

export default function CreatorsSubView({ onViewCreator }: CreatorsSubViewProps) {
  const { creatorsList, fetchCreators, viewCreatorPrediction, viewingCreatorName } =
    useTournamentStore();

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  const handleView = async (bracketString: string, name: string) => {
    await viewCreatorPrediction(bracketString, name);
    onViewCreator(); // switch Simulator to "groups" tab to show the loaded bracket
  };

  const publishedCount = creatorsList.filter(
    (c) => c.bracketString !== null && c.bracketString.trim() !== ""
  ).length;
  const pendingCount = creatorsList.length - publishedCount;

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">

      {/* ── HERO HEADER ─────────────────────────────────────────── */}
      <div className="relative">
        <div
          className="absolute -top-4 left-0 text-[80px] md:text-[110px] font-black leading-none select-none pointer-events-none opacity-[0.03] tracking-tighter"
          style={{ color: "#00FF87" }}
        >
          EXPERTS
        </div>
        <div className="relative space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-px w-10 shrink-0" style={{ background: "#00FF87" }} />
            <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: "#00FF87" }}>
              VERİFİED CREATORS PLATFORM
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-black tracking-tight leading-none text-white uppercase"
            style={{ letterSpacing: "-0.03em" }}
          >
            ONAYLI{" "}
            <span style={{ color: "#00FF87" }}>YORUMCULAR</span>
          </h2>
          <p className="text-zinc-400 text-sm font-mono max-w-xl leading-relaxed">
            Uzman analistlerin Dünya Kupası 2026 tahminlerini incele.{" "}
            <span className="text-white font-bold">One-Shot Lock</span> sistemi
            ile her yorumcunun yalnızca tek yayınlama hakkı vardır.
          </p>
        </div>
      </div>

      {/* ── KPI STRIP ───────────────────────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-0 border-2 border-zinc-800 overflow-hidden"
        style={{ boxShadow: "5px 5px 0px #27272a" }}
      >
        {[
          { label: "TOPLAM YORUMCU", value: creatorsList.length, color: "#ffffff" },
          { label: "TAHMİN YAYINDA", value: publishedCount, color: "#00FF87" },
          { label: "BEKLEYEN", value: pendingCount, color: "#00E5FF" },
        ].map(({ label, value, color }, i) => (
          <div key={label} className={`bg-black p-5 text-center ${i < 2 ? "border-r-2 border-zinc-800" : ""}`}>
            <div className="text-4xl md:text-5xl font-black tabular-nums leading-none" style={{ color }}>
              {value}
            </div>
            <div className="text-[8px] font-mono text-zinc-500 tracking-[0.2em] uppercase mt-2">{label}</div>
          </div>
        ))}
      </div>

      {/* ── SECTION DIVIDER ─────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <span className="text-[9px] font-black text-zinc-500 tracking-[0.25em] uppercase">LİDERLİK TABLOSU</span>
        <div className="flex-1 border-t-2 border-dashed border-zinc-800" />
        <span className="text-[8px] font-mono px-2 py-0.5" style={{ background: "#00FF8720", color: "#00FF87" }}>
          {publishedCount} / {creatorsList.length} YAYINDA
        </span>
      </div>

      {/* ── CREATORS LIST ───────────────────────────────────────── */}
      {creatorsList.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-5">
          <div
            className="w-10 h-10 border-[3px] animate-spin"
            style={{ borderColor: "#00FF87", borderTopColor: "transparent" }}
          />
          <span className="text-zinc-500 text-xs font-mono tracking-widest uppercase">
            Yorumcular yükleniyor...
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {creatorsList.map((creator, index) => (
            <CreatorCard key={creator.id} creator={creator} rank={index + 1} onView={handleView} />
          ))}
        </div>
      )}

      {/* ── VIEWING BANNER ──────────────────────────────────────── */}
      {viewingCreatorName && (
        <div
          className="flex items-center gap-3 px-5 py-3 border-2 border-[#00E5FF]"
          style={{ background: "#00E5FF10", boxShadow: "4px 4px 0px #00E5FF40" }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: "#00E5FF" }} />
          <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
            Son yüklenen tahmin:{" "}
            <span className="text-[#00E5FF] font-black">{viewingCreatorName}</span>
            {" "} — GRUP TABLOLARI sekmesine geçerek inceleyebilirsiniz.
          </span>
        </div>
      )}

      {/* ── ONE-SHOT FOOTER ─────────────────────────────────────── */}
      <div className="border-t-2 border-zinc-800 pt-4 flex items-center gap-2 text-[9px] font-mono text-zinc-600 tracking-widest">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#00FF87" }} />
        ONE-SHOT LOCK SİSTEMİ AKTİF — Her yorumcunun yalnızca{" "}
        <span className="text-white font-bold">tek bir</span> yayınlama hakkı vardır.
      </div>
    </div>
  );
}
