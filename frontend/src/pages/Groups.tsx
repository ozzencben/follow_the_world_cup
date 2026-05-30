import { useEffect, useState } from "react";
import api from "../services/api";

interface TeamEnrichmentData {
  teamId: string;
  primaryColor: string;
  secondaryColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
}

interface Team {
  teamId: string;
  teamName: string;
  teamFlag: string;
  teamPageUrl: string;
  confederationId: string;
  stage: string;
  worldRanking: number;
  appearances: number;
  hostTeam: boolean;
  teamEnrichmentData: TeamEnrichmentData;
  squadStats?: {
    groupPlayed: number;
    groupPosition: number;
    groupGoalsDifference: number;
    groupPoints: number;
    abbr: string;
    seed: number;
  };
}

interface SquadTeam {
  id: number;
  name: string;
  abbr: string;
  seed: number;
  isActive: boolean;
  group: string;
  groupPlayed: number;
  groupPosition: number;
  groupGoalsDifference: number;
  groupPoints: number;
  worldRank: number;
}

interface FifaDataResponse {
  entryId: string;
  seasonId: string;
  tournamentState: string;
  teams: Team[];
  teamsTotal: number;
}

interface GroupedTeams {
  [groupName: string]: Team[];
}

interface GroupsProps {
  onSelectTeam: (teamName: string) => void;
}

// One distinct neon/retro color per group (A→L)
const GROUP_ACCENTS = [
  "#00FF87", "#00E5FF", "#FFE600", "#FF6B00",
  "#FF2D78", "#A78BFA", "#34D399", "#F472B6",
  "#60A5FA", "#FBBF24", "#4ADE80", "#C084FC",
];

const normalizeName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace("and", "");
};

