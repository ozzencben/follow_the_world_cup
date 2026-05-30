import { useEffect, useState, useMemo } from "react";
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
    abbr: string;
    seed: number;
  };
}

interface SquadTeam {
  name: string;
  abbr: string;
  seed: number;
}

interface FifaDataResponse {
  entryId: string;
  seasonId: string;
  tournamentState: string;
  teams: Team[];
  teamsTotal: number;
}

interface TeamsProps {
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

export default function Teams({ onSelectTeam }: TeamsProps) {
  const [fifaData, setFifaData] = useState<FifaDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterConfederation, setFilterConfederation] = useState<string>("ALL");

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
        const enrichedTeams = teamsList.map(team => {
          const squad = squadsMap[normalizeName(team.teamName)];
          return { ...team, squadStats: squad ? { abbr: squad.abbr, seed: squad.seed } : undefined };
        });
        setFifaData({ ...teamsRes.data, teams: enrichedTeams });
        setError(null);
      })
      .catch(err => setError(err.message || "Milli takımlar verisi yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const allTeams = fifaData?.teams || [];
  const filteredTeams = useMemo(() => {
    return allTeams.filter(t =>
      filterConfederation === "ALL" ? true : t.confederationId === filterConfederation
    );
  }, [allTeams, filterConfederation]);

  const hostTeams = useMemo(() => filteredTeams.filter(t => t.hostTeam), [filteredTeams]);
  const qualifiedTeams = useMemo(() => filteredTeams.filter(t => !t.hostTeam), [filteredTeams]);
  const confederations = ["ALL", "UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-fade-up"
        style={{ border: "1.5px solid #1A1916", background: "#F2F0E8" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #00FF87", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p className="swiss-label animate-retro-blink" style={{ color: "#5C5A54" }}>Katılımcı Ülkeler Yükleniyor...</p>
      </div>
    );
  }

  if (error || !fifaData) {
    return (
      <div className="p-12 text-center animate-fade-up" style={{ border: "1.5px solid #E53E3E", background: "#FFF5F5" }}>
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h4 style={{ fontWeight: 900, fontSize: "1rem", color: "#E53E3E", marginTop: 12, letterSpacing: "0.02em" }}>Veri Bağlantı Hatası</h4>
        <p style={{ fontSize: "0.7rem", color: "#E53E3E", marginTop: 6 }}>{error || "Veritabanına ulaşılamadı."}</p>
      </div>
    );
  }


  const renderTeamCard = (team: Team) => {
    const flagUrl = team.teamFlag.replace("{format}", "sq").replace("{size}", "2");
    const cardBg = team.teamEnrichmentData.primaryColor || "#1A1916";
    const cardText = team.teamEnrichmentData.primaryTextColor || "#FFFFFF";
    const confColor = CONF_COLORS[team.confederationId] ?? "#8C8A84";

    return (
      <div
        key={team.teamId}
        onClick={() => onSelectTeam(team.teamName)}
        className="retro-card cursor-pointer overflow-hidden flex flex-col"
        style={{ height: 200, background: "#F8F7F2" }}
      >
        {/* Branded top half */}
        <div className="relative flex flex-col justify-between p-4 flex-grow" style={{ backgroundColor: cardBg }}>
          {/* Diagonal slash overlay */}
          <div className="absolute right-0 top-0 bottom-0 w-1/4"
            style={{ background: "rgba(255,255,255,0.04)", transform: "skewX(-8deg)", transformOrigin: "top right" }} />

          {/* Top row: flag + badges */}
          <div className="flex items-start justify-between relative z-10">
            <img
              src={flagUrl} alt={team.teamName}
              style={{ width: 36, height: 36, objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.2)" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="flex gap-1 items-center">
              {team.squadStats?.seed && (
                <span style={{
                  fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: cardText, border: `1px solid ${cardText}40`, background: `${cardText}12`, padding: "2px 6px",
                }}>
                  {team.squadStats.seed}. TORBA
                </span>
              )}
              {team.hostTeam && (
                <span style={{
                  fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "#FFE600", border: "1px solid #FFE60060", background: "rgba(255,230,0,0.1)", padding: "2px 6px",
                }}>
                  EV SAHİBİ
                </span>
              )}
            </div>
          </div>

          {/* Name block */}
          <div className="relative z-10 mt-3">
            <div style={{ fontSize: "0.48rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: confColor, marginBottom: 3 }}>
              {team.confederationId}
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "-0.01em", color: cardText, lineHeight: 1.2 }}>
              {team.teamName}
              {team.squadStats?.abbr && (
                <span style={{ fontSize: "0.55rem", fontWeight: 700, opacity: 0.6, marginLeft: 5 }}>({team.squadStats.abbr})</span>
              )}
            </h3>
          </div>
        </div>

        {/* Stats strip */}
        <div
          className="grid grid-cols-3"
          style={{ borderTop: "1.5px solid #1A1916", background: "#F8F7F2" }}
        >
          {[
            { label: "Grup",     value: team.stage },
            { label: "FIFA Sıra", value: `#${team.worldRanking}` },
            { label: "Katılım",  value: String(team.appearances) },
          ].map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-3"
              style={{ borderRight: i < 2 ? "1px solid #EAE7DA" : "none" }}
            >
              <div className="swiss-label" style={{ marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, color: "#1A1916", letterSpacing: "0.02em" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-up" style={{ color: "#1A1916" }}>

      {/* ══ PAGE HEADER ══ */}
      <div
        className="relative overflow-hidden p-6 md:p-10"
        style={{ background: "#1A1916", border: "1.5px solid #1A1916", boxShadow: "6px 6px 0 #00FF87" }}
      >
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "#00FF87", boxShadow: "0 0 12px #00FF87" }} />

        <div className="relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="neon-badge neon-badge-green">48 TAKIM</span>
              <span className="neon-badge neon-badge-cyan">7 KONFEDERASYON</span>
            </div>
            <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#F8F7F2", lineHeight: 1.1 }}>
              MİLLİ
              <br />
              <span style={{ color: "#00FF87", textShadow: "0 0 20px rgba(0,255,135,0.3)" }}>TAKIMLAR</span>
            </h1>
            <p style={{ color: "#8C8A84", fontSize: "0.72rem", fontWeight: 500, lineHeight: 1.7, maxWidth: "44ch" }}>
              2026 Dünya Kupası kurasında yer alan 48 milli takımın kurumsal renkler,
              torba bilgileri ve FIFA sıralamaları.
            </p>
          </div>

          {/* Confederation filter (inside header on desktop) */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {confederations.map(conf => {
              const active = filterConfederation === conf;
              const color = conf === "ALL" ? "#00FF87" : CONF_COLORS[conf] ?? "#8C8A84";
              return (
                <button
                  key={conf}
                  onClick={() => setFilterConfederation(conf)}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.52rem",
                    fontWeight: 900,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    border: `1.5px solid ${active ? color : "rgba(255,255,255,0.15)"}`,
                    background: active ? color : "transparent",
                    color: active ? "#1A1916" : "#8C8A84",
                    cursor: "pointer",
                    boxShadow: active ? `2px 2px 0 rgba(0,0,0,0.3)` : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {conf === "ALL" ? "TÜMÜ" : conf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ HOST TEAMS ══ */}
      {hostTeams.length > 0 && (
        <div className="space-y-4">
          <div className="swiss-divider">
            <span>🏟️ Ev Sahibi Ülkeler — Host Countries</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {hostTeams.map(renderTeamCard)}
          </div>
        </div>
      )}

      {/* ══ QUALIFIED TEAMS ══ */}
      {qualifiedTeams.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="swiss-divider flex-1">
              <span>⚽ Katılan Milli Takımlar ({qualifiedTeams.length})</span>
            </div>
            <a
              href="#/groups"
              onClick={e => { e.preventDefault(); window.location.hash = "#/groups"; }}
              style={{
                marginLeft: 16,
                fontSize: "0.6rem",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#00C060",
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Grupları Gör →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {qualifiedTeams.map(renderTeamCard)}
          </div>
        </div>
      )}

      {/* ══ EMPTY STATE ══ */}
      {filteredTeams.length === 0 && (
        <div className="py-20 text-center space-y-3" style={{ border: "1.5px solid #E0DDD0", background: "#F2F0E8" }}>
          <div style={{ fontSize: "2rem" }}>🌍</div>
          <p style={{ fontWeight: 900, fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5C5A54" }}>
            Seçilen Konfederasyonda Takım Bulunamadı
          </p>
          <p style={{ fontSize: "0.65rem", color: "#8C8A84" }}>Lütfen filtreyi değiştirin.</p>
        </div>
      )}
    </div>
  );
}
