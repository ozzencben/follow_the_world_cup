import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTournamentStore } from "../services/useTournamentStore";
import type { MatchState } from "../services/TournamentEngine";

interface MatchCardProps {
  match: MatchState;
}

export default function MatchCard({ match }: MatchCardProps) {
  const { t, i18n } = useTranslation();
  const { teams, overrideMatchScore, resetMatch, isReadOnly } = useTournamentStore();
  const [isEditing, setIsEditing] = useState(false);

  // Retrieve team profile metadata from store
  const homeTeam = teams.find((t) => t.code.toUpperCase() === match.homeTeamCode.toUpperCase());
  const awayTeam = teams.find((t) => t.code.toUpperCase() === match.awayTeamCode.toUpperCase());

  // Current display scores
  const homeScore = match.isOverridden ? match.userHomeScore : match.simulatedHomeScore;
  const awayScore = match.isOverridden ? match.userAwayScore : match.simulatedAwayScore;

  // Local state for interactive score editing
  const [editHome, setEditHome] = useState(homeScore !== null ? homeScore : 0);
  const [editAway, setEditAway] = useState(awayScore !== null ? awayScore : 0);

  const getFlagUrl = (code: string) => {
    if (!code || code === "TBD") return "";
    // Bulletproof official FIFA square flags API
    return `https://api.fifa.com/api/v3/picture/flags-sq-1/${code.toUpperCase()}`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    overrideMatchScore(match.id, editHome, editAway);
    setIsEditing(false);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetMatch(match.id);
    setIsEditing(false);
  };

  const isHomeWinner = homeScore !== null && awayScore !== null && homeScore > awayScore;
  const isAwayWinner = homeScore !== null && awayScore !== null && awayScore > homeScore;

  const currentLang = i18n.language || "en";

  return (
    <div
      className={`relative bg-zinc-900 border-2 select-none transition-all duration-200 ${
        match.isOverridden
          ? "border-[#00FF87] shadow-[4px_4px_0px_#00FF87] -translate-x-[2px] -translate-y-[2px]"
          : "border-black hover:border-[#00E5FF] shadow-[4px_4px_0px_#1A1916] hover:shadow-[6px_6px_0px_rgba(0,229,255,0.2)]"
      }`}
      style={{ borderRadius: "0" }}
    >
      {/* Upper header ribbon indicating stage info and override badge */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-black bg-zinc-950 font-mono text-[9px] tracking-wider text-zinc-400">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 bg-[#00E5FF] rounded-full" />
          <span className="font-extrabold uppercase text-white">
            {match.stage === "GROUP"
              ? (currentLang.startsWith("tr") ? `GRUP AŞAMASI • ${match.roundId}. TUR` : `GROUP STAGE • ROUND ${match.roundId}`)
              : `${match.stage} STAGE`}
          </span>
          <span className="text-zinc-600 font-medium">|</span>
          <span className="text-zinc-500 font-bold uppercase">
            {match.stage === "GROUP"
              ? (currentLang.startsWith("tr") ? `GRUP ${match.id.split("-")[1]}` : `GROUP ${match.id.split("-")[1]}`)
              : match.id}
          </span>
        </div>

        {match.isOverridden && (
          <div className="flex items-center space-x-1.5 bg-[#00FF87]/15 border border-[#00FF87] px-2 py-0.5 animate-pulse">
            <span className="w-1.5 h-1.5 bg-[#00FF87] rounded-full animate-ping" />
            <span className="text-[#00FF87] font-black tracking-widest text-[8px] uppercase">● OVERRIDDEN</span>
          </div>
        )}
      </div>

      {/* Main card interactive area */}
      <div className="p-4 md:p-5 flex items-center justify-between relative z-10 gap-2">
        {/* HOME TEAM SECTION */}
        <div className="flex-1 flex items-center space-x-3.5">
          {/* Flag widget */}
          {homeTeam ? (
            <img
              src={getFlagUrl(homeTeam.code)}
              alt={currentLang.startsWith("tr") ? homeTeam.nameTr : homeTeam.nameEn}
              className="w-9 h-9 object-cover border-[1.5px] border-black shadow-[2px_2px_0px_#000]"
              onError={(e) => {
                // Fallback inside error boundary
                (e.target as HTMLImageElement).src = `https://placehold.co/40x40/222/00FF87?text=${homeTeam.abbr}`;
              }}
            />
          ) : (
            <div className="w-9 h-9 bg-zinc-950 border-[1.5px] border-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 font-mono tracking-widest">
              TBD
            </div>
          )}

          {/* Names and metadata */}
          <div className="flex flex-col">
            <span className={`text-xs font-black tracking-wide truncate max-w-[100px] md:max-w-[140px] ${isHomeWinner ? "text-[#00FF87] font-black" : "text-white"}`}>
              {homeTeam 
                ? (currentLang.startsWith("tr") ? homeTeam.nameTr : homeTeam.nameEn).toUpperCase() 
                : t("match.tbd_winner")}
            </span>
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
              {homeTeam ? `CSR: ${Math.round(homeTeam.rating)}` : t("match.waiting_match")}
            </span>
          </div>
        </div>

        {/* CLICKABLE INTERACTIVE SCORES AREA */}
        <div className="shrink-0 flex items-center justify-center px-2">
          {isEditing ? (
            <form onSubmit={handleSave} className="flex items-center space-x-2 bg-black border-[1.5px] border-[#00E5FF] p-1.5 shadow-[2px_2px_0px_rgba(0,229,255,0.2)]">
              <input
                type="number"
                min="0"
                max="9"
                value={editHome}
                onChange={(e) => setEditHome(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-8 h-8 text-center bg-zinc-900 border border-zinc-700 text-white font-mono font-black text-sm focus:border-[#00FF87] focus:outline-none"
                style={{ borderRadius: "0" }}
                required
              />
              <span className="text-zinc-500 font-mono font-bold text-xs">-</span>
              <input
                type="number"
                min="0"
                max="9"
                value={editAway}
                onChange={(e) => setEditAway(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-8 h-8 text-center bg-zinc-900 border border-zinc-700 text-white font-mono font-black text-sm focus:border-[#00FF87] focus:outline-none"
                style={{ borderRadius: "0" }}
                required
              />
              <button
                type="submit"
                className="p-1.5 bg-[#00FF87] hover:bg-[#00D06E] text-black font-black font-mono text-[9px] border border-black shadow-[1px_1px_0px_#000]"
                style={{ borderRadius: "0" }}
              >
                {t("match.save")}
              </button>
            </form>
          ) : (
            <div
              onClick={() => {
                if (!isReadOnly && match.homeTeamCode !== "TBD" && match.awayTeamCode !== "TBD") {
                  setEditHome(homeScore !== null ? homeScore : 0);
                  setEditAway(awayScore !== null ? awayScore : 0);
                  setIsEditing(true);
                }
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 transition-colors ${
                isReadOnly
                  ? "cursor-not-allowed opacity-80"
                  : match.homeTeamCode !== "TBD" && match.awayTeamCode !== "TBD"
                  ? "cursor-pointer hover:border-[#00FF87] hover:bg-black"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <span className={`font-mono text-base font-black tracking-tight ${match.isOverridden ? "text-[#00FF87]" : "text-white"}`}>
                {homeScore !== null ? homeScore : "-"}
              </span>
              <span className="text-zinc-600 font-mono font-bold text-xs">:</span>
              <span className={`font-mono text-base font-black tracking-tight ${match.isOverridden ? "text-[#00FF87]" : "text-white"}`}>
                {awayScore !== null ? awayScore : "-"}
              </span>
            </div>
          )}
        </div>

        {/* AWAY TEAM SECTION */}
        <div className="flex-1 flex items-center justify-end space-x-3.5 text-right">
          {/* Names and metadata */}
          <div className="flex flex-col items-end">
            <span className={`text-xs font-black tracking-wide truncate max-w-[100px] md:max-w-[140px] ${isAwayWinner ? "text-[#00FF87] font-black" : "text-white"}`}>
              {awayTeam 
                ? (currentLang.startsWith("tr") ? awayTeam.nameTr : awayTeam.nameEn).toUpperCase() 
                : t("match.tbd_winner")}
            </span>
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
              {awayTeam ? `CSR: ${Math.round(awayTeam.rating)}` : t("match.waiting_match")}
            </span>
          </div>

          {/* Flag widget */}
          {awayTeam ? (
            <img
              src={getFlagUrl(awayTeam.code)}
              alt={currentLang.startsWith("tr") ? awayTeam.nameTr : awayTeam.nameEn}
              className="w-9 h-9 object-cover border-[1.5px] border-black shadow-[2px_2px_0px_#000]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/40x40/222/00FF87?text=${awayTeam.abbr}`;
              }}
            />
          ) : (
            <div className="w-9 h-9 bg-zinc-950 border-[1.5px] border-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 font-mono tracking-widest">
              TBD
            </div>
          )}
        </div>
      </div>

      {/* Floating reset hover buttons to discard overrides */}
      {match.isOverridden && !isEditing && !isReadOnly && (
        <button
          onClick={handleReset}
          className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF2D78] hover:bg-[#D8105B] border border-black flex items-center justify-center text-white font-extrabold text-[9px] shadow-[1.5px_1.5px_0_#000] cursor-pointer"
          style={{ borderRadius: "0" }}
          title={t("match.restore_tooltip")}
        >
          ✖
        </button>
      )}
    </div>
  );
}