export default function Groups({ onSelectTeam }: GroupsProps) {
  const [groupedTeams, setGroupedTeams] = useState<GroupedTeams>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<FifaDataResponse>("/teams"),
      api.get<SquadTeam[]>("/squads"),
    ])
      .then(([teamsRes, squadsRes]) => {
        const teamsList = teamsRes.data.teams;
        const squadsMap: { [k: string]: SquadTeam } = {};
        squadsRes.data.forEach(s => {
          squadsMap[normalizeName(s.name)] = s;
        });

        const groups: GroupedTeams = {};
        teamsList.forEach(team => {
          const groupName = team.stage || "Belirsiz";
          if (!groups[groupName]) groups[groupName] = [];
          const sq = squadsMap[normalizeName(team.teamName)];
          groups[groupName].push({
            ...team,
            squadStats: sq
              ? { groupPlayed: sq.groupPlayed, groupPosition: sq.groupPosition, groupGoalsDifference: sq.groupGoalsDifference, groupPoints: sq.groupPoints, abbr: sq.abbr, seed: sq.seed }
              : { groupPlayed: 0, groupPosition: 4, groupGoalsDifference: 0, groupPoints: 0, abbr: team.teamName.substring(0, 3).toUpperCase(), seed: 4 },
          });
        });

        Object.keys(groups).forEach(key => {
          groups[key].sort((a, b) => {
            const pa = a.squadStats?.groupPosition || 4;
            const pb = b.squadStats?.groupPosition || 4;
            return pa !== pb ? pa - pb : a.teamName.localeCompare(b.teamName);
          });
        });

        const sortedGroups: GroupedTeams = {};
        Object.keys(groups).sort().forEach(key => { sortedGroups[key] = groups[key]; });
        setGroupedTeams(sortedGroups);
        setError(null);
      })
      .catch(err => setError(err.message || "Grup verileri yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-fade-up" style={{ color: "#1A1916" }}>

      {/* ══ PAGE HEADER ══ */}
      <div
        className="relative overflow-hidden p-6 md:p-10"
        style={{ background: "#1A1916", border: "1.5px solid #1A1916", boxShadow: "6px 6px 0 #00E5FF" }}
      >
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "#00E5FF", boxShadow: "0 0 12px #00E5FF" }} />

        <div className="relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="neon-badge neon-badge-cyan">12 GRUP</span>
              <span className="neon-badge neon-badge-green">48 TAKIM</span>
            </div>
            <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#F8F7F2", lineHeight: 1.1 }}>
              GRUPLAR &amp;
              <br />
              <span style={{ color: "#00E5FF", textShadow: "0 0 20px rgba(0,229,255,0.3)" }}>PUAN DURUMU</span>
            </h1>
            <p style={{ color: "#8C8A84", fontSize: "0.72rem", fontWeight: 500, lineHeight: 1.7, maxWidth: "44ch" }}>
              48 milli takımın A'dan L'ye 12 gruptaki güncel puan durumları,
              sıralamalar ve istatistikler.
            </p>
          </div>

          <a
            href="#/teams"
            onClick={e => { e.preventDefault(); window.location.hash = "#/teams"; }}
            className="swiss-btn-secondary shrink-0"
            style={{ color: "#F8F7F2", borderColor: "rgba(255,255,255,0.2)", boxShadow: "3px 3px 0 rgba(255,255,255,0.1)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            ← Tüm Takımları Gör
          </a>
        </div>
      </div>

      {/* ══ LOADING / ERROR ══ */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4"
          style={{ border: "1.5px solid #1A1916", background: "#F2F0E8" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #00E5FF", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p className="swiss-label animate-retro-blink" style={{ color: "#5C5A54" }}>Grup Tabloları Oluşturuluyor...</p>
        </div>
      )}

      {!loading && error && (
        <div className="p-12 text-center" style={{ border: "1.5px solid #E53E3E", background: "#FFF5F5" }}>
          <div style={{ fontSize: "2.5rem" }}>⚠️</div>
          <h4 style={{ fontWeight: 900, fontSize: "1rem", color: "#E53E3E", marginTop: 12 }}>Grup Verileri Yüklenemedi</h4>
          <p style={{ fontSize: "0.7rem", color: "#E53E3E", marginTop: 6 }}>{error}</p>
        </div>
      )}

      {/* ══ GROUP CARDS GRID ══ */}
      {!loading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Object.entries(groupedTeams).map(([groupName, teams], groupIdx) => {
            const accent = GROUP_ACCENTS[groupIdx % GROUP_ACCENTS.length];
            const letter = groupName.replace("Group ", "").replace("Grup ", "");

            return (
              <div
                key={groupName}
                style={{
                  border: "1.5px solid #1A1916",
                  boxShadow: `4px 4px 0 ${accent}60`,
                  background: "#F8F7F2",
                  overflow: "hidden",
                }}
              >
                {/* Group title bar */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ background: "#1A1916", borderBottom: `2px solid ${accent}` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        color: accent,
                        textShadow: `0 0 12px ${accent}`,
                        lineHeight: 1,
                      }}
                    >
                      {letter}
                    </span>
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.05em", color: "#F8F7F2" }}>
                        {groupName.replace("Group", "Grup")}
                      </div>
                      <div className="swiss-label" style={{ color: "#5C5A54" }}>FIFA Dünya Kupası 2026</div>
                    </div>
                  </div>
                  <span className="neon-badge" style={{ color: accent, borderColor: `${accent}60`, background: `${accent}10`, fontSize: "0.45rem" }}>
                    {teams.length} TAKIM
                  </span>
                </div>

                {/* Table */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#F2F0E8", borderBottom: "1px solid #E0DDD0" }}>
                      {["#", "Takım", "OM", "G", "B", "M", "AG", "YG", "A", "P"].map((col, i) => (
                        <th
                          key={i}
                          style={{
                            padding: "8px 6px",
                            fontSize: "0.48rem",
                            fontWeight: 900,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: col === "P" ? accent : "#8C8A84",
                            textAlign: i === 1 ? "left" : "center",
                            paddingLeft: i === 0 ? 16 : 6,
                            paddingRight: i === 9 ? 16 : 6,
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, index) => {
                      const flagUrl = team.teamFlag.replace("{format}", "sq").replace("{size}", "1");
                      const isPromoted = index < 2;
                      const isLast = index === teams.length - 1;

                      return (
                        <tr
                          key={team.teamId}
                          onClick={() => onSelectTeam(team.teamName)}
                          style={{
                            borderBottom: isLast ? "none" : "1px solid #EAE7DA",
                            cursor: "pointer",
                            background: isPromoted ? `${accent}06` : "transparent",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = `${accent}12`)}
                          onMouseLeave={e => (e.currentTarget.style.background = isPromoted ? `${accent}06` : "transparent")}
                        >
                          {/* Rank */}
                          <td style={{ padding: "12px 6px 12px 16px", position: "relative" }}>
                            {isPromoted && (
                              <div style={{
                                position: "absolute",
                                left: 6,
                                top: 6,
                                bottom: 6,
                                width: 2,
                                background: accent,
                                boxShadow: `0 0 4px ${accent}`,
                              }} />
                            )}
                            <span style={{
                              fontSize: "0.7rem",
                              fontWeight: 900,
                              color: isPromoted ? accent : "#8C8A84",
                              fontVariantNumeric: "tabular-nums",
                            }}>
                              {index + 1}
                            </span>
                          </td>

                          {/* Team name */}
                          <td style={{ padding: "12px 6px" }}>
                            <div className="flex items-center gap-2">
                              <img
                                src={flagUrl}
                                alt={team.teamName}
                                style={{ width: 20, height: 13, objectFit: "cover", border: "1px solid #E0DDD0", flexShrink: 0 }}
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                              <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#1A1916", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                                {team.teamName}
                              </span>
                              {team.hostTeam && (
                                <span style={{ fontSize: "0.42rem", fontWeight: 900, letterSpacing: "0.1em", color: "#FFE600", border: "1px solid #FFE60050", padding: "1px 4px", flexShrink: 0 }}>
                                  EV
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Stats */}
                          {[
                            team.squadStats?.groupPlayed ?? 0,
                            0, 0, 0, // G B M (turnuva başlamadı)
                            0, // AG
                            0, // YG
                            team.squadStats?.groupGoalsDifference ?? 0,
                          ].map((val, i) => (
                            <td key={i} style={{ padding: "12px 6px", textAlign: "center", fontSize: "0.68rem", fontWeight: i === 0 ? 800 : 500, color: "#5C5A54", fontVariantNumeric: "tabular-nums" }}>
                              {val}
                            </td>
                          ))}

                          {/* Points */}
                          <td style={{ padding: "12px 16px 12px 6px", textAlign: "center" }}>
                            <span style={{
                              fontSize: "0.78rem",
                              fontWeight: 900,
                              color: accent,
                              textShadow: `0 0 6px ${accent}60`,
                              fontVariantNumeric: "tabular-nums",
                            }}>
                              {team.squadStats?.groupPoints ?? 0}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Promotion hint */}
                <div
                  className="flex items-center gap-2 px-4 py-2"
                  style={{ borderTop: "1px solid #EAE7DA", background: "#F2F0E8" }}
                >
                  <div style={{ width: 2, height: 10, background: accent, boxShadow: `0 0 4px ${accent}`, flexShrink: 0 }} />
                  <span className="swiss-label">İlk 2 takım tur atlar</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
