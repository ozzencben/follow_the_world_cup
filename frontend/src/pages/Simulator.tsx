import { useState } from "react";
import { useTranslation } from "react-i18next";
import MainLayout from "../components/MainLayout";
import GroupTable from "../components/GroupTable";
import MatchCard from "../components/MatchCard";
import CreatorsSubView from "./CreatorsSubView";
import { useTournamentStore } from "../services/useTournamentStore";
import { calculateCSR } from "../services/TournamentEngine";

type SubTabType = "groups" | "matches" | "analytics" | "guide" | "creators";
type StageType = "GROUP" | "R32" | "R16" | "QF" | "SF" | "F";

// Sub-tabs that live INSIDE the Simulator page
const SIMULATOR_SUB_TABS: SubTabType[] = ["groups", "matches", "analytics", "guide", "creators"];

const STAGE_LABELS_TR: Record<StageType, string> = {
  GROUP: "GRUP AŞAMASI",
  R32: "SON 32 TURU",
  R16: "SON 16 TURU",
  QF: "ÇEYREK FİNAL",
  SF: "YARI FİNAL",
  F: "BÜYÜK FİNAL",
};

const STAGE_LABELS_EN: Record<StageType, string> = {
  GROUP: "GROUP STAGE",
  R32: "ROUND OF 32",
  R16: "ROUND OF 16",
  QF: "QUARTER FINALS",
  SF: "SEMI FINALS",
  F: "GRAND FINAL",
};

const STAGE_COLORS: Record<StageType, string> = {
  GROUP: "#00FF87",
  R32: "#00E5FF",
  R16: "#FFE600",
  QF: "#FF6B00",
  SF: "#FF2D78",
  F: "#A78BFA",
};

