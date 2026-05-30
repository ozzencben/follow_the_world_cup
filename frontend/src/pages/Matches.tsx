import { useEffect, useState } from "react";
import api from "../services/api";

interface Match {
  id: number;
  venueName: string;
  date: string;
  homeSquadId: number;
  awaySquadId: number;
  homeSquadName: string;
  awaySquadName: string;
  winner: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  status: string;
  bracketId: number;
}

interface Round {
  id: number;
  stage: string;
  status: string;
  startDate: string;
  endDate: string;
  tournaments: Match[];
}

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
  teamEnrichmentData: TeamEnrichmentData;
}

interface FifaDataResponse {
  entryId: string;
  seasonId: string;
  tournamentState: string;
  teams: Team[];
  teamsTotal: number;
}

interface MatchesProps {
  onSelectTeam: (teamName: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  GROUP: "Grup Turu",
  R32:   "Son 32",
  R16:   "Son 16",
  QF:    "Çeyrek Final",
  SF:    "Yarı Final",
  F:     "Final",
};

const STAGE_ACCENTS: Record<string, string> = {
  GROUP: "#00FF87",
  R32:   "#00E5FF",
  R16:   "#FFE600",
  QF:    "#FF6B00",
  SF:    "#FF2D78",
  F:     "#A78BFA",
};

export default function Matches({ onSelectTeam }: MatchesProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teamsMap, setTeamsMap] = useState<{ [name: string]: Team }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRoundTab, setActiveRoundTab] = useState<number>(1);

  useEffect(() => {
    Promise.all([
      api.get<Round[]>("/rounds"),
      api.get<FifaDataResponse>("/teams"),
    ])
      .then(([roundsRes, teamsRes]) => {
        setRounds(roundsRes.data);
        const map: { [name: string]: Team } = {};
        teamsRes.data.teams.forEach(t => {
          const key = t.teamName === "Bosnia-Herzegovina" ? "Bosnia and Herzegovina" : t.teamName;
          map[key] = t;
        });
        setTeamsMap(map);
        setError(null);
      })
      .catch(err => setError(err.message || "Fikstür verileri yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-fade-up"
        style={{ border: "1.5px solid #1A1916", background: "#F2F0E8" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #FFE600", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p className="swiss-label animate-retro-blink" style={{ color: "#5C5A54" }}>Fikstür Yükleniyor...</p>
      </div>
    );
  }

  if (error || rounds.length === 0) {
    return (
      <div className="p-12 text-center animate-fade-up" style={{ border: "1.5px solid #E53E3E", background: "#FFF5F5" }}>
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h4 style={{ fontWeight: 900, fontSize: "1rem", color: "#E53E3E", marginTop: 12 }}>Veri Bağlantı Hatası</h4>
        <p style={{ fontSize: "0.7rem", color: "#E53E3E", marginTop: 6 }}>{error || "Fikstür verilerine ulaşılamadı."}</p>
      </div>
    );
  }

  const currentRound = rounds.find(r => r.id === activeRoundTab);
  const currentAccent = STAGE_ACCENTS[currentRound?.stage || "GROUP"] ?? "#00FF87";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const getMapped = (name: string) => name === "Bosnia-Herzegovina" ? "Bosnia and Herzegovina" : name;
  const getFlagUrl = (f?: string) => f ? f.replace("{format}", "sq").replace("{size}", "1") : "";

  return (
    <div className="space-y-8 animate-fade-up" style={{ color: "#1A1916" }}>

      {/* ══ PAGE HEADER ══ */}
      <div
        className="relative overflow-hidden p-6 md:p-10"
        style={{ background: "#1A1916", border: "1.5px solid #1A1916", boxShadow: "6px 6px 0 #FFE600" }}
      >
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "#FFE600", boxShadow: "0 0 12px #FFE600" }} />

        <div className="relative space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="neon-badge neon-badge-yellow">104 MAÇ</span>
            <span className="neon-badge neon-badge-green">7 TUR</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#F8F7F2", lineHeight: 1.1 }}>
            MAÇ
            <br />
            <span style={{ color: "#FFE600", textShadow: "0 0 20px rgba(255,230,0,0.35)" }}>FİKSTÜRÜ</span>
          </h1>
          <p style={{ color: "#8C8A84", fontSize: "0.72rem", fontWeight: 500, lineHeight: 1.7, maxWidth: "44ch" }}>
            Dünya Kupası 2026'daki tüm grup turlarını, eleme aşamalarını ve
            stadyum detaylarını inceleyin.
          </p>
        </div>
      </div>

      {/* ══ ROUND TABS ══ */}
      <div className="flex flex-wrap gap-2">
        {rounds.map(round => {
          const isActive = round.id === activeRoundTab;
          const label = round.stage === "GROUP"
            ? `Grup ${round.id}`
            : (STAGE_LABELS[round.stage] ?? round.stage);
          const acc = STAGE_ACCENTS[round.stage] ?? "#00FF87";

          return (
            <button
              key={round.id}
              onClick={() => setActiveRoundTab(round.id)}
              style={{
                padding: "7px 16px",
                fontSize: "0.55rem",
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                border: `1.5px solid ${isActive ? acc : "#E0DDD0"}`,
                background: isActive ? "#1A1916" : "#F8F7F2",
                color: isActive ? acc : "#5C5A54",
                cursor: "pointer",
                boxShadow: isActive ? `3px 3px 0 ${acc}60` : "none",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ══ ROUND BANNER ══ */}
      {currentRound && (
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4"
          style={{ background: "#F2F0E8", border: "1.5px solid #1A1916", borderLeft: `4px solid ${currentAccent}` }}
        >
          <div>
            <div className="neon-badge" style={{ color: currentAccent, borderColor: `${currentAccent}60`, background: `${currentAccent}10`, display: "inline-flex", marginBottom: 8 }}>
              {currentRound.stage === "GROUP" ? `Grup Aşaması — Tur ${currentRound.id}` : "Eleme Aşamaları"}
            </div>
            <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "#1A1916", letterSpacing: "-0.01em" }}>
              {currentRound.stage === "GROUP"
                ? `${formatDate(currentRound.startDate)} — ${formatDate(currentRound.endDate)}`
                : "Eleme Aşamaları"}
            </div>
          </div>
          <div className="swiss-label">
            Toplam: <span style={{ color: currentAccent, fontWeight: 900 }}>{currentRound.tournaments?.length || 0}</span> Karşılaşma
          </div>
        </div>
      )}

      {/* ══ MATCH CARDS ══ */}
      {currentRound && currentRound.tournaments && currentRound.tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {currentRound.tournaments.map(match => {
            const homeMapped = getMapped(match.homeSquadName);
            const awayMapped = getMapped(match.awaySquadName);
            const homeInfo = teamsMap[homeMapped];
            const awayInfo = teamsMap[awayMapped];
            const hasScore = match.homeScore !== null && match.awayScore !== null;
            const homeColor = homeInfo?.teamEnrichmentData?.primaryColor || "#1A1916";

            return (
              <div
                key={match.id}
                style={{
                  border: "1.5px solid #1A1916",
                  borderLeft: `4px solid ${homeColor}`,
                  background: "#F8F7F2",
                  boxShadow: "3px 3px 0 #1A191620",
                  transition: "transform 0.12s, box-shadow 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = `4px 4px 0 ${currentAccent}50`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "3px 3px 0 #1A191620"; }}
              >
                {/* Venue & Time */}
                <div
                  className="flex items-center justify-between px-4 py-2"
                  style={{ borderBottom: "1px solid #EAE7DA", background: "#F2F0E8" }}
                >
                  <span style={{ fontSize: "0.55rem", fontWeight: 700, color: "#8C8A84", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                    📍 {match.venueName}
                  </span>
                  <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#1A1916", letterSpacing: "0.1em", flexShrink: 0 }}>
                    {formatTime(match.date)}
                  </span>
                </div>

                {/* Score row */}
                <div className="flex items-center px-4 py-5">
                  {/* Home */}
                  <div
                    className="flex items-center gap-2.5 cursor-pointer"
                    style={{ flex: 1 }}
                    onClick={() => onSelectTeam(match.homeSquadName)}
                  >
                    {homeInfo?.teamFlag && (
                      <img src={getFlagUrl(homeInfo.teamFlag)} alt={match.homeSquadName}
                        style={{ width: 24, height: 15, objectFit: "cover", border: "1px solid #E0DDD0", flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#1A1916", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#00C060")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#1A1916")}
                    >
                      {match.homeSquadName}
                    </span>
                  </div>

                  {/* Score / VS */}
                  <div className="flex flex-col items-center justify-center shrink-0 mx-4">
                    {hasScore ? (
                      <div style={{
                        padding: "4px 14px",
                        background: "#1A1916",
                        color: "#00FF87",
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        letterSpacing: "0.1em",
                        fontVariantNumeric: "tabular-nums",
                        textShadow: "0 0 8px rgba(0,255,135,0.4)",
                      }}>
                        {match.homeScore} — {match.awayScore}
                      </div>
                    ) : (
                      <div style={{
                        padding: "4px 12px",
                        border: `1.5px solid ${currentAccent}`,
                        color: currentAccent,
                        fontWeight: 900,
                        fontSize: "0.65rem",
                        letterSpacing: "0.18em",
                        textShadow: `0 0 6px ${currentAccent}`,
                      }}>
                        VS
                      </div>
                    )}
                  </div>

                  {/* Away */}
                  <div
                    className="flex items-center justify-end gap-2.5 cursor-pointer"
                    style={{ flex: 1 }}
                    onClick={() => onSelectTeam(match.awaySquadName)}
                  >
                    <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#1A1916", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#00C060")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#1A1916")}
                    >
                      {match.awaySquadName}
                    </span>
                    {awayInfo?.teamFlag && (
                      <img src={getFlagUrl(awayInfo.teamFlag)} alt={match.awaySquadName}
                        style={{ width: 24, height: 15, objectFit: "cover", border: "1px solid #E0DDD0", flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>
                </div>

                {/* Date footer */}
                <div
                  className="px-4 py-2 text-center"
                  style={{ borderTop: "1px solid #EAE7DA", background: "#F2F0E8" }}
                >
                  <span className="swiss-label">{formatDate(match.date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center space-y-3" style={{ border: "1.5px solid #E0DDD0", background: "#F2F0E8" }}>
          <div style={{ fontSize: "2.5rem" }}>⏳</div>
          <h4 style={{ fontWeight: 900, fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#1A1916" }}>
            Karşılaşmalar Belirlenmedi
          </h4>
          <p style={{ fontSize: "0.65rem", color: "#8C8A84", maxWidth: "36ch", margin: "0 auto", lineHeight: 1.7 }}>
            Bu eleme turunun eşleşmeleri, grup aşaması sonuçlarına göre otomatik belirlenecektir.
          </p>
        </div>
      )}
    </div>
  );
}
