import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";

interface TeamEloData {
  localRank: number;
  globalRank: number;
  code: string;
  nameEn: string;
  nameTr: string;
  confederation: string;
  rating: number;
  peakRank: number;
  peakRating: number;
  avgRank: number;
  avgRating: number;
  lowRank: number;
  lowRating: number;
  oneYearRankChange: string;
  oneYearRatingChange: string;
  matchesTotal: number;
  matchesHome: number;
  matchesAway: number;
  matchesNeutral: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  winRate: number;
  goalsForAvg: number;
  goalsAgainstAvg: number;
  squadValue: number;
  averageAge: number;
  playerCount: number;
}

interface EloPageProps {
  onSelectTeam: (teamName: string) => void;
}

const normalizeName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace("and", "");
};

const CONF_COLORS: Record<string, string> = {
  UEFA:     "#00E5FF",
  CONMEBOL: "#00FF87",
  CONCACAF: "#FFE600",
  CAF:      "#FF6B00",
  AFC:      "#FF2D78",
  OFC:      "#8C8A84",
};

export default function EloPage({ onSelectTeam }: EloPageProps) {
  const { t, i18n } = useTranslation();
  const isTr = (i18n.language || "en").startsWith("tr");

  const [eloData, setEloData] = useState<TeamEloData[]>([]);
  const [fifaTeams, setFifaTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConfederation, setSelectedConfederation] = useState("ALL");
  const [sortBy, setSortBy] = useState<"localRank" | "rating" | "squadValue">("localRank");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<TeamEloData[]>("/elo/ratings"),
      api.get<{ teams: any[] }>("/teams"),
    ])
      .then(([eloRes, teamsRes]) => {
        setEloData(eloRes.data);
        setFifaTeams(teamsRes.data.teams || []);
      })
      .catch(() => setError(isTr ? "Elo verileri yüklenirken bir hata oluştu." : "An error occurred while loading ELO data."))
      .finally(() => setLoading(false));
  }, []);

  const getTeamFlag = (nameEn: string) => {
    const team = fifaTeams.find(
      t => normalizeName(t.teamName) === normalizeName(nameEn)
    );
    return team?.teamFlag ? team.teamFlag.replace("{format}", "sq").replace("{size}", "1") : "";
  };

  const sortedData = useMemo(() => {
    const filtered = eloData.filter(team => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = team.nameTr.toLowerCase().includes(q) || team.nameEn.toLowerCase().includes(q) || team.code.toLowerCase().includes(q);
      const matchesConf = selectedConfederation === "ALL" || team.confederation === selectedConfederation;
      return matchesSearch && matchesConf;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "squadValue") return b.squadValue - a.squadValue;
      return a.localRank - b.localRank;
    });
  }, [eloData, searchQuery, selectedConfederation, sortBy]);

  const parseChange = (s: string) => {
    const clean = s.trim().replace("−", "-");
    const n = parseFloat(clean.replace("+", ""));
    return { n, isPos: n > 0, isNeg: n < 0, text: Math.abs(n).toString() };
  };

  const maxEloTeam = useMemo(() => {
    return eloData.length > 0 ? [...eloData].sort((a, b) => b.rating - a.rating)[0] : null;
  }, [eloData]);

  const bestWinRateTeam = useMemo(() => {
    return eloData.length > 0 ? [...eloData].sort((a, b) => b.winRate - a.winRate)[0] : null;
  }, [eloData]);
  const mostMatchesTeam = eloData.length > 0 ? [...eloData].sort((a, b) => b.matchesTotal - a.matchesTotal)[0] : null;

  return (
    <div className="space-y-8 animate-fade-up" style={{ color: "#1A1916" }}>

      {/* ══ PAGE HEADER ════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden p-6 md:p-10"
        style={{ background: "#1A1916", border: "1.5px solid #1A1916", boxShadow: "6px 6px 0 #00FF87" }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "#00FF87", boxShadow: "0 0 12px #00FF87" }} />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="neon-badge neon-badge-green">ELO RATING</span>
              <span className="neon-badge neon-badge-cyan">{isTr ? "TM DEĞER" : "TM VALUE"}</span>
              <span className="neon-badge neon-badge-yellow animate-neon-pulse">v2.1</span>
            </div>
            <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-0.03em", color: "#F8F7F2", lineHeight: 1.1 }}>
              {isTr ? "DÜNYA KUPASI" : "WORLD CUP"}
              <br />
              <span style={{ color: "#00FF87", textShadow: "0 0 20px rgba(0,255,135,0.3)" }}>{isTr ? "GÜÇ DERBİSİ" : "POWER DERBY"}</span>
            </h1>
            <p style={{ color: "#8C8A84", fontSize: "0.72rem", fontWeight: 500, lineHeight: 1.7, maxWidth: "48ch" }}>
              {isTr
                ? "Tarihsel Elo Güç Dereceleri ve Transfermarkt Kadro Değerlerini bir arada inceleyin. Finansal güç ile sahadaki gerçek performansı karşılaştırın."
                : "Compare Historical ELO Power Ratings and Transfermarkt Squad Values. Contrast financial power with real on-pitch performance."}
            </p>
          </div>

          {/* Stat highlights */}
          <div className="flex gap-6 shrink-0">
            {[
              { num: eloData.length.toString(), label: isTr ? "Takım" : "Teams" },
              { num: "48", label: isTr ? "Turnuva" : "Tournament" },
              { num: "ELO", label: isTr ? "Metrik" : "Metric" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", fontWeight: 900, color: "#00FF87", letterSpacing: "-0.04em", textShadow: "0 0 16px rgba(0,255,135,0.25)", fontVariantNumeric: "tabular-nums" }}>
                  {s.num}
                </div>
                <div className="swiss-label" style={{ color: "#5C5A54" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ STAT CARDS ═════════════════════════════════════════ */}
      {!loading && eloData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "👑",
              label: isTr ? "Zirvedeki Takım (ELO)" : "Top Team (ELO)",
              name: isTr ? maxEloTeam?.nameTr : maxEloTeam?.nameEn,
              value: isTr ? `${maxEloTeam?.rating} Puan` : `${maxEloTeam?.rating} Points`,
              accent: "#00FF87",
              teamName: maxEloTeam?.nameEn,
            },
            {
              icon: "📈",
              label: isTr ? "En Yüksek Galibiyet Oranı" : "Highest Win Rate",
              name: isTr ? bestWinRateTeam?.nameTr : bestWinRateTeam?.nameEn,
              value: `%${bestWinRateTeam?.winRate}`,
              accent: "#00E5FF",
              teamName: bestWinRateTeam?.nameEn,
            },
            {
              icon: "🏟️",
              label: isTr ? "En Çok Maç Yapan" : "Most Matches Played",
              name: isTr ? mostMatchesTeam?.nameTr : mostMatchesTeam?.nameEn,
              value: isTr ? `${mostMatchesTeam?.matchesTotal} Maç` : `${mostMatchesTeam?.matchesTotal} Matches`,
              accent: "#FFE600",
              teamName: mostMatchesTeam?.nameEn,
            },
          ].map((card, i) => (
            <div
              key={i}
              className="retro-card p-5 cursor-pointer"
              style={{ background: "#F8F7F2" }}
              onClick={() => card.teamName && onSelectTeam(card.teamName)}
            >
              <div className="flex items-start gap-3">
                <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>{card.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="swiss-label mb-1">{card.label}</div>
                  <div style={{ fontWeight: 900, fontSize: "0.85rem", color: "#1A1916", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.name}</div>
                  <div style={{ fontWeight: 900, fontSize: "0.7rem", color: card.accent, textShadow: `0 0 8px ${card.accent}55`, marginTop: 2 }}>
                    {card.value}
                  </div>
                </div>
              </div>
              {/* Neon bottom accent */}
              <div style={{ height: 2, background: card.accent, boxShadow: `0 0 6px ${card.accent}`, marginTop: 12 }} />
            </div>
          ))}
        </div>
      )}

      {/* ══ FILTER BAR ═════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4"
          style={{ background: "#F2F0E8", border: "1.5px solid #1A1916" }}
        >
          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder={isTr ? "Takım adı veya kod ara..." : "Search team name or code..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="swiss-input"
                style={{ paddingLeft: "36px", borderRadius: 0 }}
              />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8C8A84", fontSize: "0.75rem", pointerEvents: "none" }}>⌕</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="swiss-label">{isTr ? "Sıralama:" : "Sort:"}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="swiss-input"
                style={{ width: "auto", paddingTop: 8, paddingBottom: 8, borderRadius: 0, cursor: "pointer" }}
              >
                <option value="localRank">{isTr ? "ELO Turnuva Sırası" : "ELO Tournament Rank"}</option>
                <option value="rating">{isTr ? "ELO Puanı" : "ELO Points"}</option>
                <option value="squadValue">{isTr ? "Kadro Değeri" : "Squad Value"}</option>
              </select>
            </div>
          </div>

          {/* Confederation tabs */}
          <div className="flex flex-wrap gap-2">
            {["ALL", "UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"].map(conf => {
              const active = selectedConfederation === conf;
              const color = conf === "ALL" ? "#1A1916" : CONF_COLORS[conf] ?? "#1A1916";
              return (
                <button
                  key={conf}
                  onClick={() => setSelectedConfederation(conf)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.55rem",
                    fontWeight: 900,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    border: `1.5px solid ${active ? color : "#E0DDD0"}`,
                    background: active ? color : "transparent",
                    color: active ? (conf === "ALL" ? "#00FF87" : "#1A1916") : "#5C5A54",
                    cursor: "pointer",
                    boxShadow: active ? `2px 2px 0 ${active && conf !== "ALL" ? "rgba(0,0,0,0.15)" : "rgba(0,255,135,0.3)"}` : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {conf === "ALL" ? (isTr ? "TÜMÜ" : "ALL") : conf}
                </button>
              );
            })}
          </div>
        </div>

      {/* ══ DATA TABLE ═════════════════════════════════════════ */}
      <div style={{ border: "1.5px solid #1A1916", background: "#F8F7F2", overflow: "hidden" }}>
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div style={{ width: 36, height: 36, border: "3px solid #00FF87", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            <p className="swiss-label animate-retro-blink">{isTr ? "Veriler Yükleniyor..." : "Data Loading..."}</p>
          </div>
        ) : error ? (
          <div className="py-24 text-center space-y-2">
            <div style={{ fontSize: "2rem" }}>⚠️</div>
            <p className="swiss-label" style={{ color: "#E53E3E" }}>{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ maxHeight: "70vh" }}>
            <table className="w-full border-collapse" style={{ minWidth: 1200 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr style={{ background: "#1A1916", borderBottom: "2px solid #1A1916" }}>
                  {[
                    { label: "#",              span: 2, width: "80px"  },
                    { label: isTr ? "Milli Takım" : "National Team", span: 1, width: "200px" },
                    { label: isTr ? "ELO / Değer" : "ELO / Value",   span: 2, width: "200px" },
                    { label: isTr ? "Tarihsel Ort." : "Historical Avg",  span: 2, width: "140px" },
                    { label: isTr ? "1 Yıl Değişim" : "1-Year Change", span: 2, width: "140px" },
                    { label: isTr ? "Maç Dağılımı" : "Match Breakdown",  span: 4, width: "200px" },
                    { label: "W / L / D",     span: 3, width: "150px" },
                    { label: isTr ? "Goller" : "Goals",        span: 3, width: "150px" },
                  ].map((h, i) => (
                    <th
                       key={i}
                       colSpan={h.span}
                       style={{
                         padding: "12px 8px",
                         fontSize: "0.5rem",
                         fontWeight: 900,
                         letterSpacing: "0.2em",
                         textTransform: "uppercase",
                         color: "#5C5A54",
                         textAlign: "center",
                         borderRight: "1px solid rgba(255,255,255,0.05)",
                         whiteSpace: "nowrap",
                       }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
                <tr style={{ background: "#2C2A26", borderBottom: "1px solid #1A1916" }}>
                  {[
                    isTr ? "Yerel" : "Local", isTr ? "Genel" : "Global",
                    isTr ? "Takım Adı" : "Team Name",
                    isTr ? "ELO Puanı" : "ELO Points", isTr ? "Kadro €" : "Squad €",
                    isTr ? "Ort. Sıra" : "Avg Rank", isTr ? "Ort. Puan" : "Avg Points",
                    isTr ? "Δ Sıra" : "Δ Rank", isTr ? "Δ Puan" : "Δ Points",
                    isTr ? "Toplam" : "Total", isTr ? "Ev" : "Home", isTr ? "Dep." : "Away", isTr ? "Tar." : "Neu.",
                    isTr ? "Gali." : "Wins", isTr ? "Mağl." : "Losses", isTr ? "Ber." : "Draws",
                    isTr ? "Atılan" : "For", isTr ? "Yenilen" : "Against", isTr ? "Ort." : "Avg",
                  ].map((col, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "8px 6px",
                        fontSize: "0.48rem",
                        fontWeight: 900,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "#8C8A84",
                        textAlign: "center",
                        borderRight: "1px solid rgba(255,255,255,0.04)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((team, idx) => {
                  const flagUrl = getTeamFlag(team.nameEn);
                  const isTr = team.code === "TR";
                  const rankChange = parseChange(team.oneYearRankChange);
                  const ratingChange = parseChange(team.oneYearRatingChange);
                  const confColor = CONF_COLORS[team.confederation] ?? "#8C8A84";

                  return (
                    <tr
                      key={team.code}
                      onClick={() => onSelectTeam(team.nameEn)}
                      style={{
                        borderBottom: "1px solid #EAE7DA",
                        cursor: "pointer",
                        background: isTr ? "rgba(0,255,135,0.03)" : idx % 2 === 0 ? "#F8F7F2" : "#F2F0E8",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,255,135,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.background = isTr ? "rgba(0,255,135,0.03)" : idx % 2 === 0 ? "#F8F7F2" : "#F2F0E8")}
                    >
                      {/* Sıra */}
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.7rem", fontWeight: 900, color: team.localRank <= 3 ? "#00C060" : "#5C5A54", fontVariantNumeric: "tabular-nums" }}>
                        {team.localRank <= 3 ? ["🥇","🥈","🥉"][team.localRank - 1] : team.localRank}
                      </td>
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.65rem", fontWeight: 600, color: "#8C8A84", fontVariantNumeric: "tabular-nums" }}>
                        {team.globalRank}
                      </td>

                      {/* Takım */}
                      <td style={{ padding: "11px 8px" }}>
                        <div className="flex items-center gap-2">
                          {flagUrl
                            ? <img src={flagUrl} alt={isTr ? team.nameTr : team.nameEn} style={{ width: 22, height: 14, objectFit: "cover", border: "1px solid #E0DDD0", flexShrink: 0 }} />
                            : <span style={{ fontSize: "0.8rem" }}>🏳️</span>
                          }
                          <div className="flex flex-col leading-none">
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: isTr ? "#00C060" : "#1A1916", whiteSpace: "nowrap" }}>{isTr ? team.nameTr : team.nameEn}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span style={{ fontSize: "0.5rem", fontWeight: 900, color: "#8C8A84", letterSpacing: "0.12em" }}>{team.code}</span>
                              <span style={{ fontSize: "0.45rem", fontWeight: 900, color: confColor, letterSpacing: "0.1em", padding: "1px 4px", border: `1px solid ${confColor}30`, background: `${confColor}08` }}>
                                {team.confederation}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ELO */}
                      <td style={{ padding: "11px 8px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#1A1916", letterSpacing: "-0.02em" }}>{team.rating}</div>
                      </td>

                      {/* Kadro Değeri */}
                      <td style={{ padding: "11px 8px", textAlign: "center" }}>
                        <span style={{
                          fontSize: "0.68rem",
                          fontWeight: 900,
                          color: team.squadValue > 0 ? "#00C060" : "#8C8A84",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {team.squadValue > 0 ? `${team.squadValue.toLocaleString("tr-TR")} M€` : "—"}
                        </span>
                      </td>

                      {/* Ortalama */}
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.65rem", color: "#5C5A54", fontVariantNumeric: "tabular-nums" }}>{team.avgRank}</td>
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.65rem", color: "#5C5A54", fontVariantNumeric: "tabular-nums" }}>{team.avgRating}</td>

                      {/* 1Y Değişim */}
                      <td style={{ padding: "11px 6px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 900, color: rankChange.isPos ? "#00C060" : rankChange.isNeg ? "#E53E3E" : "#8C8A84", fontVariantNumeric: "tabular-nums" }}>
                          {rankChange.isPos ? "▲" : rankChange.isNeg ? "▼" : ""}{rankChange.text}
                        </span>
                      </td>
                      <td style={{ padding: "11px 6px", textAlign: "center" }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 900, color: ratingChange.isPos ? "#00C060" : ratingChange.isNeg ? "#E53E3E" : "#8C8A84", fontVariantNumeric: "tabular-nums" }}>
                          {ratingChange.isPos ? "▲" : ratingChange.isNeg ? "▼" : ""}{ratingChange.text}
                        </span>
                      </td>

                      {/* Maçlar */}
                      {[team.matchesTotal, team.matchesHome, team.matchesAway, team.matchesNeutral].map((v, i) => (
                        <td key={i} style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.65rem", color: i === 0 ? "#1A1916" : "#5C5A54", fontWeight: i === 0 ? 800 : 500, fontVariantNumeric: "tabular-nums" }}>{v}</td>
                      ))}

                      {/* W/L/D */}
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.7rem", fontWeight: 900, color: "#00C060", fontVariantNumeric: "tabular-nums" }}>{team.wins}</td>
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.7rem", fontWeight: 900, color: "#E53E3E", fontVariantNumeric: "tabular-nums" }}>{team.losses}</td>
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.65rem", fontWeight: 600, color: "#5C5A54", fontVariantNumeric: "tabular-nums" }}>{team.draws}</td>

                      {/* Goller */}
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.65rem", fontWeight: 800, color: "#1A1916", fontVariantNumeric: "tabular-nums" }}>{team.goalsFor}</td>
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.65rem", fontWeight: 500, color: "#5C5A54", fontVariantNumeric: "tabular-nums" }}>{team.goalsAgainst}</td>
                      <td style={{ padding: "11px 6px", textAlign: "center", fontSize: "0.65rem", fontWeight: 700, color: "#1A1916", fontVariantNumeric: "tabular-nums" }}>{team.goalsForAvg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {!loading && !error && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "1.5px solid #1A1916", background: "#F2F0E8" }}
          >
            <span className="swiss-label">{isTr ? `${sortedData.length} takım gösteriliyor` : `Showing ${sortedData.length} teams`}</span>
            <div className="flex items-center gap-4">
              <span className="neon-badge neon-badge-green">{isTr ? "CANLI VERİ" : "LIVE DATA"}</span>
              <span className="swiss-label">{isTr ? "Kaynak: eloratings.net + Transfermarkt" : "Source: eloratings.net + Transfermarkt"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