export default function Simulator({ onRouteChange }: { onRouteChange?: (route: string) => void }) {
  const { i18n } = useTranslation();
  const isTr = (i18n.language || "en").startsWith("tr");

  const [subTab, setSubTab] = useState<SubTabType>(() => {
    // Support direct navigation to #/creators
    const hash = window.location.hash.replace("#/", "").split("?")[0];
    if ((SIMULATOR_SUB_TABS as string[]).includes(hash)) return hash as SubTabType;
    return "groups";
  });
  const [activeStage, setActiveStage] = useState<StageType>("GROUP");
  const [copied, setCopied] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | null>(null);
  const token = (() => {
    const href = window.location.href;
    const match = href.match(/[?&]token=([^&#]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  })();

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
    isPublishing,
    publishError,
    publishCreatorBracket,
    viewingCreatorName,
  } = useTournamentStore();

  const STAGE_LABELS = isTr ? STAGE_LABELS_TR : STAGE_LABELS_EN;

  const handleShare = () => {
    const link = generateShareableLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubTabChange = (id: string) => {
    if (SIMULATOR_SUB_TABS.includes(id as SubTabType)) {
      // Internal simulator tab switch
      setSubTab(id as SubTabType);
    } else {
      // External site route — delegate to App.tsx router
      if (onRouteChange) {
        onRouteChange(id);
      } else {
        window.location.hash = `#/${id}`;
      }
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (m.stage !== activeStage) return false;
    if (activeStage === "GROUP") {
      if (selectedGroupFilter && m.id.split("-")[1].toUpperCase() !== selectedGroupFilter.toUpperCase()) {
        return false;
      }
      if (selectedRoundFilter && m.roundId !== selectedRoundFilter) {
        return false;
      }
    }
    return true;
  });
  const overriddenCount = matches.filter((m) => m.isOverridden).length;
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  return (
    <MainLayout currentRoute={subTab} onRouteChange={handleSubTabChange}>
      <div className="space-y-8 animate-fade-up text-white">
        {/* ══ VERIFIED CREATOR PUBLISHING PANEL ══ */}
        {token && !isReadOnly && (
          <div className="bg-zinc-900 border-[3px] border-[#FFE600] p-6 relative overflow-hidden shadow-[6px_6px_0_#FFE600] space-y-4 animate-fade-up">
            <div className="absolute top-0 right-0 bg-[#FFE600] text-black font-mono font-black text-[9px] px-3 py-1 uppercase tracking-widest">
              {isTr ? "Onaylı Yorumcu Konsolu" : "Verified Creator Console"}
            </div>
            
            <div className="border-l-4 border-[#FFE600] pl-4 space-y-1">
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>{isTr ? "🎙️ YORUMCU YAYINLAMA KONSOLU" : "🎙️ CREATOR PUBLISHING CONSOLE"}</span>
                <span className="w-2 h-2 bg-[#FFE600] rounded-full animate-pulse" />
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium max-w-[80ch]">
                {isTr
                  ? "Hoş geldiniz! Turnuva tahminlerinizi tamamladıktan sonra aşağıdaki butona basarak tahmin ağacınızı sunucuya kalıcı olarak gönderebilirsiniz. Önemli: Yorumcuların yalnızca TEK TAHMİN HAKKI vardır. Kaydettiğiniz an tahminleriniz kilitlenecek ve tokenınız geçersiz kılınacaktır!"
                  : "Welcome! Once you complete your tournament predictions, click the button below to submit your prediction tree permanently to the server. Important: Creators have only ONE PREDICTION RIGHT. The moment you save, your predictions will be locked and your token invalidated!"}
              </p>
            </div>

            {publishError && (
              <div className="p-3 bg-red-950/20 border border-red-900 text-[#FF2D78] text-[10px] font-mono font-bold uppercase tracking-wider">
                ⚠️ {isTr ? "HATA" : "ERROR"}: {publishError}
              </div>
            )}

            {/* Verbal Commentary Input Field */}
            <div className="flex flex-col space-y-2 max-w-[80ch] w-full">
              <label className="text-[9px] font-mono font-bold text-[#FFE600] uppercase tracking-wider">
                🎙️ {isTr ? "Sözlü Yorumunuz & Öngörünüz (Anasayfada Canlı Gösterilecektir)" : "Your Commentary & Predictions (Will display live on Homepage)"}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={200}
                placeholder={isTr ? "Örn: Brezilya kadro kalitesiyle kupayı kaldırır. Türkiye çeyrek finale kadar sürpriz yapabilir..." : "e.g., Brazil wins due to squad value. Turkey could pull off surprises up to QF..."}
                rows={3}
                className="w-full bg-zinc-950 border-2 border-zinc-800 text-zinc-100 text-xs font-mono p-3 focus:border-[#FFE600] focus:outline-none placeholder-zinc-700 transition-colors"
                style={{ borderRadius: "0px" }}
              />
              <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500 font-bold">
                <span>{isTr ? "* Maksimum 200 karakter." : "* Max 200 characters."}</span>
                <span className={comment.length >= 180 ? "text-[#FF2D78]" : "text-zinc-500"}>{comment.length} / 200</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={async () => {
                  await publishCreatorBracket(token, comment);
                }}
                disabled={isPublishing}
                className={`swiss-btn-primary bg-[#FF2D78] hover:bg-[#D8105B] text-white border-black shadow-[3px_3px_0px_#FFE600] uppercase text-[10px] tracking-widest font-black flex items-center gap-2 px-5 py-3 cursor-pointer ${
                  isPublishing ? "opacity-50 cursor-wait" : ""
                }`}
              >
                {isPublishing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isTr ? "YAYINLANIYOR..." : "PUBLISHING..."}</span>
                  </>
                ) : (
                  <>
                    <span>🔴</span>
                    <span>{isTr ? "TAHMİNİMİ RESMİ OLARAK KİLİTLE & YAYINLA" : "OFFICIALLY LOCK & PUBLISH MY PREDICTION"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ══ CREATOR PREDICTION VIEWER BANNER ══ */}
        {isReadOnly && viewingCreatorName && (
          <div className="bg-black border-[3px] border-[#00E5FF] p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0_#00E5FF] animate-fade-up">
            <div className="flex items-center space-x-3.5">
              <span className="text-2xl">🎙️</span>
              <div>
                <h3 className="text-sm font-mono font-black text-[#00E5FF] uppercase tracking-wider">
                  {viewingCreatorName}
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {isTr
                    ? "Onaylı yorumcunun kilitli tahmin ağacını inceliyorsunuz. Skor değişiklikleri kilitlenmiştir."
                    : "You are reviewing the locked prediction tree of the verified creator. Score changes are locked."}
                </p>
              </div>
            </div>
            <button
              onClick={cloneBracket}
              className="swiss-btn-primary bg-[#00E5FF] hover:bg-[#00B4D8] text-zinc-950 border-black shadow-[3px_3px_0px_#FFF] uppercase text-[10px] tracking-widest font-black shrink-0 px-4 py-2 cursor-pointer"
            >
              {isTr ? "🎮 BU TAHMİNİ KLONLA" : "🎮 CLONE THIS PREDICTION"}
            </button>
          </div>
        )}

        {/* ══ SUCCESSFUL PUBLISH BANNER (own bracket just published) ══ */}
        {isReadOnly && !viewingCreatorName && !window.location.href.includes("bracket=") && (
          <div className="bg-black border-[3px] border-[#00FF87] p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0_#00FF87] animate-fade-up">
            <div className="flex items-center space-x-3.5">
              <span className="text-2xl animate-bounce">🏆</span>
              <div>
                <h3 className="text-sm font-mono font-black text-[#00FF87] uppercase tracking-wider">
                  {isTr ? "TAHMİNİNİZ RESMİ OLARAK YAYINLANDI VE KİLİTLENDİ!" : "YOUR PREDICTION IS OFFICIALLY PUBLISHED & LOCKED!"}
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {isTr
                    ? "Tahmin ağacınız başarıyla sunucuya kaydedildi. One-Shot Lock (Tek Hak) kuralı gereği artık tahminlerinizi değiştiremezsiniz."
                    : "Your prediction tree has been successfully saved to the server. Due to the One-Shot Lock rule, you can no longer modify your predictions."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ READ ONLY VIEWER MODE BANNER ══ */}
        {isReadOnly && window.location.href.includes("bracket=") && (
          <div className="bg-black border-[3px] border-[#FF2D78] p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0_#FF2D78] animate-pulse">
            <div className="flex items-center space-x-3.5">
              <span className="text-2xl animate-bounce">👁️</span>
              <div>
                <h3 className="text-sm font-mono font-black text-[#FF2D78] uppercase tracking-wider">
                  {isTr ? "İZLEYİCİ MODU (SALT OKUNUR)" : "VIEWER MODE (READ-ONLY)"}
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {isTr
                    ? "Şu an başka bir kullanıcının paylaştığı turnuva tahmin ağacını inceliyorsunuz. Skor değişiklikleri kilitlenmiştir."
                    : "You are currently reviewing a tournament prediction tree shared by another user. Score changes are locked."}
                </p>
              </div>
            </div>
            <button
              onClick={cloneBracket}
              className="swiss-btn-primary bg-[#00FF87] hover:bg-[#00D06E] text-zinc-950 border-black shadow-[3px_3px_0px_#FFF] uppercase text-[10px] tracking-widest font-black shrink-0 px-4 py-2 cursor-pointer"
            >
              {isTr ? "🎮 Kendi Tahminini Yap (Klonla)" : "🎮 Make Your Prediction (Clone)"}
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
                <span className="neon-badge neon-badge-green">{isTr ? "KOKPİT MODU" : "COCKPIT MODE"}</span>
                <span className="neon-badge neon-badge-cyan">{isTr ? "104 MAÇ Simülatörü" : "104 MATCH Simulator"}</span>
                <span className="neon-badge neon-badge-yellow">CASCADE MOTOR</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-white">
                {isTr ? "DÜNYA KUPASI 2026" : "WORLD CUP 2026"}
                <br />
                <span className="text-[#00FF87] drop-shadow-[0_0_15px_rgba(0,255,135,0.3)]">{isTr ? "TAHMİN KOKPİTİ" : "PREDICTION COCKPIT"}</span>
              </h1>
              <p className="text-zinc-400 text-xs font-medium leading-relaxed max-w-[50ch]">
                {isTr
                  ? "Bu panel tamamen client-side çalışan matematiksel bir \"What-If\" simülasyon alanıdır. Herhangi bir maçın skorunu değiştirdiğinizde, tüm puan durumları ve eleme ağacı anında baştan hesaplanır."
                  : "This panel is a purely client-side mathematical \"What-If\" simulation workspace. Whenever you change any match score, all standings and the knockout tree are recalculated instantaneously."}
              </p>
            </div>

            <div className="flex items-center space-x-3 flex-wrap gap-2.5">
              {!isReadOnly && (
                <>
                  <button
                    onClick={reRollSeed}
                    className="swiss-btn-primary bg-[#00E5FF] hover:bg-[#00B4D8] text-zinc-950 border-black shadow-[3px_3px_0px_#00FF87] uppercase text-[10px] tracking-widest font-black"
                    title={isTr ? `Mevcut Tohum (Seed): ${seed}. Yeni olasılıklarla tekrar simüle et.` : `Current Seed: ${seed}. Re-simulate with new probabilities.`}
                  >
                    {isTr ? `🎲 TAHMİNİ YENİLE (${seed})` : `🎲 RE-ROLL PREDICTION (${seed})`}
                  </button>

                  {overriddenCount > 0 && (
                    <button
                      onClick={resetAllMatches}
                      className="swiss-btn-primary bg-[#FF2D78] hover:bg-[#D8105B] text-white border-[#FF2D78] shadow-[4px_4px_0px_#FFF] uppercase text-[10px] tracking-widest font-black"
                    >
                      {isTr ? `🔄 SIFIRLA (${overriddenCount})` : `🔄 RESET (${overriddenCount})`}
                    </button>
                  )}

                  <button
                    onClick={handleShare}
                    className="swiss-btn-primary bg-[#00FF87] hover:bg-[#00D06E] text-zinc-950 border-black shadow-[3px_3px_0px_#FFE600] uppercase text-[10px] tracking-widest font-black flex items-center gap-1.5"
                    title={isTr ? "Mevcut tahmin ağacınızı arkadaşlarınızla paylaşmak için kopyalanabilir bir link oluşturur." : "Generates a shareable link of your current prediction tree."}
                  >
                    <span>🔗</span>
                    <span>{copied ? (isTr ? "KOPYALANDI!" : "COPIED!") : (isTr ? "TAHMİNİ PAYLAŞ" : "SHARE PREDICTION")}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══ LOADING / ERROR STATES ══ */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-zinc-900 border-2 border-black shadow-[4px_4px_0_#1A1916]">
            <div className="w-10 h-10 border-3 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
            <p className="swiss-label animate-retro-blink text-zinc-400">{isTr ? "Tahmin Motoru Yükleniyor..." : "Loading Prediction Engine..."}</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-12 text-center bg-red-950/20 border-2 border-red-900 text-red-400 shadow-[4px_4px_0_#1A1916]">
            <div className="text-3xl mb-3">⚠️</div>
            <h4 className="font-black text-sm uppercase">{isTr ? "Simülasyon Başlatma Hatası" : "Simulation Initialization Error"}</h4>
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

                {/* ══ DYNAMIC QUICK TABS AND GROUP PILLS ══ */}
                {activeStage === "GROUP" && (
                  <div className="bg-zinc-950 border-2 border-black p-4 space-y-4 shadow-[4px_4px_0px_#1A1916]">
                    {/* A. ROUND QUICK-TABS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                      <span className="text-[10px] font-mono text-[#00E5FF] font-black uppercase tracking-wider">
                        {isTr ? "⚡ TUR SEÇİMİ (ROUND FILTER)" : "⚡ ROUND SELECTOR"}
                      </span>
                      <div className="flex flex-wrap gap-1.5 select-none">
                        {[
                          { value: null, label: isTr ? "TÜMÜ" : "ALL" },
                          { value: 1, label: isTr ? "1. TUR" : "ROUND 1" },
                          { value: 2, label: isTr ? "2. TUR" : "ROUND 2" },
                          { value: 3, label: isTr ? "3. TUR" : "ROUND 3" }
                        ].map((btn) => {
                          const isBtnActive = selectedRoundFilter === btn.value;
                          return (
                            <button
                              key={btn.label}
                              onClick={() => setSelectedRoundFilter(btn.value)}
                              className={`px-2.5 py-1 text-[9px] font-mono font-black border transition-all cursor-pointer ${
                                isBtnActive
                                  ? "bg-[#00FF87] text-zinc-950 border-[#00FF87] shadow-[1.5px_1.5px_0px_#000]"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                              }`}
                              style={{ borderRadius: "0px" }}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* B. GROUP QUICK-PILLS (A to L) */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-[#FFE600] font-black uppercase tracking-wider">
                          {isTr ? "🔍 GRUP ODAĞI (GROUP FOCUS)" : "🔍 GROUP FOCUS"}
                        </span>
                        {selectedGroupFilter && (
                          <button
                            onClick={() => setSelectedGroupFilter(null)}
                            className="px-1.5 py-0.5 bg-red-950/20 border border-red-900 text-[#FF2D78] font-mono text-[8px] font-black uppercase cursor-pointer hover:bg-[#FF2D78] hover:text-white"
                          >
                            {isTr ? "KAPAT" : "CLEAR"}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {groups.map((g) => {
                          const isPillActive = selectedGroupFilter === g;
                          return (
                            <button
                              key={g}
                              onClick={() => setSelectedGroupFilter(isPillActive ? null : g)}
                              className={`w-7 h-7 flex items-center justify-center font-mono font-black text-xs border transition-all cursor-pointer ${
                                isPillActive
                                  ? "bg-[#FFE600] text-zinc-950 border-[#FFE600] shadow-[1.5px_1.5px_0px_#000]"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                              }`}
                              style={{ borderRadius: "0px" }}
                            >
                              {g}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {filteredMatches.length > 0 ? (
                  activeStage === "GROUP" ? (
                    <div className="space-y-12">
                      {[1, 2, 3].map((rId) => {
                        const roundMatches = filteredMatches.filter((m) => m.roundId === rId);
                        if (roundMatches.length === 0) return null;
                        return (
                          <div key={rId} className="space-y-5">
                            {/* Siber-brutalist round divider heading */}
                            <div className="flex items-center justify-between border-b-2 border-zinc-950 pb-2">
                              <span
                                className="font-mono text-[9px] md:text-[10px] font-black tracking-widest text-zinc-950 px-3.5 py-1.5 border-2 border-zinc-950 shadow-[2px_2px_0_#000]"
                                style={{ background: "#00FF87" }}
                              >
                                {isTr ? `0${rId} • GRUP TURU KARŞILAŞMALARI` : `0${rId} • GROUP STAGE ROUND`}
                              </span>
                              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                                {isTr ? `${roundMatches.length} MAÇ` : `${roundMatches.length} MATCHES`}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {roundMatches.map((match) => (
                                <MatchCard key={match.id} match={match} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredMatches.map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="py-20 text-center bg-zinc-900/40 border-2 border-zinc-800 shadow-[4px_4px_0_rgba(0,0,0,0.2)] flex flex-col items-center justify-center space-y-4">
                    <span className="text-3xl">⏳</span>
                    <h4 className="font-black text-xs tracking-wider uppercase text-zinc-400">
                      {isTr ? "Eşleşmeler Belirlenmedi" : "Matchups Not Determined"}
                    </h4>
                    <p className="text-[10px] text-zinc-600 max-w-[40ch] leading-relaxed">
                      {isTr
                        ? "Bu turdaki eşleşmeler, bir önceki turdaki simülasyon sonuçlarına göre otomatik belirlenmektedir. Grup turlarını veya önceki eleme turlarını tamamladığınızda eşleşmeler buraya yansıyacaktır."
                        : "The matchups in this round are automatically determined based on the simulation results from the previous round. Matchups will appear here once you complete the group stage or previous knockout rounds."}
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

            {subTab === "creators" && (
              /* VERIFIED CREATORS SHOWCASE */
              <CreatorsSubView onViewCreator={() => setSubTab("groups")} />
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
  const { i18n } = useTranslation();
  const isTr = (i18n.language || "en").startsWith("tr");

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setSearchCategory] = useState<string>("ALL");

  // Labels and explanations in both TR & EN
  const labelsTr = {
    LEGEND: "TARİHİ EFSANE",
    POTENTIAL: "GİZLİ POTANSİYEL",
    STAR: "YÜKSELEN YILDIZ",
    FALLING: "GERİLEYEN DEV",
    MODEST: "MÜTEVAZI GÜÇ",
  };

  const labelsEn = {
    LEGEND: "HISTORIC LEGEND",
    POTENTIAL: "DARK HORSE",
    STAR: "RISING STAR",
    FALLING: "FALLING GIANT",
    MODEST: "MODEST STRENGTH",
  };

  const labels = isTr ? labelsTr : labelsEn;

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

    let categoryKey: "LEGEND" | "POTENTIAL" | "STAR" | "FALLING" | "MODEST" = "MODEST";
    let explanation = "";
    let color = "#A78BFA"; // purple/violet default

    // PRIORITY 1: Historic Legend
    if (matchesTotal >= 750 && (championships > 0 || appearances >= 15)) {
      categoryKey = "LEGEND";
      color = "#A78BFA"; // violet
      explanation = isTr
        ? `${championships > 0 ? championships + ' Şampiyonluk ve ' : ''}${appearances} katılımı ile turnuva DNA'sı en yüksek elit devlerden biridir.`
        : `One of the elite giants with the highest tournament DNA, holding ${appearances} appearances${championships > 0 ? ' and ' + championships + ' titles' : ''}.`;
    } 
    // PRIORITY 2: Dark Horse / Potential
    else if (rating < 1900 && squadValue > 300 && championships === 0) {
      categoryKey = "POTENTIAL";
      color = "#00E5FF"; // siber mavi
      explanation = isTr
        ? `${squadValue}M € kadro değeri ve ${averageAge} yaş ortalamasıyla gizli bir devdir. Kupayı devirme potansiyeli çok yüksektir.`
        : `A sleeping giant with a squad value of €${squadValue}M and average age of ${averageAge}. High potential to win the cup.`;
    } 
    // PRIORITY 3: Rising Star
    else if ((rating - avgRating >= 100) && (avgRating < 1850)) {
      categoryKey = "STAR";
      color = "#00FF87"; // neon yeşil
      explanation = isTr
        ? `Tarihsel ELO ortalaması ${avgRating} iken, güncel ELO puanı ${rating} seviyesine fırlamıştır (+${rating - avgRating} ELO artışı).`
        : `Current ELO rating has surged to ${rating} from a historical ELO average of ${avgRating} (+${rating - avgRating} ELO growth).`;
    } 
    // PRIORITY 4: Falling Giant
    else if ((avgRating - rating >= 20) && squadValue < 250) {
      categoryKey = "FALLING";
      color = "#FF2D78"; // siber pembe
      explanation = isTr
        ? `Geçmiş gücünün gerisinde kalmış, form grafiği ve kadro değeri (${squadValue}M €) eriyen tehlike sınırındaki takım.`
        : `Fallen behind its past strength, a team in the danger zone with declining form and squad value (€${squadValue}M).`;
    } 
    // PRIORITY 5: Modest Strength
    else {
      categoryKey = "MODEST";
      color = "#FFE600"; // siber sarı
      explanation = isTr
        ? `${rating} ELO puanıyla her an sürpriz yapabilecek, turnuvanın dengelerini elinde tutan tehlikeli bir karanlık at (dark horse).`
        : `A dangerous dark horse holding the tournament balance with a ${rating} ELO score, capable of surprises.`;
    }

    return {
      ...team,
      csr,
      label: labels[categoryKey],
      color,
      explanation,
      avgRating,
      matchesTotal,
    };
  });

  // Calculate HUD counters
  const wonderkidsCount = teams.filter((t) => t.averageAge < 27 && t.squadValue > 500).length;
  const potentialCount = mappedTeams.filter((t) => t.label === labels.POTENTIAL).length;
  const legendCount = mappedTeams.filter((t) => t.label === labels.LEGEND).length;

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
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
            {isTr ? "ALTIN JENERASYON (YAŞ < 27)" : "GOLDEN GENERATION (AGE < 27)"}
          </span>
          <span className="text-3xl font-black text-[#FFE600] font-mono block">
            {wonderkidsCount} {isTr ? "ÜLKE" : "COUNTRIES"}
          </span>
          <p className="text-[9px] text-zinc-400 mt-2 leading-relaxed">
            {isTr
              ? "Kadro değeri 500M € üstü ve yaş ortalaması 27'den küçük wonderkid kadrolar."
              : "Wonderkid squads with squad value over €500M and average age under 27."}
          </p>
        </div>

        <div className="bg-zinc-900 border-[3px] border-black p-5 relative overflow-hidden shadow-[4px_4px_0_#00E5FF]">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
            {isTr ? "GİZLİ POTANSİYELLER (DARK HORSE)" : "DARK HORSES (DARK HORSE)"}
          </span>
          <span className="text-3xl font-black text-[#00E5FF] font-mono block">
            {potentialCount} {isTr ? "ÜLKE" : "COUNTRIES"}
          </span>
          <p className="text-[9px] text-zinc-400 mt-2 leading-relaxed">
            {isTr
              ? "Kadro kalitesi çok yüksek olmasına rağmen kupa tecrübesi olmayan gizli dinamolar."
              : "Hidden dynamos with exceptionally high squad quality but lacking tournament pedigree."}
          </p>
        </div>

        <div className="bg-zinc-900 border-[3px] border-black p-5 relative overflow-hidden shadow-[4px_4px_0_#A78BFA]">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
            {isTr ? "TARİHİ EFSANELER (LEGENDS)" : "HISTORIC LEGENDS (LEGENDS)"}
          </span>
          <span className="text-3xl font-black text-[#A78BFA] font-mono block">
            {legendCount} {isTr ? "ÜLKE" : "COUNTRIES"}
          </span>
          <p className="text-[9px] text-zinc-400 mt-2 leading-relaxed">
            {isTr
              ? "Tarihinde en çok maç yapmış, kupa pedigrisi ve turnuva DNA'sı yüksek elite devler."
              : "Elite giants with high tournament DNA, cup pedigree, and most historical matches played."}
          </p>
        </div>
      </div>

      {/* ══ SEARCH & FILTER BAR ══ */}
      <div className="bg-zinc-900 border-[3px] border-black p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-[4px_4px_0_#00FF87]">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder={isTr ? "Takım ara (Örn: Türkiye, Fas)..." : "Search team (e.g. Turkey, Morocco)..."}
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
            { id: "ALL", label: isTr ? "TÜMÜ" : "ALL" },
            { id: labels.LEGEND, label: isTr ? "EFSANELER" : "LEGENDS" },
            { id: labels.POTENTIAL, label: isTr ? "POTANSİYELLER" : "DARK HORSES" },
            { id: labels.STAR, label: isTr ? "YÜKSELEN YILDIZLAR" : "RISING STARS" },
            { id: labels.FALLING, label: isTr ? "GERİLEYEN DEVLER" : "FALLING GIANTS" },
            { id: labels.MODEST, label: isTr ? "MÜTEVAZI GÜÇLER" : "MODEST STRENGTHS" },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSearchCategory(cat.id)}
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
                      alt={isTr ? team.nameTr : team.nameEn}
                      className="w-full h-full object-cover scale-110"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/40x40/222/00FF87?text=${team.code.toUpperCase()}`;
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white tracking-tight flex items-center gap-2">
                      <span>{isTr ? team.nameTr : team.nameEn}</span>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">{team.code}</span>
                    </h3>
                    <p className="text-[9px] text-[#00E5FF] font-mono tracking-widest">
                      {team.confederationId} {isTr ? "KONFEDERASYONU" : "CONFEDERATION"}
                    </p>
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
                  <span className="text-[7px] text-zinc-500 font-bold uppercase leading-none mb-1">
                    {isTr ? "GÜNCEL ELO" : "CURRENT ELO"}
                  </span>
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
                  <span className="text-[7px] text-zinc-500 font-bold uppercase leading-none mb-1">
                    {isTr ? "KADRO DEĞERİ" : "SQUAD VALUE"}
                  </span>
                  <span className="text-white font-extrabold text-xs">{team.squadValue}M €</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-zinc-500 font-bold uppercase leading-none mb-1">
                    {isTr ? "YAŞ ORT." : "AVG AGE"}
                  </span>
                  <span className="text-white font-extrabold text-xs">
                    {team.averageAge} {isTr ? "yaş" : "years"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-zinc-500 font-bold uppercase leading-none mb-1">
                    {isTr ? "C.S.R GÜCÜ" : "C.S.R POWER"}
                  </span>
                  <span className="text-[#00E5FF] font-black text-xs">{team.csr}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-zinc-900 border-2 border-zinc-800 shadow-[4px_4px_0_rgba(0,0,0,0.2)] flex flex-col items-center justify-center space-y-4">
          <span className="text-3xl">📭</span>
          <h4 className="font-black text-xs tracking-wider uppercase text-zinc-400">
            {isTr ? "Aramanıza Uygun Takım Bulunamadı" : "No Teams Found Matching Your Search"}
          </h4>
          <p className="text-[10px] text-zinc-600 max-w-[30ch]">
            {isTr
              ? "Farklı bir arama terimi girerek veya kategori filtrelerini değiştirerek tekrar deneyebilirsiniz."
              : "You can try again by entering a different search term or changing category filters."}
          </p>
        </div>
      )}

      {/* ══ DYNAMIC ALGORITHM DOCUMENTATION BOARD ══ */}
      <div 
        className="bg-zinc-900 border-[3px] border-black p-6 md:p-8 space-y-6 shadow-[5px_5px_0_rgba(167,139,250,0.2)] mt-8"
      >
        <div className="border-b border-zinc-800 pb-4">
          <span className="neon-badge font-mono tracking-widest text-[9px] uppercase" style={{ color: "#A78BFA", borderColor: "#A78BFA40", background: "#A78BFA10" }}>
            ● {isTr ? "ALGORİTMA ÖZELLİKLERİ & METRİK AÇIKLAMALARI" : "ALGORITHM SPECIFICATIONS & METRICS DOCUMENTATION"}
          </span>
          <h2 className="text-white font-black text-sm tracking-wide uppercase mt-2">
            {isTr 
              ? "Güç ve Profil Kategorileri Nasıl Belirlenir?" 
              : "How are Strength & Profile Categories Computed?"}
          </h2>
        </div>

        <div className="space-y-4 text-xs font-mono leading-relaxed text-zinc-400">
          <p className="text-[10px] text-zinc-500 font-medium">
            {isTr
              ? "Sistemimizdeki profiller ve etiketler, takımların anlık başarılarından bağımsız olarak turnuva genetiğini, kadro piyasa değerlerini ve tarihsel ELO form grafiklerini harmanlayan hibrit bir modelle hesaplanır:"
              : "Profiles and tags are generated dynamically based on an analytical hybrid model that merges tournament pedigree, financial value, and historical ELO trends:"}
          </p>
          
          <ul className="space-y-4 text-[10px] list-none p-0 m-0">
            <li>
              <span className="text-[#A78BFA] font-black uppercase">
                🏆 {isTr ? "Tarihi Efsane (Historic Legend):" : "Historic Legend:"}
              </span>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Nasıl Belirlenir?:" : "How It's Determined?:"}</strong>{" "}
                {isTr
                  ? "Takımın tarihsel maç sayısı 750+ olmalı VE en az 1 şampiyonluğu ya da 15+ turnuva katılımı bulunmalıdır. (Not: Bu statü mutlak hiyerarşiye sahiptir, form durumundan bağımsız olarak diğer tüm kategorileri ezer)."
                  : "Historically played matches must be 750+ AND have at least 1 championship title or 15+ tournament appearances. (Note: This status possesses absolute hierarchy, overriding all other categories regardless of form trends)."}
              </p>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Neyi Belirliyor?:" : "What It Determines?:"}</strong>{" "}
                {isTr
                  ? "Turnuva DNA'sı ve tecrübesi en üst seviyede olan elit devlerdir (Örn: Arjantin, Brezilya, İspanya, Almanya). Simülatörümüzde eleme turlarında zayıf takımlara karşı uygulanan \"Efsanelerin Zırhı\" çarpanını doğrudan bu DNA tetikler."
                  : "Elite giants with supreme tournament pedigree and experience (e.g., Argentina, Brazil, Spain, Germany). In our simulator, this DNA directly triggers the 'Elite Plot Armor' multiplier applied during knockouts against underdogs."}
              </p>
            </li>
            <li>
              <span className="text-[#00E5FF] font-black uppercase">
                💎 {isTr ? "Gizli Potansiyel (Dark Horse / Potential):" : "Dark Horse / Potential:"}
              </span>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Nasıl Belirlenir?:" : "How It's Determined?:"}</strong>{" "}
                {isTr
                  ? "Güncel ELO gücü 1900'ün altında, Kadro Değeri 300 Milyon Euro'dan yüksek olmalı ve hiç şampiyonluğu bulunmamalıdır."
                  : "Current ELO must be below 1900, Squad Value over €300M, and have zero championship titles."}
              </p>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Neyi Belirliyor?:" : "What It Determines?:"}</strong>{" "}
                {isTr
                  ? "İstatistikleri henüz zirvede olmasa da, kadro kalitesi ve finansal gücü elit seviyede olan, patlamaya hazır takımları temsil eder. Yaş ortalamaları genelde gençtir ve devleri devirme potansiyelleri çok yüksektir."
                  : "Roster quality and financial power are at elite levels even if stats are not yet at the absolute peak, representing highly explosive squads. Roster ages are usually young with a very high potential to upset elite giants."}
              </p>
            </li>
            <li>
              <span className="text-[#00FF87] font-black uppercase">
                ⚡ {isTr ? "Yükselen Yıldız (Rising Star):" : "Rising Star:"}
              </span>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Nasıl Belirlenir?:" : "How It's Determined?:"}</strong>{" "}
                {isTr
                  ? "Güncel ELO gücü, tarihsel ELO ortalamasının en az 100 puan üzerinde olmalıdır. Ancak takımın tarihsel ELO ortalaması 1850'nin altında olmalıdır. (Köklü devler bu kategoriye giremez)."
                  : "Current ELO rating must be at least 100 points higher than historical ELO average. However, the historical ELO average must be below 1850. (Established football giants cannot enter this category)."}
              </p>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Neyi Belirliyor?:" : "What It Determines?:"}</strong>{" "}
                {isTr
                  ? "Orta veya alt klasmandan gelip son yıllarda form grafiğinde muazzam bir patlama yaşayan takımları belirler. Form ve moral avantajları, simülatörde gol beklentisi (Lambda) hesaplarına ciddi bir momentum olarak yansır."
                  : "Identifies squads from lower or mid tiers who have registered massive form explosions in recent years. Form and morale advantages reflect as high momentum inside simulator goal expectation (Lambda) calculations."}
              </p>
            </li>
            <li>
              <span className="text-[#FF2D78] font-black uppercase">
                🚨 {isTr ? "Gerileyen Dev (Falling Giant):" : "Falling Giant:"}
              </span>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Nasıl Belirlenir?:" : "How It's Determined?:"}</strong>{" "}
                {isTr
                  ? "Güncel ELO gücü, tarihsel ortalamasının en az 20 puan altında olmalı VE Kadro Değeri 250 Milyon Euro'nun altında kalmalıdır."
                  : "Current ELO must be at least 20 points lower than the historical average, AND the squad market value must be under €250M."}
              </p>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Neyi Belirliyor?:" : "What It Determines?:"}</strong>{" "}
                {isTr
                  ? "Geçmişte büyük başarıları olan ancak güncel form grafiği eriyen, kadro kalitesi zayıflayan takımları temsil eder. Bu takımların eleme turlarında oyundan düşme olasılıkları matematiksel olarak artırılır."
                  : "Represents established teams with high historical pedigree facing a performance slump and melting squad values. Their capacity to compete during knockout extra times is mathematically suppressed."}
              </p>
            </li>
            <li>
              <span className="text-[#FFE600] font-black uppercase">
                🟡 {isTr ? "Mütevazı Güç (Modest Strength):" : "Modest Strength:"}
              </span>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Nasıl Belirlenir?:" : "How It's Determined?:"}</strong>{" "}
                {isTr
                  ? "Yukarıdaki 4 elit/özel kritere uymayan diğer tüm takımlar otomatik olarak bu kategoriye dahil edilir."
                  : "All other squads not matching any of the 4 elite/custom conditions are automatically grouped here."}
              </p>
              <p className="mt-1 text-zinc-400">
                <strong>{isTr ? "Neyi Belirliyor?:" : "What It Determines?:"}</strong>{" "}
                {isTr
                  ? "Turnuvanın rekabet dengesini elinde tutan, her an sürpriz yapabilecek tehlikeli ve dirençli takımları temsil eder. Tamamen kendi taktiksel ELO güçleriyle sahada mücadele ederler."
                  : "Represents dangerous, highly resilient sides holding the competitive balance of the tournament, capable of surprises at any time. They fight purely using tactical ELO strengths."}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SimulationGuidePanel() {
  const { i18n } = useTranslation();
  const isTr = (i18n.language || "en").startsWith("tr");
  const [activeGuideTab, setActiveGuideTab] = useState<"logic" | "rules" | "data" | "usage">("logic");

  const tabLabelsTr = {
    logic: "SİMÜLASYON MANTIĞI",
    rules: "HİPER-REALİZM KURALLARI",
    data: "VERİ GÜVENİLİRLİĞİ & KAYNAKLAR",
    usage: "NASIL KULLANILIR?",
  };

  const tabLabelsEn = {
    logic: "SIMULATION LOGIC",
    rules: "HYPER-REALISM RULES",
    data: "DATA RELIABILITY & SOURCES",
    usage: "HOW TO USE?",
  };

  const tabLabels = isTr ? tabLabelsTr : tabLabelsEn;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ══ GUIDE SUB-NAVIGATOR ══ */}
      <div className="bg-zinc-900 border-[3px] border-black p-4 flex flex-wrap gap-2.5 shadow-[4px_4px_0_#FFE600] select-none">
        {[
          { id: "logic", label: tabLabels.logic, color: "#00FF87" },
          { id: "rules", label: tabLabels.rules, color: "#00E5FF" },
          { id: "data", label: tabLabels.data, color: "#A78BFA" },
          { id: "usage", label: tabLabels.usage, color: "#FFE600" },
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
          isTr ? (
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
                    Her ülkenin gücünü temsil eden <b>Composite Strength Rating (CSR)</b> puanı hesaplanırken sadece ELO puanına bakılmaz. ELO puanı (Grup aşamasında %55 etki), Transfermarkt kadro değerinin logaritmik ölçeği (%20), ülkenin Dünya Kupası'na katılım ve şampiyonluk sayılarıyla belirlenen zaman çürütmeli turnuva DNA'sı (%10 - 1990 ve sonrası şampiyonluklara +25 DNA puanı, öncesine +5 DNA puanı uygulanır) ve son 1 yıllık form trendi (%5) dinamik olarak harmanlanır. Ev sahibi takımların (ABD, Meksika, Kanada) taraftar coşkusu ise CSR katsayısından tamamen ayrıştırılarak, o maçtaki Gol Beklentilerine (Lambda) doğrudan %15 artış olarak yansıtılır.
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
          ) : (
            <div className="space-y-6">
              <div className="border-l-4 border-[#00FF87] pl-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                  Working Principles of Cascade Prediction Engine
                </h2>
                <p className="text-[11px] text-[#00FF87] font-mono tracking-widest uppercase mt-0.5">
                  MATHEMATICAL "WHAT-IF" SCENARIOS AND PROBABILITY CURVES
                </p>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                This simulator is not a simple game of chance generating random numbers. Every matchup in the World Cup is calculated over a scientific model combining the teams' active forms, financial squad depths, and tournament genetics.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3">
                  <span className="text-xs font-black text-[#00FF87] block uppercase font-mono tracking-wider">
                    1. What is Composite Strength Rating (CSR)?
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    To evaluate each country's strength, the <b>Composite Strength Rating (CSR)</b> score is computed. It combines ELO ratings (55% weight in Group stage), logarithmic market value from Transfermarkt (20%), tournament DNA calculated from historical appearances and cup titles with a year-decay decay (10% - granting +25 DNA points for titles in/after 1990, and +5 points for older titles), and ELO momentum trend over the past 1 year (5%) dynamically. The home advantage moral boost is completely decoupled from the tactical CSR and directly increases the host's Goal Expectation (Lambda boosted by 15% in their matches) to prevent artificial aura bonuses.
                  </p>
                </div>

                <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3">
                  <span className="text-xs font-black text-[#00E5FF] block uppercase font-mono tracking-wider">
                    2. Poisson Distribution for Expected Goals
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    When two teams match up, their CSR difference is analyzed to generate an expected goals value called <b>Lambda (&lambda;)</b> for each side. This expectation is computed through the Poisson Distribution formula in probability theory, calculating exact odds of scoring 0, 1, 2, 3, etc. goals in that match.
                  </p>
                </div>

                <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3">
                  <span className="text-xs font-black text-[#FFE600] block uppercase font-mono tracking-wider">
                    3. Seeded Poisson (Mulberry32) & Knuth Algorithm
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    While sampling random scores from the Poisson distribution, the lightweight <b>Mulberry32 PRNG (Pseudo-Random Number Generator)</b> is used to return identical results for the same seed value. Knuth's algorithm generates realistic scores, capting outliers (max 6 goals) to preserve gameplay.
                  </p>
                </div>

                <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3">
                  <span className="text-xs font-black text-[#A78BFA] block uppercase font-mono tracking-wider">
                    4. Dynamic Knockout Cascade Ripple Chain
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    All 104 matches of the tournament and 3rd-place tie-breakers act as interconnected nodes. When you manually override a match score, this change instantly propagates down the single-elimination tree (Round of 32, 16, QF, SF, F) via a cascade effect, updating qualified teams and resetting downstream user overrides.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* ── TAB 2: HYPER-REALISM RULES ── */}
        {activeGuideTab === "rules" && (
          isTr ? (
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
                Geleneksel Poisson simülasyonlarında "Bileşik Varyans (Compounding Variance)" sorunu nedeniyle favori takımlar çok kolay elenir ve turnuva sonuna doğru absürt finaller oluşur. Tahmin motorumuzda bu sapmaları sıfırlayan <b>10 adet özel hiper-realizm kuralı</b> aktiftir:
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
                    desc: "Kadro yaş ortalaması genç (< 27) ve Transfermarkt değeri yüksek (> 500M €) olan parlak jenerasyonlara (Örn: Türkiye, Fas) gol beklentilerinde (Lambda) %10 oranında pozitif bonus yansıtılır. Bu sayede sürpriz yapma şansları artar.",
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
                    title: "Otobüsü Çekme (Low-Block Bias / Underdog Lockdown)",
                    desc: "CSR farkı 300'ü aşan dev vs zayıf maçlarında, zayıf takımın defansif planı gereği gol beklentisi maks 0.75'e sınırlanır ve devin gol beklentisi zayıf takımın düşük bloğu nedeniyle %15 oranında törpülenir.",
                    badge: "AKTİF",
                    color: "#A78BFA",
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
          ) : (
            <div className="space-y-6">
              <div className="border-l-4 border-[#00E5FF] pl-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                  Hyper-Realism & Anti-Chaos Rules
                </h2>
                <p className="text-[11px] text-[#00E5FF] font-mono tracking-widest uppercase mt-0.5">
                  REALISTIC FILTERS ELIMINATING COMPOUND VARIANCE AND WEIRD MATCHUPS
                </p>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                In traditional Poisson simulations, the favorite teams are often too easily knocked out due to "Compounding Variance", leading to absurd finals. In our prediction engine, <b>10 custom hyper-realism rules</b> are active:
              </p>

              <div className="space-y-4 pt-4">
                {[
                  {
                    title: "Knockout DNA Clutch (Cup Monster)",
                    desc: "For giants with rich tournament history (Brazil, Germany, Italy), their DNA weight acts as x1.0 in the group stage, surges to x1.5 in the Round of 32/16, and hits x2.0 from QF onwards. Giants shifting gear in later stages is mathematically simulated.",
                    badge: "ACTIVE",
                    color: "#00FF87",
                  },
                  {
                    title: "Golden Generation Wonderkids",
                    desc: "Young wonderkid squads (average age < 27) with high Transfermarkt squad values (> €500M) like Turkey or Morocco receive a +10% expected goal (Lambda) boost, enhancing their dark horse odds.",
                    badge: "ACTIVE",
                    color: "#FFE600",
                  },
                  {
                    title: "Giant Killer Motivation",
                    desc: "In highly unbalanced matches where the CSR difference is over 250 points, if the underdog's 1-year ELO trend is positive, they gain +50 motivation CSR points on the pitch, making historic upsets possible.",
                    badge: "ACTIVE",
                    color: "#00E5FF",
                  },
                  {
                    title: "Low-Block Bias (Underdog Lockdown)",
                    desc: "In matches with a CSR difference over 300 points, the underdog's expected goals is capped at 0.75 in regular time to model low-block tactics, and the giant's expected goals is scaled down by 15% due to space restrictions.",
                    badge: "ACTIVE",
                    color: "#A78BFA",
                  },
                  {
                    title: "Variance Dampening (Late-stage Stress)",
                    desc: "As teams approach later stages (QF, SF, F), defense tightens to avoid costly mistakes. To reflect this stress, both teams' expected goals (Lambda) are scaled down by 25%, making 0-0 or 1-0 tactical lockdowns more common.",
                    badge: "ACTIVE",
                    color: "#FF2D78",
                  },
                  {
                    title: "Elite Plot Armor",
                    desc: "In knockout stages, if an elite giant (ELO >= 2000) plays an underdog that is 200+ CSR points weaker, the underdog's scoring chance drops by an extra 20%. This prevents elite giants from being eliminated by minor anomalies.",
                    badge: "ACTIVE",
                    color: "#A78BFA",
                  },
                  {
                    title: "Stage Fright Nerf",
                    desc: "If a weak team (base ELO < 1650) plays an elite giant (base ELO > 1950) in a knockout round, the underdog's expected goals (Lambda) is nerfed by 50% to simulate lack of experience on the big stage.",
                    badge: "ACTIVE",
                    color: "#FF2D78",
                  },
                  {
                    title: "Fake Stats Normalization",
                    desc: "Fabulous goal statistics compiled by minor teams in weak regional matches (like Oceania or Caribbean) are normalized when playing elite opponents. If CSR difference exceeds 300, the underdog's historical goals-for average is capped at 1.1.",
                    badge: "ACTIVE",
                    color: "#FFE600",
                  },
                  {
                    title: "Ultimate Score Cap",
                    desc: "In matches with extreme power imbalances (CSR delta > 350), the underdog's maximum possible goals is strictly capped at 1 goal, even if Poisson outputs more. If they upset, it will be 1-0, never a high scoring draw.",
                    badge: "ACTIVE",
                    color: "#00E5FF",
                  },
                  {
                    title: "Host Cap",
                    desc: "Hosts (USA, Mexico, Canada) receive a +100 ELO moral boost. However, if the host is not an elite football nation (base ELO < 1950), their total CSR is capped at 1950, preventing unrealistic world cup runs.",
                    badge: "ACTIVE",
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
          )
        )}

        {/* ── TAB 3: DATA RELIABILITY ── */}
        {activeGuideTab === "data" && (
          isTr ? (
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
          ) : (
            <div className="space-y-6">
              <div className="border-l-4 border-[#A78BFA] pl-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                  Data Accuracy & Sources
                </h2>
                <p className="text-[11px] text-[#A78BFA] font-mono tracking-widest uppercase mt-0.5">
                  COMPREHENSIVE REAL WORLD DATA MODELING
                </p>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                The prediction engine on FollowTheWorldCup.com is not built on fictional numbers. All data feeding the simulation has been extracted, sanitized, and normalized from globally recognized databases:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3 relative">
                  <div className="w-8 h-8 rounded-full bg-[#A78BFA]/10 flex items-center justify-center text-[#A78BFA] font-mono text-xs font-bold border border-[#A78BFA]/30 mb-2">
                    01
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Historical Elo Ratings</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Active strength scores and 1-year ELO trajectory trends are extracted from the renowned <b>eloratings.net</b> portal, reflecting the true active capabilities of all 48 participating countries.
                  </p>
                </div>

                <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3 relative">
                  <div className="w-8 h-8 rounded-full bg-[#00FF87]/10 flex items-center justify-center text-[#00FF87] font-mono text-xs font-bold border border-[#00FF87]/30 mb-2">
                    02
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Transfermarkt Squad Values</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Market values for squad depth and player pool strength are retrieved from <b>Transfermarkt</b>. These values are mathematically normalized using logarithmic scaling to balance financial depth realistically without overhyping elite club squads.
                  </p>
                </div>

                <div className="bg-black/50 border border-zinc-800/80 p-5 space-y-3 relative">
                  <div className="w-8 h-8 rounded-full bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF] font-mono text-xs font-bold border border-[#00E5FF]/30 mb-2">
                    03
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Official FIFA 2026 Format</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    The tournament tree is strictly compliant with the official <b>FIFA World Cup 2026</b> layout, holding 48 teams, 12 groups, the best 8 group thirds progressing to the Round of 32, and exact tie-breaking indices.
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* ── TAB 4: HOW TO USE ── */}
        {activeGuideTab === "usage" && (
          isTr ? (
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
          ) : (
            <div className="space-y-6">
              <div className="border-l-4 border-[#FFE600] pl-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                  How to Use the Simulator
                </h2>
                <p className="text-[11px] text-[#FFE600] font-mono tracking-widest uppercase mt-0.5">
                  A COMPLETE GUIDE FOR INTERACTIVE WHAT-IF SCENARIOS
                </p>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                Using the prediction cockpit and creating your own scenarios is extremely simple. Here is a step-by-step roadmap:
              </p>

              <div className="space-y-6 pt-4 font-sans text-xs">
                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 bg-[#FFE600] text-zinc-950 font-black flex items-center justify-center shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-[13px]">Review Standings</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Go to the <b>"GROUP STANDINGS"</b> sub-tab to inspect active standing tables generated automatically by ELO and CSR strengths. Neon-green borders highlight direct qualification, while siber-cyan indicates best third candidacy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 bg-[#00FF87] text-zinc-950 font-black flex items-center justify-center shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-[13px]">Input Custom Scores (Interactive Override)</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Navigate to the <b>"FIXTURES & BRACKET"</b> sub-tab. Click any match's score box (e.g. 2:1 area). The scores transform into input forms. Write your predictions and click <b>"SAVE"</b>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 bg-[#00E5FF] text-zinc-950 font-black flex items-center justify-center shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-[13px]">Watch the Cascade Ripple Effect Live</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Upon saving, that match's group standing is computed instantly. If it affects the top 2/3rd ranking, qualified teams in downstream brackets are re-evaluated and predicted goal-by-goal down the tree within a single millisecond.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 bg-[#A78BFA] text-white font-black flex items-center justify-center shrink-0 border border-black shadow-[1.5px_1.5px_0_#000]">
                    4
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-[13px]">Re-roll or Reset</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      If you'd like to stir possibilities and see alternative universes, use the <b>"🎲 RE-ROLL PREDICTION"</b> button. To discard all custom overrides and restore default mathematical predictions, click the <b>"🔄 RESET"</b> button.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

